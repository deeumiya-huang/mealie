import { useEffect, useRef, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AppButtonCopy } from "@/components/global/AppButtonCopy";
import { AppLogo } from "@/components/global/AppLogo";
import { MdiIcon } from "@/components/global/MdiIcon";
import useDefaultActivity from "@/hooks/use-default-activity";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { usePasswordField } from "@/hooks/use-passwords";
import { alert } from "@/hooks/use-toast";
import { useUserActivityPreferences } from "@/hooks/use-users/preferences";
import { usePageTitle, useSessionStorage } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { AppStartupInfo } from "@/lib/api/types/admin";
import { http } from "@/lib/http";
import { icons } from "@/lib/icons";
import { isSafeRedirectTarget } from "@/lib/validators/redirect";
import { useAppInfo } from "@/providers/app-info";
import { useColorMode } from "@/providers/color-mode";

function isCallback() {
  const params = new URLSearchParams(window.location.search);
  return params.has("code") || params.has("error");
}

function isDirectLogin() {
  const params = new URLSearchParams(window.location.search);
  return params.has("direct") && params.get("direct") === "1";
}

function errorStatus(error: unknown) {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

const maxButtonSx = { width: "300px", maxWidth: "100%" };

export default function LoginPage() {
  const { isDark } = useColorMode();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const i18n = useI18n();
  const auth = useMealieAuth();
  const appInfo = useAppInfo();
  const { loggedIn } = useLoggedInState();
  const groupSlug = auth.user?.groupSlug;
  const [isDemo, setIsDemo] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [activityPreferences] = useUserActivityPreferences();
  const { getDefaultActivityRoute } = useDefaultActivity();

  // Survives the page reload that happens during OIDC redirect
  const [pendingShareRedirect, setPendingShareRedirect] = useSessionStorage<string | null>("pwa_share_redirect", null);

  usePageTitle(i18n.t("user.login"));

  const [form, setForm] = useState({
    email: "",
    password: "",
    // Defaults on: this is a self-hosted app people mostly reach from their own devices, and an
    // unticked box now ends the session when the browser closes.
    // Ideally this is off by default, but we've trained users for years to ignore this checkbox,
    // so turning it off would cause a headache for the majority of users.
    // Maybe we can revisit this in the future.
    remember: true,
  });

  useEffect(() => {
    let active = true;
    void http.get<AppStartupInfo>("/api/app/about/startup-info").then((data) => {
      if (!active) {
        return;
      }
      setIsDemo(data.data.isDemo);
      setIsFirstLogin(data.data.isFirstLogin);

      if (data.data.isFirstLogin) {
        setForm(current => ({ ...current, email: "changeme@example.com", password: "MyPassword" }));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // whenever(loggedIn && groupSlug): leave the login page once, each time a session appears
  const redirected = useRef(false);
  const redirectFromQuery = searchParams.get("redirect") ?? undefined;
  useEffect(() => {
    if (!(loggedIn && groupSlug)) {
      redirected.current = false;
      return;
    }
    if (redirected.current) {
      return;
    }
    redirected.current = true;

    // First-login setup always takes priority
    if (!isDemo && isFirstLogin && auth.user?.admin) {
      void navigate("/admin/setup");
      return;
    }

    // After login, honour a pending PWA share redirect.
    // The redirect param can arrive via the URL query string (password login)
    // or via sessionStorage (OIDC login, where the OIDC provider reload clears
    // the query string).
    const redirectTarget = redirectFromQuery ?? pendingShareRedirect;
    if (isSafeRedirectTarget(redirectTarget)) {
      setPendingShareRedirect(null);
      void navigate(redirectTarget);
      return;
    }

    const defaultActivityRoute = getDefaultActivityRoute(
      activityPreferences.defaultActivity,
      groupSlug,
    );
    if (defaultActivityRoute) {
      void navigate(defaultActivityRoute);
    }
    else {
      void navigate(`/g/${groupSlug || ""}`);
    }
  }, [
    loggedIn,
    groupSlug,
    isDemo,
    isFirstLogin,
    auth.user?.admin,
    redirectFromQuery,
    pendingShareRedirect,
    setPendingShareRedirect,
    activityPreferences.defaultActivity,
    getDefaultActivityRoute,
    navigate,
  ]);

  const [loggingIn, setLoggingIn] = useState(false);
  // An OIDC callback starts signing in right away (Vue: onBeforeMount)
  const [oidcLoggingIn, setOidcLoggingIn] = useState(isCallback);

  const { passwordIcon, inputType, togglePasswordShow } = usePasswordField();

  function alertOnError(error: unknown) {
    if (errorStatus(error) === 401) {
      alert.error(i18n.t("user.invalid-credentials"));
    }
    else if (errorStatus(error) === 423) {
      alert.error(i18n.t("user.account-locked-please-try-again-later"));
    }
    else {
      alert.error(i18n.t("events.something-went-wrong"));
    }
  }

  function startOidcRedirect() {
    // Save any pending PWA share redirect before leaving for the OIDC provider.
    // The OIDC callback reloads the page, which clears the query string, so we
    // persist the target in sessionStorage and restore it after login.
    const redirectTarget = new URLSearchParams(window.location.search).get("redirect") ?? undefined;
    if (isSafeRedirectTarget(redirectTarget)) {
      setPendingShareRedirect(redirectTarget);
    }
    window.location.assign("/api/auth/oauth"); // start the redirect process
  }

  // OIDC: finish a callback, or go straight to the provider when the server says so
  const oidcStarted = useRef(false);
  useEffect(() => {
    if (oidcStarted.current) {
      return;
    }
    oidcStarted.current = true;

    if (isCallback()) {
      auth.oauthSignIn()
        .catch(async (error: unknown) => {
          await navigate("/login?direct=1", { replace: true });
          alertOnError(error);
        })
        .finally(() => setOidcLoggingIn(false));
    }
    else if (appInfo.enableOidc && appInfo.oidcRedirect && !isDirectLogin()) {
      startOidcRedirect();
    }
  });

  async function authenticate(event: FormEvent) {
    event.preventDefault();
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
    {
      text: i18n.t("about.sponsor"),
      icon: icons.heart,
      href: "https://github.com/sponsors/hay-kot",
    },
    {
      text: i18n.t("about.github"),
      icon: icons.github,
      href: "https://github.com/mealie-recipes/mealie",
    },
    {
      text: i18n.t("about.docs"),
      icon: icons.folderOutline,
      href: "https://docs.mealie.io/",
    },
  ];

  // Fix password manager autofill detection: the inputs are always visible (Vue overrode Vuetify's opacity)
  return (
    <Container
      maxWidth={false}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        minHeight: "100vh",
        py: 2,
        bgcolor: isDark ? undefined : "#f5f8fa",
      }}
    >
      {isFirstLogin && (
        <Alert
          severity="info"
          variant="filled"
          icon={<MdiIcon path={icons.information} />}
          sx={{ my: 2, flex: "none" }}
        >
          <div>
            <Box component="p" sx={{ mt: 0, mb: 1.5 }}>
              {i18n.t("user.it-looks-like-this-is-your-first-time-logging-in")}
            </Box>
            <Box component="p" sx={{ my: 0, mb: 0.5 }}>
              <strong>
                {i18n.t("user.username")}
                :
                {" "}
              </strong>
              changeme@example.com
              <AppButtonCopy copyText="changeme@example.com" color="info" btnClass="h-auto" />
            </Box>
            <Box component="p" sx={{ my: 0, mb: 1.5 }}>
              <strong>
                {i18n.t("user.password")}
                :
                {" "}
              </strong>
              MyPassword
              <AppButtonCopy copyText="MyPassword" color="info" btnClass="h-auto" />
            </Box>
            <Box component="p" sx={{ my: 0 }}>
              {i18n.t("user.dont-want-to-see-this-anymore-be-sure-to-change-your-email")}
            </Box>
          </div>
        </Alert>
      )}
      <Card component="section" sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 600 }}>
        <Toolbar sx={{ bgcolor: "primary.main", color: "primary.contrastText", width: "100%", justifyContent: "center", mb: 2 }}>
          <Typography variant="h4" component="div" sx={{ textAlign: "center" }}>
            Mealie
          </Typography>
        </Toolbar>
        <AppLogo size={100} />
        <Typography variant="h5" component="h1" sx={{ pt: 2, pb: 1.5, textAlign: "center" }}>
          {i18n.t("user.sign-in")}
        </Typography>
        <CardContent sx={{ width: "100%" }}>
          <form onSubmit={event => void authenticate(event)}>
            {appInfo.allowPasswordLogin && (
              <>
                <TextField
                  id="username"
                  fullWidth
                  variant="filled"
                  autoFocus
                  autoComplete="username"
                  name="username"
                  label={i18n.t("user.email-or-username")}
                  type="text"
                  value={form.email}
                  onChange={event => setForm({ ...form, email: event.target.value })}
                  sx={{ mb: 2.5 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MdiIcon path={icons.email} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  id="password"
                  fullWidth
                  variant="filled"
                  autoComplete="current-password"
                  name="password"
                  label={i18n.t("user.password")}
                  type={inputType}
                  value={form.password}
                  onChange={event => setForm({ ...form, password: event.target.value })}
                  sx={{ mb: 1 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MdiIcon path={icons.lock} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton tabIndex={-1} aria-hidden edge="end" onClick={togglePasswordShow}>
                            <MdiIcon path={passwordIcon} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <FormControlLabel
                  sx={{ ml: 0.5 }}
                  control={(
                    <Checkbox
                      checked={form.remember}
                      onChange={event => setForm({ ...form, remember: event.target.checked })}
                    />
                  )}
                  label={i18n.t("user.remember-me")}
                />
                <CardActions sx={{ justifyContent: "center", pt: 0 }}>
                  <Box sx={maxButtonSx}>
                    <Button
                      loading={loggingIn}
                      disabled={oidcLoggingIn}
                      variant="contained"
                      color="primary"
                      type="submit"
                      size="large"
                      fullWidth
                      sx={{ borderRadius: "24px" }}
                    >
                      {i18n.t("user.login")}
                    </Button>
                  </Box>
                </CardActions>
              </>
            )}

            {appInfo.enableOidc && appInfo.allowPasswordLogin && (
              <Box sx={{ display: "flex", my: 2, justifyContent: "center", alignItems: "center", position: "relative" }}>
                <Divider sx={{ width: "100%", maxWidth: "75%" }} />
                <Box
                  component="span"
                  sx={{ position: "absolute", px: 1, bgcolor: isDark ? "grey.900" : "#fff" }}
                >
                  {i18n.t("user.or")}
                </Box>
              </Box>
            )}
            {appInfo.enableOidc && (
              <CardActions sx={{ justifyContent: "center" }}>
                <Box sx={maxButtonSx}>
                  <Button
                    loading={oidcLoggingIn}
                    color="primary"
                    size="large"
                    variant="contained"
                    fullWidth
                    sx={{ borderRadius: "24px" }}
                    onClick={startOidcRedirect}
                  >
                    {i18n.t("user.login-oidc")}
                    {" "}
                    {appInfo.oidcProviderName}
                  </Button>
                </Box>
              </CardActions>
            )}
          </form>
        </CardContent>
        <CardActions sx={{ display: "flex", justifyContent: "center", flexDirection: { xs: "column", sm: "row" } }}>
          {appInfo.allowSignup && appInfo.allowPasswordLogin
            ? (
                <Button variant="text" component={Link} to="/register">
                  {i18n.t("user.register")}
                </Button>
              )
            : (
                <Button variant="text" disabled>
                  {i18n.t("user.invite-only")}
                </Button>
              )}
          {appInfo.allowPasswordLogin && (
            <Button variant="text" component={Link} to="/forgot-password" sx={{ mr: "auto" }}>
              {i18n.t("user.reset-password")}
            </Button>
          )}
        </CardActions>

        <CardContent sx={{ display: "flex", justifyContent: "center", flexDirection: { xs: "column", sm: "row" } }}>
          {links.map(link => (
            <Box key={link.text} sx={{ textAlign: "center" }}>
              <Button variant="text" href={link.href} target="_blank" startIcon={<MdiIcon path={link.icon} />}>
                {link.text}
              </Button>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}
