import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { AdvancedOnly } from "~/components/global/AdvancedOnly";
import { BaseContainer } from "~/components/global/BaseContainer";
import { Icon } from "~/components/global/Icon";
import { StatsCards } from "~/components/global/StatsCards";
import { UserAvatar } from "~/components/Domain/User/UserAvatar";
import { UserInviteDialog } from "~/components/Domain/User/UserInviteDialog";
import { UserProfileLinkCard } from "~/components/Domain/User/UserProfileLinkCard";
import { useUserApi } from "~/hooks/api";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { useAppInfo } from "~/lib/app-info";
import type { HouseholdStatistics } from "~/lib/api/types/household";
import { icons } from "~/lib/icons";

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section>
      <div>
        <Typography variant="h6" component="h3">{title}</Typography>
        <p>{description}</p>
      </div>
      <Grid container spacing={3} component="section">{children}</Grid>
    </section>
  );
}

function LinkCell({ children }: { children: ReactNode }) {
  return <Grid size={{ xs: 12, md: 6 }}>{children}</Grid>;
}

export default function UserProfilePage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const appInfo = useAppInfo();
  const params = useParams();
  const { xs } = useDisplay();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  useSeoMeta({ title: i18n.t("settings.profile") });

  const authUser = auth.user;
  // Override canInvite if password login is disabled
  const user = authUser ? { ...authUser, canInvite: !appInfo.allowPasswordLogin ? false : authUser.canInvite } : null;

  const [inviteDialog, setInviteDialog] = useState(false);
  const api = useUserApi();

  const [stats, setStats] = useState<HouseholdStatistics | null>(null);
  useEffect(() => {
    void api.households.statistics().then(({ data }) => {
      if (data) setStats(data);
    });
  }, [api]);

  const filteredStats: Partial<HouseholdStatistics> = (() => {
    if (!stats) return {};
    if (!user?.canManage) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { totalUsers, ...rest } = stats;
      return rest;
    }
    return stats;
  })();

  const statsText: Record<string, string> = {
    totalRecipes: i18n.t("general.recipes"),
    totalUsers: i18n.t("user.users"),
    totalCategories: i18n.t("sidebar.categories"),
    totalTags: i18n.t("sidebar.tags"),
    totalTools: i18n.t("tool.tools"),
  };

  const iconText: Record<string, string> = {
    totalUsers: icons.user,
    totalCategories: icons.categories,
    totalTags: icons.tags,
    totalTools: icons.potSteam,
  };

  const statsTo: Record<string, string> = {
    totalRecipes: `/g/${groupSlug}/`,
    totalUsers: "/household/members",
    totalCategories: `/g/${groupSlug}/recipes/categories`,
    totalTags: `/g/${groupSlug}/recipes/tags`,
    totalTools: `/g/${groupSlug}/recipes/tools`,
  };

  if (!user) return null;

  return (
    <BaseContainer sx={{ mb: 4 }}>
      <Box component="section" sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 2 }}>
        <UserAvatar tooltip={false} size="96" userId={user.id} />

        <Typography variant="h4" component="h2" sx={{ textAlign: "center" }}>
          {i18n.t("profile.welcome-user", [user.fullName])}
        </Typography>
        <Typography variant="subtitle1" sx={{ textAlign: "center" }}>
          {i18n.t("profile.description")}
        </Typography>
        <Box sx={{ width: "100%", maxWidth: 600, display: "flex", justifyContent: "center", my: 2 }}>
          {user.canInvite && (
            <Button
              variant="outlined"
              sx={{ borderRadius: 6 }}
              startIcon={<Icon path={icons.createAlt} />}
              onClick={() => setInviteDialog(true)}
            >
              {i18n.t("profile.get-invite-link")}
            </Button>
          )}
        </Box>
        <UserInviteDialog open={inviteDialog} onOpenChange={setInviteDialog} />
      </Box>
      <Box component="section" sx={{ my: 1.5 }}>
        <div>
          <Typography variant="h5" component="h3">{i18n.t("profile.account-summary")}</Typography>
          <p>{i18n.t("profile.account-summary-description")}</p>
        </div>
        <Card variant="outlined" sx={{ mt: 2, p: 1, borderColor: "lightgray" }}>
          <Typography variant="h6" sx={{ px: 2, pt: 1 }}>{i18n.t("profile.household-statistics")}</Typography>
          <Typography variant="body2" sx={{ px: 2 }}>{i18n.t("profile.household-statistics-description")}</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "0.8rem", p: 2 }}>
            {Object.entries(filteredStats).map(([key, value]) => (
              <StatsCards
                key={`${key}-${value}`}
                minWidth={xs ? "100%" : "158"}
                icon={iconText[key] ?? icons.primary}
                to={statsTo[key] ?? "unknown"}
                title={statsText[key] ?? "unknown"}
                value={value}
              />
            ))}
          </Box>
        </Card>
      </Box>
      <Divider sx={{ my: 3.5 }} />
      <Section title={i18n.t("profile.personal")} description={i18n.t("profile.personal-description")}>
        <LinkCell>
          <UserProfileLinkCard
            link={{ text: i18n.t("profile.manage-user-profile"), to: "/user/profile/edit" }}
            image="/svgs/manage-profile.svg"
            title={i18n.t("profile.user-settings")}
          >
            {i18n.t("profile.user-settings-description")}
          </UserProfileLinkCard>
        </LinkCell>
        <AdvancedOnly>
          <LinkCell>
            <UserProfileLinkCard
              link={{ text: i18n.t("profile.manage-your-api-tokens"), to: "/user/profile/api-tokens" }}
              image="/svgs/manage-api-tokens.svg"
              title={i18n.t("settings.token.api-tokens")}
            >
              {i18n.t("profile.api-tokens-description")}
            </UserProfileLinkCard>
          </LinkCell>
        </AdvancedOnly>
      </Section>
      <Divider sx={{ my: 3.5 }} />
      <Section title={i18n.t("household.household")} description={i18n.t("profile.household-description")}>
        {user.canManageHousehold && (
          <LinkCell>
            <UserProfileLinkCard
              link={{ text: i18n.t("profile.household-settings"), to: "/household" }}
              image="/svgs/manage-group-settings.svg"
              title={i18n.t("profile.household-settings")}
            >
              {i18n.t("profile.household-settings-description")}
            </UserProfileLinkCard>
          </LinkCell>
        )}
        <LinkCell>
          <UserProfileLinkCard
            link={{ text: i18n.t("profile.manage-cookbooks"), to: `/g/${groupSlug}/cookbooks` }}
            image="/svgs/manage-cookbooks.svg"
            title={i18n.t("sidebar.cookbooks")}
          >
            {i18n.t("profile.cookbooks-description")}
          </UserProfileLinkCard>
        </LinkCell>
        {user.canManage && (
          <LinkCell>
            <UserProfileLinkCard
              link={{ text: i18n.t("profile.manage-members"), to: "/household/members" }}
              image="/svgs/manage-members.svg"
              title={i18n.t("profile.members")}
            >
              {i18n.t("profile.members-description")}
            </UserProfileLinkCard>
          </LinkCell>
        )}
        <AdvancedOnly>
          {user.advanced && (
            <LinkCell>
              <UserProfileLinkCard
                link={{ text: i18n.t("profile.manage-webhooks"), to: "/household/webhooks" }}
                image="/svgs/manage-webhooks.svg"
                title={i18n.t("settings.webhooks.webhooks")}
              >
                {i18n.t("profile.webhooks-description")}
              </UserProfileLinkCard>
            </LinkCell>
          )}
        </AdvancedOnly>
        <AdvancedOnly>
          <LinkCell>
            <UserProfileLinkCard
              link={{ text: i18n.t("profile.manage-notifiers"), to: "/household/notifiers" }}
              image="/svgs/manage-notifiers.svg"
              title={i18n.t("profile.notifiers")}
            >
              {i18n.t("profile.notifiers-description")}
            </UserProfileLinkCard>
          </LinkCell>
        </AdvancedOnly>
      </Section>
      <Divider sx={{ my: 3.5 }} />
      {(user.canManage || user.canOrganize || user.advanced) && (
        <Section title={i18n.t("group.group")} description={i18n.t("profile.group-description")}>
          {user.canManage && (
            <LinkCell>
              <UserProfileLinkCard
                link={{ text: i18n.t("profile.group-settings"), to: "/group" }}
                image="/svgs/manage-group-settings.svg"
                title={i18n.t("profile.group-settings")}
              >
                {i18n.t("profile.group-settings-description")}
              </UserProfileLinkCard>
            </LinkCell>
          )}
          {user.canOrganize && (
            <LinkCell>
              <UserProfileLinkCard
                link={{ text: i18n.t("profile.manage-data"), to: "/group/data/foods" }}
                image="/svgs/manage-recipes.svg"
                title={i18n.t("profile.manage-data")}
              >
                {i18n.t("profile.manage-data-description")}
              </UserProfileLinkCard>
            </LinkCell>
          )}
          <AdvancedOnly>
            <LinkCell>
              <UserProfileLinkCard
                link={{ text: i18n.t("profile.manage-data-migrations"), to: "/group/migrations" }}
                image="/svgs/manage-data-migrations.svg"
                title={i18n.t("profile.data-migrations")}
              >
                {i18n.t("profile.data-migrations-description")}
              </UserProfileLinkCard>
            </LinkCell>
          </AdvancedOnly>
        </Section>
      )}
    </BaseContainer>
  );
}
