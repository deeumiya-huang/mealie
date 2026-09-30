import Box from "@mui/material/Box";
import { Outlet } from "react-router";
import { AppHeader, APP_BAR_HEIGHT } from "~/components/Layout/LayoutParts/AppHeader";
import { TheSnackbar } from "~/components/Layout/LayoutParts/TheSnackbar";

export default function BasicLayout() {
  return (
    <Box sx={{ minHeight: "100vh" }}>
      <TheSnackbar />
      <AppHeader menu={false} />
      <Box component="main" className="app-main" sx={{ pt: `${APP_BAR_HEIGHT}px` }}>
        <Outlet />
      </Box>
    </Box>
  );
}
