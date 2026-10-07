import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useParams } from "react-router";
import { AdvancedOnly } from "@/components/global/AdvancedOnly";
import { MdiIcon } from "@/components/global/MdiIcon";
import { StatsCards } from "@/components/global/StatsCards";
import { UserAvatar } from "@/components/Domain/User/UserAvatar";
import { UserInviteDialog } from "@/components/Domain/User/UserInviteDialog";
import { UserProfileLinkCard } from "@/components/Domain/User/UserProfileLinkCard";
import { useUserApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useAsyncData, useDisplay, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { HouseholdStatistics } from "@/lib/api/types/household";
import type { UserOut } from "@/lib/api/types/user";
import { icons } from "@/lib/icons";
import { useAppInfo } from "@/providers/app-info";

type StatsKey = keyof HouseholdStatistics;

export default function UserProfilePage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const appInfo = useAppInfo();
  const params = useParams();
  const { xs } = useDisplay();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  usePageTitle(t("settings.profile"));

  const authUser = auth.user;
  const user = useMemo<UserOut | null>(() => {
    if (!authUser) return null;

    // Override canInvite if password login is disabled
    const canInvite = !appInfo.allowPasswordLogin ? false : authUser.canInvite;

    return { ...authUser, canInvite };
  }, [authUser, appInfo.allowPasswordLogin]);

  const [inviteDialog, setInviteDialog] = useState(false);
  const api = useUserApi();

  // Vue used a fresh key per visit: the statistics are always loaded again, nothing cached
  const { data: stats } = useAsyncData("user-profile-stats", async () => {
    const { data } = await api.households.statistics();

    if (data) {
      return data;
    }
    return undefined;
  }, [], { cache: false });

  const filteredStats = useMemo<Partial<HouseholdStatistics>>(() => {
    if (!stats) return {};
    if (!user?.canManage) {
      const { totalUsers: _totalUsers, ...rest } = stats;
      return rest;
    }
    return stats;
  }, [stats, user?.canManage]);

  const statsText: Record<string, string> = {
    totalRecipes: t("general.recipes"),
    totalUsers: t("user.users"),
    totalCategories: t("sidebar.categories"),
    totalTags: t("sidebar.tags"),
    totalTools: t("tool.tools"),
  };

  function getStatsTitle(key: string) {
    return statsText[key] ?? "unknown";
  }

  const iconText: Record<string, string> = {
    totalUsers: icons.user,
    totalCategories: icons.categories,
    totalTags: icons.tags,
    totalTools: icons.potSteam,
  };

  function getStatsIcon(key: string) {
    return iconText[key] ?? icons.primary;
  }

  const statsTo: Record<string, string> = {
    totalRecipes: `/g/${groupSlug}/`,
    totalUsers: "/household/members",
    totalCategories: `/g/${groupSlug}/recipes/categories`,
    totalTags: `/g/${groupSlug}/recipes/tags`,
    totalTools: `/g/${groupSlug}/recipes/tools`,
  };

  function getStatsTo(key: string) {
    return statsTo[key] ?? "unknown";
  }

  if (!user) {
    return null;
  }

  return (
    <Container sx={{ mb: 4 }}>
      <Box component="section" sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 2 }}>
        <UserAvatar tooltip={false} size="96" userId={user.id} />

        <Typography component="h2" variant="h4" align="center">
          {t("profile.welcome-user", [user.fullName])}
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 0, textAlign: "center" }}>
          {t("profile.description")}
        </Typography>
        <Card elevation={0} sx={{ bgcolor: "transparent", width: "100%", maxWidth: 600 }}>
          <CardActions sx={{ display: "flex", justifyContent: "center", my: 2 }}>
            {user.canInvite && (
              <Button
                variant="outlined"
                startIcon={<MdiIcon path={icons.createAlt} />}
                sx={{ borderRadius: 9999 }}
                onClick={() => setInviteDialog(true)}
              >
                {t("profile.get-invite-link")}
              </Button>
            )}
          </CardActions>
          <UserInviteDialog open={inviteDialog} onOpenChange={setInviteDialog} />
        </Card>
      </Box>
      <Box component="section" sx={{ my: 1.5 }}>
        <div>
          <Typography component="h3" variant="h5">
            {t("profile.account-summary")}
          </Typography>
          <p>{t("profile.account-summary-description")}</p>
        </div>
        <Grid container component="section">
          <Grid size={{ xs: 12, sm: 12, md: 12 }}>
            <Card variant="outlined" sx={{ borderColor: "lightgray", mt: 2, p: 1 }}>
              <Typography variant="h6" sx={{ px: 2, pt: 2, pb: 0 }}>
                {t("profile.household-statistics")}
              </Typography>
              <CardContent sx={{ py: 0 }}>
                {t("profile.household-statistics-description")}
              </CardContent>
              <CardContent sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "0.8rem" }}>
                {(Object.entries(filteredStats) as [StatsKey, number][]).map(([key, value]) => (
                  <StatsCards
                    key={`${key}-${value}`}
                    minWidth={xs ? "100%" : "158px"}
                    icon={getStatsIcon(key)}
                    to={getStatsTo(key)}
                    title={getStatsTitle(key)}
                    value={value}
                  />
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      <Divider sx={{ my: 3.5 }} />
      <Box component="section">
        <div>
          <Typography component="h3" variant="h6">
            {t("profile.personal")}
          </Typography>
          <p>{t("profile.personal-description")}</p>
        </div>
        <Grid container component="section">
          <Grid size={{ xs: 12, sm: 12, md: 6 }}>
            <UserProfileLinkCard
              link={{ text: t("profile.manage-user-profile"), to: "/user/profile/edit" }}
              image="/svgs/manage-profile.svg"
              title={t("profile.user-settings")}
            >
              {t("profile.user-settings-description")}
            </UserProfileLinkCard>
          </Grid>
          <AdvancedOnly>
            <Grid size={{ xs: 12, sm: 12, md: 6 }}>
              <UserProfileLinkCard
                link={{ text: t("profile.manage-your-api-tokens"), to: "/user/profile/api-tokens" }}
                image="/svgs/manage-api-tokens.svg"
                title={t("settings.token.api-tokens")}
              >
                {t("profile.api-tokens-description")}
              </UserProfileLinkCard>
            </Grid>
          </AdvancedOnly>
        </Grid>
      </Box>
      <Divider sx={{ my: 3.5 }} />
      <Box component="section">
        <div>
          <Typography component="h3" variant="h6">
            {t("household.household")}
          </Typography>
          <p>{t("profile.household-description")}</p>
        </div>
        <Grid container component="section">
          {user.canManageHousehold && (
            <Grid size={{ xs: 12, sm: 12, md: 6 }}>
              <UserProfileLinkCard
                link={{ text: t("profile.household-settings"), to: "/household" }}
                image="/svgs/manage-group-settings.svg"
                title={t("profile.household-settings")}
              >
                {t("profile.household-settings-description")}
              </UserProfileLinkCard>
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 12, md: 6 }}>
            <UserProfileLinkCard
              link={{ text: t("profile.manage-cookbooks"), to: `/g/${groupSlug}/cookbooks` }}
              image="/svgs/manage-cookbooks.svg"
              title={t("sidebar.cookbooks")}
            >
              {t("profile.cookbooks-description")}
            </UserProfileLinkCard>
          </Grid>
          {user.canManage && (
            <Grid size={{ xs: 12, sm: 12, md: 6 }}>
              <UserProfileLinkCard
                link={{ text: t("profile.manage-members"), to: "/household/members" }}
                image="/svgs/manage-members.svg"
                title={t("profile.members")}
              >
                {t("profile.members-description")}
              </UserProfileLinkCard>
            </Grid>
          )}
          <AdvancedOnly>
            {user.advanced && (
              <Grid size={{ xs: 12, sm: 12, md: 6 }}>
                <UserProfileLinkCard
                  link={{ text: t("profile.manage-webhooks"), to: "/household/webhooks" }}
                  image="/svgs/manage-webhooks.svg"
                  title={t("settings.webhooks.webhooks")}
                >
                  {t("profile.webhooks-description")}
                </UserProfileLinkCard>
              </Grid>
            )}
          </AdvancedOnly>
          <AdvancedOnly>
            <Grid size={{ xs: 12, sm: 12, md: 6 }}>
              <UserProfileLinkCard
                link={{ text: t("profile.manage-notifiers"), to: "/household/notifiers" }}
                image="/svgs/manage-notifiers.svg"
                title={t("profile.notifiers")}
              >
                {t("profile.notifiers-description")}
              </UserProfileLinkCard>
            </Grid>
          </AdvancedOnly>
        </Grid>
      </Box>
      <Divider sx={{ my: 3.5 }} />
      {(user.canManage || user.canOrganize || user.advanced) && (
        <Box component="section">
          <div>
            <Typography component="h3" variant="h6">
              {t("group.group")}
            </Typography>
            <p>{t("profile.group-description")}</p>
          </div>
          <Grid container component="section">
            {user.canManage && (
              <Grid size={{ xs: 12, sm: 12, md: 6 }}>
                <UserProfileLinkCard
                  link={{ text: t("profile.group-settings"), to: "/group" }}
                  image="/svgs/manage-group-settings.svg"
                  title={t("profile.group-settings")}
                >
                  {t("profile.group-settings-description")}
                </UserProfileLinkCard>
              </Grid>
            )}
            {user.canOrganize && (
              <Grid size={{ xs: 12, sm: 12, md: 6 }}>
                <UserProfileLinkCard
                  link={{ text: t("profile.manage-data"), to: "/group/data/foods" }}
                  image="/svgs/manage-recipes.svg"
                  title={t("profile.manage-data")}
                >
                  {t("profile.manage-data-description")}
                </UserProfileLinkCard>
              </Grid>
            )}
            <AdvancedOnly>
              <Grid size={{ xs: 12, sm: 12, md: 6 }}>
                <UserProfileLinkCard
                  link={{ text: t("profile.manage-data-migrations"), to: "/group/migrations" }}
                  image="/svgs/manage-data-migrations.svg"
                  title={t("profile.data-migrations")}
                >
                  {t("profile.data-migrations-description")}
                </UserProfileLinkCard>
              </Grid>
            </AdvancedOnly>
          </Grid>
        </Box>
      )}
    </Container>
  );
}
