import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { Outlet } from "react-router";
import { useAppInfo } from "~/lib/app-info";
import { useI18n } from "~/hooks/use-global-i18n";
import { TheSnackbar } from "~/components/Layout/LayoutParts/TheSnackbar";

export default function BlankLayout() {
  const i18n = useI18n();
  const appInfo = useAppInfo();
  return (
    <Box sx={{ minHeight: "100vh" }}>
      <TheSnackbar />
      {appInfo.demoStatus && (
        <Alert icon={false} severity="info" sx={{ position: "sticky", top: 0, zIndex: 10, justifyContent: "center", borderRadius: 0 }}>
          <b>{i18n.t("demo.info_message_with_version", { version: appInfo.version })}</b>
        </Alert>
      )}
      <Box component="main" className="app-main">
        <Outlet />
      </Box>
    </Box>
  );
}
