import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { Outlet } from "react-router";
import { icons } from "~/lib/icons";
import type { SidebarLinks } from "~/types/application-types";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "~/components/global/Icon";
import { AppHeader, APP_BAR_HEIGHT } from "~/components/Layout/LayoutParts/AppHeader";
import { AppSidebar } from "~/components/Layout/LayoutParts/AppSidebar";
import { TheSnackbar } from "~/components/Layout/LayoutParts/TheSnackbar";

export default function AdminLayout() {
  const i18n = useI18n();
  const display = useDisplay();
  const [sidebar, setSidebar] = useState(false);
  useEffect(() => {
    setSidebar(display.lgAndUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- initial state on mount only
  }, []);

  const topLinks: SidebarLinks = [
    { icon: icons.cog, to: "/admin/site-settings", title: i18n.t("sidebar.site-settings"), restricted: true },
    { icon: icons.user, to: "/admin/manage/users", title: i18n.t("user.users"), restricted: true },
    { icon: icons.household, to: "/admin/manage/households", title: i18n.t("household.households"), restricted: true },
    { icon: icons.group, to: "/admin/manage/groups", title: i18n.t("group.groups"), restricted: true },
    { icon: icons.database, to: "/admin/backups", title: i18n.t("sidebar.backups"), restricted: true },
  ];

  const developerLinks: SidebarLinks = [
    { icon: icons.wrench, to: "/admin/maintenance", title: i18n.t("sidebar.maintenance"), restricted: true },
    {
      icon: icons.robot,
      title: i18n.t("recipe.debug"),
      restricted: true,
      children: [
        { icon: icons.robot, to: "/admin/debug/openai", title: i18n.t("admin.openai"), restricted: true },
        { icon: icons.slotMachine, to: "/admin/debug/parser", title: i18n.t("sidebar.parser"), restricted: true },
      ],
    },
  ];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <TheSnackbar />
      <AppHeader>
        <IconButton color="inherit" onClick={() => setSidebar(!sidebar)}>
          <Icon path={icons.menu} />
        </IconButton>
      </AppHeader>
      <AppSidebar
        open={sidebar}
        onOpenChange={setSidebar}
        topLink={topLinks}
        secondaryHeader={i18n.t("sidebar.developer")}
        secondaryLinks={developerLinks}
      />
      <Box component="main" className="app-main" sx={{ flexGrow: 1, pt: `${APP_BAR_HEIGHT}px`, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
