// Usage: <EndPageContent /> — last step of the first-time setup wizard: "setup complete" heading and
// link cards (migrations, create recipes, manage users) grouped in sections.
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Link } from "react-router";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface SetupLink {
  icon: string;
  to: string;
  text: string;
  description: string;
}

interface SetupSection {
  title: string;
  color: "info" | "success" | "primary";
  links: SetupLink[];
}

export function EndPageContent() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const groupSlug = auth.user?.groupSlug;

  const sections: SetupSection[] = [
    {
      title: t("profile.data-migrations"),
      color: "info",
      links: [
        {
          icon: icons.backupRestore,
          to: "/admin/backups",
          text: t("settings.backup.backup-restore"),
          description: t("admin.setup.restore-from-v1-backup"),
        },
        {
          icon: icons.import,
          to: "/group/migrations",
          text: t("migration.recipe-migration"),
          description: t("migration.migration-description"),
        },
      ],
    },
    {
      title: t("recipe.create-recipes"),
      color: "success",
      links: [
        {
          icon: icons.createAlt,
          to: `/g/${groupSlug || ""}/r/create/new`,
          text: t("recipe.create-recipe"),
          description: t("recipe.create-recipe-description"),
        },
        {
          icon: icons.link,
          to: `/g/${groupSlug || ""}/r/create/url`,
          text: t("recipe.import-with-url"),
          description: t("recipe.scrape-recipe-description"),
        },
      ],
    },
    {
      title: t("user.manage-users"),
      color: "primary",
      links: [
        {
          icon: icons.group,
          to: "/admin/manage/users",
          text: t("user.manage-users"),
          description: t("user.manage-users-description"),
        },
        {
          icon: icons.user,
          to: "/user/profile",
          text: t("profile.manage-user-profile"),
          description: t("admin.setup.manage-profile-or-get-invite-link"),
        },
      ],
    },
  ];

  return (
    <Container maxWidth={false} sx={{ maxWidth: "880px !important" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box>
          <Typography variant="h4" component="div" sx={{ display: "flex", justifyContent: "center", p: 0, whiteSpace: "unset" }}>
            {t("admin.setup.setup-complete")}
          </Typography>
          <Typography variant="body2" component="div" sx={{ display: "flex", justifyContent: "center", color: "text.secondary", p: 0, whiteSpace: "unset" }}>
            {t("admin.setup.here-are-a-few-things-to-help-you-get-started")}
          </Typography>
        </Box>
        {sections.map(section => (
          <Box key={section.title} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="h6" component="div" sx={{ pl: 0, whiteSpace: "unset" }}>
              {section.title}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {section.links.map(link => (
                <Card key={link.to}>
                  <CardActionArea component={Link} to={link.to} sx={{ display: "flex", alignItems: "center", gap: 1, p: 2, justifyContent: "flex-start" }}>
                    <Avatar
                      sx={theme => ({
                        color: theme.palette[section.color].main,
                        bgcolor: alpha(theme.palette[section.color].main, 0.12),
                      })}
                    >
                      <MdiIcon path={link.icon} />
                    </Avatar>
                    <Box sx={{ flexGrow: 1, ml: 1 }}>
                      <Typography variant="subtitle1" component="div" sx={{ whiteSpace: "unset" }}>
                        {link.text}
                      </Typography>
                      <Typography variant="body2" component="div" sx={{ color: "text.secondary", whiteSpace: "unset" }}>
                        {link.description}
                      </Typography>
                    </Box>
                    <MdiIcon path={icons.chevronRight} />
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Container>
  );
}
