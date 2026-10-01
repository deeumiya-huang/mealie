import { Link as RouterLink } from "react-router";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { Icon } from "~/components/global/Icon";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { icons } from "~/lib/icons";

type SectionColor = "info" | "success" | "primary";

/** The setup wizard's last step: links to the usual next things to do. */
export function EndPageContent() {
  const i18n = useI18n();
  const theme = useTheme();
  const auth = useMealieAuth();
  const groupSlug = auth.user?.groupSlug || "";

  const sections: { title: string; color: SectionColor; links: { icon: string; to: string; text: string; description: string }[] }[] = [
    {
      title: i18n.t("profile.data-migrations"),
      color: "info",
      links: [
        {
          icon: icons.backupRestore,
          to: "/admin/backups",
          text: i18n.t("settings.backup.backup-restore"),
          description: i18n.t("admin.setup.restore-from-v1-backup"),
        },
        {
          icon: icons.import,
          to: "/group/migrations",
          text: i18n.t("migration.recipe-migration"),
          description: i18n.t("migration.migration-description"),
        },
      ],
    },
    {
      title: i18n.t("recipe.create-recipes"),
      color: "success",
      links: [
        {
          icon: icons.createAlt,
          to: `/g/${groupSlug}/r/create/new`,
          text: i18n.t("recipe.create-recipe"),
          description: i18n.t("recipe.create-recipe-description"),
        },
        {
          icon: icons.link,
          to: `/g/${groupSlug}/r/create/url`,
          text: i18n.t("recipe.import-with-url"),
          description: i18n.t("recipe.scrape-recipe-description"),
        },
      ],
    },
    {
      title: i18n.t("user.manage-users"),
      color: "primary",
      links: [
        {
          icon: icons.group,
          to: "/admin/manage/users",
          text: i18n.t("user.manage-users"),
          description: i18n.t("user.manage-users-description"),
        },
        {
          icon: icons.user,
          to: "/user/profile",
          text: i18n.t("profile.manage-user-profile"),
          description: i18n.t("admin.setup.manage-profile-or-get-invite-link"),
        },
      ],
    },
  ];

  return (
    <Box sx={{ maxWidth: 880, mx: "auto", p: 2 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div>
          <Typography variant="h4" sx={{ textAlign: "center" }}>{i18n.t("admin.setup.setup-complete")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            {i18n.t("admin.setup.here-are-a-few-things-to-help-you-get-started")}
          </Typography>
        </div>
        {sections.map((section, idx) => (
          <Box key={idx} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="h6">{section.title}</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {section.links.map((link, linkIdx) => (
                <Card key={linkIdx}>
                  <CardActionArea component={RouterLink} to={link.to} sx={{ display: "flex", alignItems: "center", gap: 2, p: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette[section.color].main, 0.12),
                        color: theme.palette[section.color].main,
                      }}
                    >
                      <Icon path={link.icon} />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1">{link.text}</Typography>
                      <Typography variant="body2" color="text.secondary">{link.description}</Typography>
                    </Box>
                    <Icon path={icons.chevronRight} />
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default EndPageContent;
