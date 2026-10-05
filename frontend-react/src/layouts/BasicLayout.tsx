// Layout "basic" (Vue layouts/basic.vue): header without menu, no sidebar.
import Box from "@mui/material/Box";
import { Outlet } from "react-router";
import { AppHeader, APP_HEADER_HEIGHT } from "@/components/Layout/LayoutParts/AppHeader";
import { TheSnackbar } from "@/components/Layout/LayoutParts/TheSnackbar";

export default function BasicLayout() {
  return (
    <Box sx={{ minHeight: "100vh" }}>
      <TheSnackbar />

      <AppHeader menu={false} />
      <Box component="main" sx={{ pt: `${APP_HEADER_HEIGHT}px` }}>
        <Outlet />
      </Box>
    </Box>
  );
}
