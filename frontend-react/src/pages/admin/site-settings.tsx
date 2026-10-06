import { useEffect, useId, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppButtonCopy } from "@/components/global/AppButtonCopy";
import { AppLoader } from "@/components/global/AppLoader";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { cssColor } from "@/components/global/colors";
import { MdiIcon } from "@/components/global/MdiIcon";
import { StatsCards } from "@/components/global/StatsCards";
import { useAdminApi, useUserApi } from "@/hooks/api";
import { validators } from "@/hooks/use-validators";
import { field, useAsyncData, useDisplay, useFormValidation, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { AppStatistics, CheckAppConfig } from "@/lib/api/types/admin";
import { icons } from "@/lib/icons";

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

interface AppInfoRow {
  slot?: string;
  name: string;
  icon: string;
  value: string | number | null | undefined;
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
  const { t } = useI18n();
  const { xs } = useDisplay();
  const api = useUserApi();
  const adminApi = useAdminApi();

  // Set page title
  usePageTitle(t("settings.site-settings"));

  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [success, setSuccess] = useState(false);
  const [, setError] = useState("");
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
    totalRecipes: t("general.recipes"),
    totalUsers: t("user.users"),
    totalHouseholds: t("household.households"),
    totalGroups: t("group.groups"),
    uncategorizedRecipes: t("settings.uncategorized-recipes"),
    untaggedRecipes: t("settings.untagged-recipes"),
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

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await adminApi.about.checkApp();
      if (!active) return;
      setAppConfig(current => ({ ...(data ?? current), isSiteSecure: isLocalHostOrHttps() }));
      const { data: adminData } = await adminApi.about.statistics();
      if (active && adminData) {
        setAdminStats(adminData as AppStatistics);
      }
    })();
    return () => {
      active = false;
    };
  }, [adminApi]);

  // ============================================================
  // General About Info
  // Vue used a unique `useAsyncKey()` per visit; an instance id is the equivalent.
  const asyncKey = useId();
  const { data: about } = useAsyncData(asyncKey, async () => {
    const { data } = await adminApi.about.about();
    return data;
  });
  const rawAppInfo = {
    version: about?.version ?? "null",
    versionLatest: about?.versionLatest ?? "null",
  };

  const appInfo: AppInfoRow[] | null = about
    ? [
        {
          slot: "version",
          name: t("about.version"),
          icon: icons.information,
          value: about.version,
        },
        {
          slot: "build",
          name: t("settings.build"),
          icon: icons.information,
          value: about.buildId,
        },
        {
          name: t("about.application-mode"),
          icon: icons.devTo,
          value: about.production ? t("about.production") : t("about.development"),
        },
        {
          name: t("about.demo-status"),
          icon: icons.testTube,
          value: about.demoStatus ? t("about.demo") : t("about.not-demo"),
        },
        {
          name: t("about.api-port"),
          icon: icons.api,
          value: about.apiPort,
        },
        {
          name: t("about.api-docs"),
          icon: icons.file,
          value: about.apiDocs ? t("general.enabled") : t("general.disabled"),
        },
        {
          name: t("about.database-type"),
          icon: icons.database,
          value: about.dbType,
        },
        {
          name: t("about.database-url"),
          icon: icons.database,
          value: about.dbUrl,
        },
        {
          name: t("about.default-group"),
          icon: icons.group,
          value: about.defaultGroup,
        },
        {
          name: t("about.default-household"),
          icon: icons.household,
          value: about.defaultHousehold,
        },
        {
          slot: "recipe-scraper",
          name: t("settings.recipe-scraper-version"),
          icon: icons.primary,
          value: about.recipeScraperVersion,
        },
      ]
    : null;

  function authCheckText({ name, ready, disabled }: AuthProvider): string {
    if (disabled) {
      return t("settings.auth-provider-disabled", { provider: name });
    }
    return ready
      ? t("settings.auth-provider-ready", { provider: name })
      : t("settings.auth-provider-not-ready", { provider: name });
  }

  function authCheckColor({ ready, disabled }: AuthProvider): string {
    if (disabled) {
      return disabledColor;
    }
    return ready ? goodColor : warningColor;
  }

  function authCheckIcon({ ready, disabled }: AuthProvider): string {
    if (disabled) {
      return disabledIcon;
    }
    return ready ? goodIcon : warningIcon;
  }

  function authProviderCheck(provider: AuthProvider): SimpleCheck {
    return {
      id: provider.id,
      text: authCheckText(provider),
      status: provider.ready,
      errorText: provider.disabled
        ? t("settings.auth-provider-disabled-text", { envVar: provider.envVar })
        : t("settings.auth-provider-error-text", { provider: provider.name }),
      successText: t("settings.auth-provider-success-text", { provider: provider.name }),
      color: authCheckColor(provider),
      icon: authCheckIcon(provider),
    };
  }

  const simpleChecks: SimpleCheck[] = [
    {
      id: "application-version",
      text: t("settings.application-version"),
      status: appConfig.isUpToDate,
      errorText: t("settings.application-version-error-text", [rawAppInfo.version, rawAppInfo.versionLatest]),
      successText: t("settings.mealie-is-up-to-date"),
      color: appConfig.isUpToDate ? goodColor : warningColor,
      icon: appConfig.isUpToDate ? goodIcon : warningIcon,
    },
    {
      id: "secure-site",
      text: t("settings.secure-site"),
      status: appConfig.isSiteSecure,
      errorText: t("settings.secure-site-error-text"),
      successText: t("settings.secure-site-success-text"),
      color: appConfig.isSiteSecure ? goodColor : badColor,
      icon: appConfig.isSiteSecure ? goodIcon : badIcon,
    },
    {
      id: "server-side-base-url",
      text: t("settings.server-side-base-url"),
      status: appConfig.baseUrlSet,
      errorText: t("settings.server-side-base-url-error-text"),
      successText: t("settings.server-side-base-url-success-text"),
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

  // ============================================================
  // Email test
  const emailForm = useFormValidation({
    email: field(address, [validators.email]),
  });

  // Explicit bool check because validators.email sometimes returns a string
  const validEmail = address !== "" && validators.email(address) === true;

  async function testEmail() {
    setLoading(true);
    setTested(false);
    const { data } = await api.email.test({ email: address });
    if (data) {
      if (data.success) {
        setSuccess(true);
      }
      else {
        setError(data.error ?? "");
        setSuccess(false);
      }
    }
    setLoading(false);
    setTested(true);
  }

  // ============================================================
  // Bug report
  const [bugReportDialog, setBugReportDialog] = useState(false);

  const ignore: Record<string, boolean> = {
    [t("about.database-url")]: true,
    [t("about.default-group")]: true,
  };
  let bugReportText = "**Details**\n";
  appInfo?.forEach((item) => {
    if (ignore[item.name]) {
      return;
    }
    bugReportText += `${item.name}: ${item.value as string}\n`;
  });
  const ignoreChecks: Record<string, boolean> = {
    "application-version": true,
  };
  bugReportText += "\n**Checks**\n";
  simpleChecks.forEach((item) => {
    if (ignoreChecks[item.id]) {
      return;
    }
    const status = item.status ? t("general.yes") : t("general.no");
    bugReportText += `${item.text}: ${status}\n`;
  });
  bugReportText += `${t("settings.email-configured")}: ${appConfig.emailReady ? t("general.yes") : t("general.no")}\n`;

  const linkSx = { color: "primary.main" };

  function renderInfoValue(property: AppInfoRow) {
    if (property.slot === "recipe-scraper") {
      return (
        <Box component="a" sx={linkSx} target="_blank" rel="noreferrer" href={`https://github.com/hhursev/recipe-scrapers/releases/tag/${property.value}`}>
          {property.value}
        </Box>
      );
    }
    if (property.slot === "build") {
      return (
        <Box component="a" sx={linkSx} target="_blank" rel="noreferrer" href={`https://github.com/mealie-recipes/mealie/commit/${property.value}`}>
          {property.value}
        </Box>
      );
    }
    if (property.slot === "version" && property.value !== "develop" && property.value !== "nightly") {
      return (
        <Box component="a" sx={linkSx} target="_blank" rel="noreferrer" href={`https://github.com/mealie-recipes/mealie/releases/tag/${property.value}`}>
          {property.value}
        </Box>
      );
    }
    return property.value;
  }

  return (
    <Container maxWidth={false} sx={{ maxWidth: "800px !important" }}>
      {/* Image */}
      <BasePageTitle
        divider
        header={<BaseImg width="100%" maxHeight="200px" maxWidth="150px" src="/svgs/admin-site-settings.svg" />}
        title={t("settings.site-settings")}
      />

      {/* Bug Report */}
      <BaseDialog
        open={bugReportDialog}
        onOpenChange={setBugReportDialog}
        bottomSheet
        title={t("settings.bug-report")}
        width={800}
        icon={icons.github}
      >
        <CardContent>
          <Box sx={{ pb: 2 }}>
            {t("settings.bug-report-information")}
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={18}
            maxRows={18}
            value={bugReportText}
            slotProps={{ input: { readOnly: true } }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "5px" }}>
            <Button
              variant="outlined"
              color="inherit"
              target="_blank"
              rel="noreferrer"
              href="https://github.com/mealie-recipes/mealie/issues/new/choose"
              startIcon={<MdiIcon path={icons.github} />}
            >
              {t("settings.tracker")}
            </Button>
            <AppButtonCopy copyText={bugReportText} color="info" icon={false} />
          </Box>
        </CardContent>
      </BaseDialog>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <BaseButton color="info" icon={icons.github} onClick={() => setBugReportDialog(true)}>
          {t("settings.bug-report")}
        </BaseButton>
      </Box>

      {/* Configuration */}
      <section>
        <Box sx={{ pb: 0 }}>
          <BaseCardSectionTitle icon={icons.cog} title={t("settings.configuration")} />
        </Box>
        <Card sx={{ mb: 2 }}>
          {simpleChecks.map(check => (
            <Box key={check.id}>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <MdiIcon sx={theme => ({ color: cssColor(theme, check.color), opacity: 1 })} path={check.icon} />
                </ListItemIcon>
                <ListItemText
                  primary={check.text}
                  secondary={check.status ? check.successText : check.errorText}
                  slotProps={{ secondary: { sx: { whiteSpace: "normal", wordWrap: "break-word" } } }}
                />
              </ListItem>
              <Divider />
            </Box>
          ))}
        </Card>
      </section>

      {/* Email */}
      <section>
        <Box sx={{ pt: 1 }}>
          <BaseCardSectionTitle icon={icons.email} title={t("user.email")} />
        </Box>
        <Paper
          elevation={2}
          sx={theme => ({
            display: "flex",
            gap: 2,
            p: 2,
            borderLeft: `4px solid ${cssColor(theme, appConfig.emailReady ? "success" : "error")}`,
          })}
        >
          <MdiIcon
            sx={theme => ({ color: cssColor(theme, appConfig.emailReady ? "success" : "warning"), mt: 0.5 })}
            path={appConfig.emailReady ? icons.checkboxMarkedCircle : icons.alertCircle}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ fontWeight: 500 }}>
              {t("settings.email-configuration-status")}
            </Box>
            <div>
              {appConfig.emailReady ? t("settings.ready") : t("settings.not-ready")}
            </div>
            <div>
              <TextField
                fullWidth
                variant="filled"
                sx={{ mr: 2, mb: 1 }}
                label={t("user.email")}
                value={address}
                {...emailForm.fieldProps("email")}
                onChange={event => setAddress(event.target.value)}
              />
              <BaseButton
                color="info"
                disabled={!appConfig.emailReady || !validEmail}
                loading={loading}
                icon={icons.email}
                onClick={() => void testEmail()}
              >
                {t("general.test")}
              </BaseButton>
              {tested && (
                <>
                  <Divider sx={{ mt: 3 }} />
                  <CardContent sx={{ px: 0 }}>
                    <Typography variant="subtitle1" component="h4" sx={{ fontWeight: "bold" }}>{t("settings.email-test-results")}</Typography>
                    <Box component="span" sx={{ pl: 2 }}>
                      {success ? t("settings.succeeded") : t("settings.failed")}
                    </Box>
                  </CardContent>
                </>
              )}
            </div>
          </Box>
        </Paper>
      </section>

      {/* Site Statistics */}
      <section>
        <Box sx={{ pt: 1 }}>
          <BaseCardSectionTitle icon={icons.chart} title={t("settings.site-statistics")} />
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "0.8rem" }}>
          {Object.entries(adminStats).map(([key, value]) => (
            <StatsCards
              key={`${key}-${value}`}
              minWidth={xs ? "100%" : "158px"}
              icon={adminStatsIcon[key] ?? icons.primary}
              to={adminStatsTo[key] ?? undefined}
              title={adminStatsText[key] ?? key}
              value={value}
            />
          ))}
        </Box>
      </section>

      {/* General App Info */}
      <section>
        <Box sx={{ mt: 2, pb: 0 }}>
          <BaseCardSectionTitle icon={icons.cog} title={t("settings.general-about")} />
        </Box>
        <Card sx={{ mb: 2 }}>
          {appInfo && appInfo.length
            ? appInfo.map((property, idx) => (
                <Box key={property.name}>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <MdiIcon path={property.icon || icons.user} />
                    </ListItemIcon>
                    <ListItemText primary={property.name} secondary={renderInfoValue(property)} />
                  </ListItem>
                  {idx !== appInfo.length - 1 && <Divider />}
                </Box>
              ))
            : <AppLoader />}
        </Card>
      </section>
    </Container>
  );
}
