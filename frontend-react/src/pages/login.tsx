import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router";
import { icons } from "~/lib/icons";
import { useAppInfo } from "~/lib/app-info";
import { isSafeRedirectTarget } from "~/lib/validators/redirect";
import type { AppStartupInfo } from "~/lib/api/types/admin";
import { apiHttp } from "~/app/services";
import useDefaultActivity from "~/hooks/use-default-activity";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { usePasswordField } from "~/hooks/use-passwords";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { alert } from "~/hooks/use-toast";
import { useUserActivityPreferences } from "~/hooks/use-users/preferences";
import { useDark } from "~/theme/color-scheme";
import { AppButtonCopy } from "~/components/global/AppButtonCopy";
import { AppLogo } from "~/components/global/AppLogo";
import { Icon } from "~/components/global/Icon";
import { CheckboxInput, TextInput, VForm } from "~/components/global/form";

// Survives the page reload that happens during OIDC redirect
const PENDING_SHARE_REDIRECT = "pwa_share_redirect";
const pendingShareRedirect = {
  get: (): string | null => {
    try {
      return sessionStorage.getItem(PENDING_SHARE_REDIRECT);
    }
    catch {
      return null;
    }
  },
  set: (value: string | null) => {
    try {
      if (value === null) sessionStorage.removeItem(PENDING_SHARE_REDIRECT);
      else sessionStorage.setItem(PENDING_SHARE_REDIRECT, value);
    }
    catch {
      // storage unavailable
    }
  },
};

function isCallback() {
  const params = new URLSearchParams(window.location.search);
  return params.has("code") || params.has("error");
}

function isDirectLogin() {
  const params = new URLSearchParams(window.location.search);
  return params.has("direct") && params.get("direct") === "1";
}

export default function LoginPage() {
  const i18n = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useMealieAuth();
  const appInfo = useAppInfo();
  const [isDark] = useDark();
  const { loggedIn } = useLoggedInState();
  const groupSlug = auth.user?.groupSlug;
  const [isDemo, setIsDemo] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [activityPreferences] = useUserActivityPreferences();
  const { getDefaultActivityRoute } = useDefaultActivity();
  const { passwordIcon, inputType, togglePasswordShow } = usePasswordField();
  const [loggingIn, setLoggingIn] = useState(false);
  const [oidcLoggingIn, setOidcLoggingIn] = useState(false);

  useSeoMeta({ title: i18n.t("user.login") });

  const [form, setForm] = useState({
    email: "",
    password: "",
    // Defaults on: this is a self-hosted app people mostly reach from their own devices, and an
    // unticked box now ends the session when the browser closes.
    remember: true,
  });

  useEffect(() => {
    void apiHttp().get<AppStartupInfo>("/api/app/about/startup-info").then(({ data }) => {
      setIsDemo(data.isDemo);
      setIsFirstLogin(data.isFirstLogin);
      if (data.isFirstLogin) {
        setForm(f => ({ ...f, email: "changeme@example.com", password: "MyPassword" }));
      }
    });
  }, []);

  useEffect(() => {
    if (!(loggedIn && groupSlug)) return;
    // First-login setup always takes priority
    if (!isDemo && isFirstLogin && auth.user?.admin) {
      void navigate("/admin/setup");
      return;
    }

    // After login, honour a pending PWA share redirect. It arrives via the query string (password
    // login) or via sessionStorage (OIDC login, where the provider reload clears the query string).
    const redirectTarget = searchParams.get("redirect") ?? pendingShareRedirect.get();
    if (isSafeRedirectTarget(redirectTarget)) {
      pendingShareRedirect.set(null);
      void navigate(redirectTarget);
      return;
    }

    const defaultActivityRoute = getDefaultActivityRoute(activityPreferences.defaultActivity, groupSlug);
    void navigate(defaultActivityRoute || `/g/${groupSlug || ""}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `whenever(loggedIn && groupSlug)`
  }, [loggedIn, groupSlug, isDemo, isFirstLogin]);

  function alertOnError(error: unknown) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    if (status === 401) alert.error(i18n.t("user.invalid-credentials"));
    else if (status === 423) alert.error(i18n.t("user.account-locked-please-try-again-later"));
    else alert.error(i18n.t("events.something-went-wrong"));
  }

  async function oidcAuthenticate(callback = false) {
    if (callback) {
      setOidcLoggingIn(true);
      try {
        await auth.oauthSignIn();
      }
      catch (error) {
        await navigate("/login?direct=1", { replace: true });
        alertOnError(error);
      }
      setOidcLoggingIn(false);
    }
    else {
      // Save any pending PWA share redirect before leaving for the OIDC provider: the callback
      // reloads the page, which clears the query string.
      const redirectTarget = searchParams.get("redirect");
      if (isSafeRedirectTarget(redirectTarget)) {
        pendingShareRedirect.set(redirectTarget);
      }
      window.location.href = "/api/auth/oauth"; // start the redirect process
    }
  }

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (isCallback()) {
      void oidcAuthenticate(true);
    }
    else if (appInfo.enableOidc && appInfo.oidcRedirect && !isDirectLogin()) {
      void oidcAuthenticate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount
  }, []);

  async function authenticate() {
    if (form.email.length === 0 || form.password.length === 0) {
      alert.error(i18n.t("user.please-enter-your-email-and-password"));
      return;
    }

    setLoggingIn(true);
    const formData = new FormData();
    formData.append("username", form.email);
    formData.append("password", form.password);
    formData.append("remember_me", String(form.remember));

    try {
      await auth.signIn(formData);
    }
    catch (error) {
      console.log(error);
      alertOnError(error);
    }
    setLoggingIn(false);
  }

  const links = [
    { text: i18n.t("about.sponsor"), icon: icons.heart, href: "https://github.com/sponsors/hay-kot" },
    { text: i18n.t("about.github"), icon: icons.github, href: "https://github.com/mealie-recipes/mealie" },
    { text: i18n.t("about.docs"), icon: icons.folderOutline, href: "https://docs.mealie.io/" },
  ];

  return (
    <Box
      className="fill-height"
      sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", p: 2, ...(!isDark ? { bgcolor: "#f5f8fa" } : {}) }}
    >
      {isFirstLogin && (
        <Alert severity="info" icon={<Icon path={icons.information} />} sx={{ my: 2, flex: "none" }}>
          <div>
            <p style={{ marginBottom: 12 }}>{i18n.t("user.it-looks-like-this-is-your-first-time-logging-in")}</p>
            <p style={{ marginBottom: 4 }}>
              <strong>{i18n.t("user.username")}: </strong>changeme@example.com
              <AppButtonCopy copyText="changeme@example.com" color="info" />
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>{i18n.t("user.password")}: </strong>MyPassword
              <AppButtonCopy copyText="MyPassword" color="info" />
            </p>
            <p>{i18n.t("user.dont-want-to-see-this-anymore-be-sure-to-change-your-email")}</p>
          </div>
        </Alert>
      )}
      <Card component="section" sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 600 }}>
        <Toolbar sx={{ bgcolor: "primary.main", color: "#fff", width: "100%", justifyContent: "center", mb: 2 }}>
          <Typography variant="h4" sx={{ textAlign: "center" }}>Mealie</Typography>
        </Toolbar>
        <AppLogo size={100} />
        <Typography variant="h5" sx={{ textAlign: "center", pb: 1.5, pt: 2 }}>{i18n.t("user.sign-in")}</Typography>
        <CardContent sx={{ width: "100%" }}>
          <VForm onSubmit={() => void authenticate()}>
            {appInfo.allowPasswordLogin && (
              <>
                <TextInput
                  id="username"
                  value={form.email}
                  onChange={email => setForm({ ...form, email })}
                  prependInnerIcon={icons.email}
                  variant="solo-filled"
                  autoFocus
                  autoComplete="username"
                  name="username"
                  label={i18n.t("user.email-or-username")}
                  type="text"
                />
                <TextInput
                  id="password"
                  value={form.password}
                  onChange={password => setForm({ ...form, password })}
                  prependInnerIcon={icons.lock}
                  appendInnerIcon={passwordIcon}
                  onAppendInnerClick={togglePasswordShow}
                  variant="solo-filled"
                  autoComplete="current-password"
                  name="password"
                  label={i18n.t("user.password")}
                  type={inputType}
                />
                <CheckboxInput
                  checked={form.remember}
                  onChange={remember => setForm({ ...form, remember })}
                  label={i18n.t("user.remember-me")}
                  sx={{ ml: 1, mt: -1 }}
                />
                <CardActions sx={{ justifyContent: "center", pt: 0 }}>
                  <Box sx={{ width: 300 }}>
                    <Button
                      disabled={oidcLoggingIn || loggingIn}
                      variant="contained"
                      color="primary"
                      type="submit"
                      size="large"
                      fullWidth
                      sx={{ borderRadius: 6 }}
                      startIcon={loggingIn ? <CircularProgress size={18} color="inherit" /> : undefined}
                    >
                      {i18n.t("user.login")}
                    </Button>
                  </Box>
                </CardActions>
              </>
            )}

            {appInfo.enableOidc && appInfo.allowPasswordLogin && (
              <Box sx={{ display: "flex", my: 2, justifyContent: "center", alignItems: "center", position: "relative" }}>
                <Divider sx={{ width: "75%" }} />
                <Box component="span" sx={{ position: "absolute", px: 1, bgcolor: "background.paper" }}>{i18n.t("user.or")}</Box>
              </Box>
            )}
            {appInfo.enableOidc && (
              <CardActions sx={{ justifyContent: "center" }}>
                <Box sx={{ width: 300 }}>
                  <Button
                    disabled={oidcLoggingIn}
                    color="primary"
                    size="large"
                    variant="contained"
                    fullWidth
                    sx={{ borderRadius: 6 }}
                    onClick={() => void oidcAuthenticate()}
                    startIcon={oidcLoggingIn ? <CircularProgress size={18} color="inherit" /> : undefined}
                  >
                    {i18n.t("user.login-oidc")} {appInfo.oidcProviderName}
                  </Button>
                </Box>
              </CardActions>
            )}
          </VForm>
        </CardContent>
        <CardActions sx={{ display: "flex", justifyContent: "center", flexDirection: { xs: "column", sm: "row" } }}>
          {appInfo.allowSignup && appInfo.allowPasswordLogin
            ? <Button variant="text" component={RouterLink} to="/register">{i18n.t("user.register")}</Button>
            : <Button variant="text" disabled>{i18n.t("user.invite-only")}</Button>}
          {appInfo.allowPasswordLogin && (
            <Button sx={{ mr: "auto" }} variant="text" component={RouterLink} to="/forgot-password">{i18n.t("user.reset-password")}</Button>
          )}
        </CardActions>
        <CardContent sx={{ display: "flex", justifyContent: "center", flexDirection: { xs: "column", sm: "row" } }}>
          {links.map(link => (
            <Box key={link.text} sx={{ textAlign: "center" }}>
              <Button variant="text" href={link.href} target="_blank" startIcon={<Icon path={link.icon} />}>{link.text}</Button>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
