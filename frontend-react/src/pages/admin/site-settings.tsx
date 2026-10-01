import { Fragment, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { AppButtonCopy } from "~/components/global/AppButtonCopy";
import { AppLoader } from "~/components/global/AppLoader";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { Icon } from "~/components/global/Icon";
import { StatsCards } from "~/components/global/StatsCards";
import { TextInput } from "~/components/global/form";
import { useAdminApi, useUserApi } from "~/hooks/api";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { validators } from "~/hooks/use-validators";
import type { AppStatistics, CheckAppConfig } from "~/lib/api/types/admin";
import { icons } from "~/lib/icons";

interface SimpleCheck {
  id: string;
  text: string;
  status: boolean | undefined;
  successText: string;
  errorText: string;
  color: string;
  icon: string;
}

interface CheckApp extends CheckAppConfig {
  isSiteSecure?: boolean;
}

interface AppInfoRow {
  slot?: "version" | "build" | "recipe-scraper";
  name: string;
  icon: string;
  value: string | number | null | undefined;
}

// Auth providers (LDAP, OIDC) have three states rather than two: turned off
// entirely, enabled and fully configured, or enabled but missing configuration.
// When a provider is disabled its incomplete configuration isn't a problem, so
// it's reported neutrally instead of as a warning.
interface AuthProvider {
  id: string;
  // Shown as-is rather than translated, since these are acronyms
  name: string;
  // The environment variable that turns the provider on
  envVar: string;
  ready: boolean;
  disabled: boolean;
}

const goodIcon = icons.checkboxMarkedCircle;
const badIcon = icons.alert;
const warningIcon = icons.alertCircle;
const disabledIcon = icons.minusCircle;

const goodColor = "success";
const badColor = "error";
const warningColor = "warning";
const disabledColor = "grey";

function isLocalHostOrHttps() {
  return window.location.hostname === "localhost" || window.location.protocol === "https:";
}

export default function AdminSiteSettingsPage() {
  const i18n = useI18n();
  const { xs } = useDisplay();
  const api = useUserApi();
  const adminApi = useAdminApi();

  useSeoMeta({ title: i18n.t("settings.site-settings") });

  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tested, setTested] = useState(false);

  const [appConfig, setAppConfig] = useState<CheckApp>({
    emailReady: true,
    baseUrlSet: true,
    isSiteSecure: true,
    isUpToDate: false,
    ldapReady: false,
    ldapDisabled: false,
    oidcReady: false,
    oidcDisabled: false,
  });

  const [adminStats, setAdminStats] = useState<AppStatistics>({
    totalRecipes: 0,
    totalUsers: 0,
    totalHouseholds: 0,
    totalGroups: 0,
    uncategorizedRecipes: 0,
    untaggedRecipes: 0,
  });

  const adminStatsText: Record<string, string> = {
    totalRecipes: i18n.t("general.recipes"),
    totalUsers: i18n.t("user.users"),
    totalHouseholds: i18n.t("household.households"),
    totalGroups: i18n.t("group.groups"),
    uncategorizedRecipes: i18n.t("settings.uncategorized-recipes"),
    untaggedRecipes: i18n.t("settings.untagged-recipes"),
  };

  const adminStatsIcon: Record<string, string> = {
    totalRecipes: icons.primary,
    totalUsers: icons.user,
    totalHouseholds: icons.household,
    totalGroups: icons.group,
    uncategorizedRecipes: icons.categories,
    untaggedRecipes: icons.tags,
  };

  const adminStatsTo: Record<string, string> = {
    totalUsers: "/admin/manage/users",
    totalHouseholds: "/admin/manage/households",
    totalGroups: "/admin/manage/groups",
  };

  // ============================================================
  // General About Info

  const [rawAppInfo, setRawAppInfo] = useState({ version: "null", versionLatest: "null" });
  const [appInfo, setAppInfo] = useState<AppInfoRow[] | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await adminApi.about.checkApp();
      setAppConfig({ ...(data ?? {}), isSiteSecure: isLocalHostOrHttps() } as CheckApp);

      const { data: adminData } = await adminApi.about.statistics();
      if (adminData) {
        setAdminStats(adminData);
      }
    })();

    void adminApi.about.about().then(({ data }) => {
      if (!data) return;
      setRawAppInfo({ version: data.version, versionLatest: data.versionLatest });
      setAppInfo([
        { slot: "version", name: i18n.t("about.version"), icon: icons.information, value: data.version },
        { slot: "build", name: i18n.t("settings.build"), icon: icons.information, value: data.buildId },
        {
          name: i18n.t("about.application-mode"),
          icon: icons.devTo,
          value: data.production ? i18n.t("about.production") : i18n.t("about.development"),
        },
        {
          name: i18n.t("about.demo-status"),
          icon: icons.testTube,
          value: data.demoStatus ? i18n.t("about.demo") : i18n.t("about.not-demo"),
        },
        { name: i18n.t("about.api-port"), icon: icons.api, value: data.apiPort },
        {
          name: i18n.t("about.api-docs"),
          icon: icons.file,
          value: data.apiDocs ? i18n.t("general.enabled") : i18n.t("general.disabled"),
        },
        { name: i18n.t("about.database-type"), icon: icons.database, value: data.dbType },
        { name: i18n.t("about.database-url"), icon: icons.database, value: data.dbUrl },
        { name: i18n.t("about.default-group"), icon: icons.group, value: data.defaultGroup },
        { name: i18n.t("about.default-household"), icon: icons.household, value: data.defaultHousehold },
        { slot: "recipe-scraper", name: i18n.t("settings.recipe-scraper-version"), icon: icons.primary, value: data.recipeScraperVersion },
      ]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, [adminApi]);

  function authProviderCheck(provider: AuthProvider): SimpleCheck {
    const { name, ready, disabled } = provider;
    let text: string;
    if (disabled) {
      text = i18n.t("settings.auth-provider-disabled", { provider: name });
    }
    else {
      text = ready
        ? i18n.t("settings.auth-provider-ready", { provider: name })
        : i18n.t("settings.auth-provider-not-ready", { provider: name });
    }

    return {
      id: provider.id,
      text,
      status: provider.ready,
      errorText: provider.disabled
        ? i18n.t("settings.auth-provider-disabled-text", { envVar: provider.envVar })
        : i18n.t("settings.auth-provider-error-text", { provider: provider.name }),
      successText: i18n.t("settings.auth-provider-success-text", { provider: provider.name }),
      color: disabled ? disabledColor : ready ? goodColor : warningColor,
      icon: disabled ? disabledIcon : ready ? goodIcon : warningIcon,
    };
  }

  const simpleChecks: SimpleCheck[] = [
    {
      id: "application-version",
      text: i18n.t("settings.application-version"),
      status: appConfig.isUpToDate,
      errorText: i18n.t("settings.application-version-error-text", [rawAppInfo.version, rawAppInfo.versionLatest]),
      successText: i18n.t("settings.mealie-is-up-to-date"),
      color: appConfig.isUpToDate ? goodColor : warningColor,
      icon: appConfig.isUpToDate ? goodIcon : warningIcon,
    },
    {
      id: "secure-site",
      text: i18n.t("settings.secure-site"),
      status: appConfig.isSiteSecure,
      errorText: i18n.t("settings.secure-site-error-text"),
      successText: i18n.t("settings.secure-site-success-text"),
      color: appConfig.isSiteSecure ? goodColor : badColor,
      icon: appConfig.isSiteSecure ? goodIcon : badIcon,
    },
    {
      id: "server-side-base-url",
      text: i18n.t("settings.server-side-base-url"),
      status: appConfig.baseUrlSet,
      errorText: i18n.t("settings.server-side-base-url-error-text"),
      successText: i18n.t("settings.server-side-base-url-success-text"),
      color: appConfig.baseUrlSet ? goodColor : badColor,
      icon: appConfig.baseUrlSet ? goodIcon : badIcon,
    },
    authProviderCheck({
      id: "ldap-ready",
      name: "LDAP",
      envVar: "LDAP_AUTH_ENABLED",
      ready: appConfig.ldapReady,
      disabled: appConfig.ldapDisabled,
    }),
    authProviderCheck({
      id: "oidc-ready",
      name: "OIDC",
      envVar: "OIDC_AUTH_ENABLED",
      ready: appConfig.oidcReady,
      disabled: appConfig.oidcDisabled,
    }),
  ];

  async function testEmail() {
    setLoading(true);
    setTested(false);
    const { data } = await api.email.test({ email: address });

    if (data) {
      setSuccess(!!data.success);
    }

    setLoading(false);
    setTested(true);
  }

  // Explicit bool check because validators.email sometimes returns a string
  const validEmail = address !== "" && validators.email(address) === true;

  const [bugReportDialog, setBugReportDialog] = useState(false);
  const bugReportText = (() => {
    const ignore: Record<string, boolean> = {
      [i18n.t("about.database-url")]: true,
      [i18n.t("about.default-group")]: true,
    };

    let text = "**Details**\n";
    appInfo?.forEach((item) => {
      if (ignore[item.name]) {
        return;
      }
      text += `${item.name}: ${String(item.value)}\n`;
    });

    const ignoreChecks: Record<string, boolean> = {
      "application-version": true,
    };

    text += "\n**Checks**\n";
    simpleChecks.forEach((item) => {
      if (ignoreChecks[item.id]) {
        return;
      }
      const status = item.status ? i18n.t("general.yes") : i18n.t("general.no");
      text += `${item.text}: ${status}\n`;
    });

    text += `${i18n.t("settings.email-configured")}: ${appConfig.emailReady ? i18n.t("general.yes") : i18n.t("general.no")}\n`;

    return text;
  })();

  function appInfoValue(property: AppInfoRow) {
    const value = String(property.value);
    let href: string | null = null;
    if (property.slot === "recipe-scraper") {
      href = `https://github.com/hhursev/recipe-scrapers/releases/tag/${value}`;
    }
    else if (property.slot === "build") {
      href = `https://github.com/mealie-recipes/mealie/commit/${value}`;
    }
    else if (property.slot === "version" && value !== "develop" && value !== "nightly") {
      href = `https://github.com/mealie-recipes/mealie/releases/tag/${value}`;
    }
    return href ? <Link target="_blank" href={href}>{value}</Link> : property.value;
  }

  return (
    <BaseContainer fluid className="narrow-container">
      {/* Image */}
      <BasePageTitle
        divider
        header={<BasePageTitleImage src="/svgs/admin-site-settings.svg" maxWidth={150} maxHeight={200} />}
        title={i18n.t("settings.site-settings")}
      />

      {/* Bug Report */}
      <BaseDialog
        open={bugReportDialog}
        onOpenChange={setBugReportDialog}
        bottomSheet
        title={i18n.t("settings.bug-report")}
        width={800}
        icon={icons.github}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ pb: 2 }}>{i18n.t("settings.bug-report-information")}</Box>
          <TextInput value={bugReportText} variant="outlined" multiline rows={18} readOnly />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "5px", mt: 1 }}>
            <Button
              color="inherit"
              variant="outlined"
              target="_blank"
              href="https://github.com/mealie-recipes/mealie/issues/new/choose"
              startIcon={<Icon path={icons.github} />}
            >
              {i18n.t("settings.tracker")}
            </Button>
            <AppButtonCopy copyText={bugReportText} color="info" icon={false} />
          </Box>
        </Box>
      </BaseDialog>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <BaseButton color="info" icon={icons.github} onClick={() => setBugReportDialog(true)}>
          {i18n.t("settings.bug-report")}
        </BaseButton>
      </Box>

      {/* Configuration */}
      <section>
        <BaseCardSectionTitle icon={icons.cog} title={i18n.t("settings.configuration")} />
        <Card sx={{ mb: 2 }}>
          {simpleChecks.map(check => (
            <Fragment key={`list-item-${check.id}`}>
              <ListItem>
                <ListItemIcon>
                  <Icon path={check.icon} color={check.color} />
                </ListItemIcon>
                <ListItemText
                  primary={check.text}
                  secondary={check.status ? check.successText : check.errorText}
                  slotProps={{ secondary: { sx: { whiteSpace: "normal", wordWrap: "break-word" } } }}
                />
              </ListItem>
              <Divider />
            </Fragment>
          ))}
        </Card>
      </section>

      {/* Email */}
      <Box component="section" sx={{ pt: 1 }}>
        <BaseCardSectionTitle icon={icons.email} title={i18n.t("user.email")} />
        <Alert
          variant="outlined"
          icon={(
            <Icon
              path={appConfig.emailReady ? icons.checkboxMarkedCircle : icons.alertCircle}
              color={appConfig.emailReady ? "success" : "warning"}
            />
          )}
          sx={{
            "border": "none",
            "borderInlineStart": 4,
            "borderInlineStartStyle": "solid",
            "borderColor": appConfig.emailReady ? "success.main" : "error.main",
            "boxShadow": 2,
            "color": "text.primary",
            "& .MuiAlert-message": { width: "100%" },
          }}
        >
          <Box sx={{ fontWeight: 500 }}>{i18n.t("settings.email-configuration-status")}</Box>
          <div>{appConfig.emailReady ? i18n.t("settings.ready") : i18n.t("settings.not-ready")}</div>
          <Box sx={{ mt: 1 }}>
            <TextInput value={address} onChange={setAddress} label={i18n.t("user.email")} rules={[validators.email]} sx={{ mr: 2 }} />
            <BaseButton
              color="info"
              icon={icons.email}
              disabled={!appConfig.emailReady || !validEmail}
              loading={loading}
              onClick={() => void testEmail()}
            >
              {i18n.t("general.test")}
            </BaseButton>
            {tested && (
              <>
                <Divider sx={{ mt: 3 }} />
                <Box sx={{ py: 2 }}>
                  <h4>{i18n.t("settings.email-test-results")}</h4>
                  <Box component="span" sx={{ pl: 2 }}>
                    {success ? i18n.t("settings.succeeded") : i18n.t("settings.failed")}
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </Alert>
      </Box>

      {/* Site Statistics */}
      <Box component="section" sx={{ pt: 1 }}>
        <BaseCardSectionTitle icon={icons.chart} title={i18n.t("settings.site-statistics")} />
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "0.8rem" }}>
          {Object.entries(adminStats).map(([key, value]) => (
            <StatsCards
              key={`${key}-${value}`}
              minWidth={xs ? "100%" : "158"}
              icon={adminStatsIcon[key] ?? icons.primary}
              to={adminStatsTo[key]}
              title={adminStatsText[key] ?? key}
              value={value}
            />
          ))}
        </Box>
      </Box>

      {/* General App Info */}
      <Box component="section" sx={{ mt: 2 }}>
        <BaseCardSectionTitle icon={icons.cog} title={i18n.t("settings.general-about")} />
        <Card sx={{ mb: 2 }}>
          {appInfo && appInfo.length
            ? appInfo.map((property, idx) => (
                <Fragment key={property.name}>
                  <ListItem>
                    <ListItemIcon>
                      <Icon path={property.icon || icons.user} />
                    </ListItemIcon>
                    <ListItemText primary={property.name} secondary={appInfoValue(property)} />
                  </ListItem>
                  {idx !== appInfo.length - 1 && <Divider />}
                </Fragment>
              ))
            : <AppLoader />}
        </Card>
      </Box>
    </BaseContainer>
  );
}
