// Layout "blank" (Vue layouts/blank.vue): no header or sidebar; the demo banner when the server runs as a demo.
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { Outlet } from "react-router";
import { TheSnackbar } from "@/components/Layout/LayoutParts/TheSnackbar";
import { useI18n } from "@/i18n";
import { useAppInfo } from "@/providers/app-info";

export default function BlankLayout() {
  const { t } = useI18n();
  const appInfo = useAppInfo();

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <TheSnackbar />

      {appInfo.demoStatus && (
        <Alert icon={false} severity="info" sx={{ position: "sticky", top: 0, zIndex: 1, justifyContent: "center", borderRadius: 0 }}>
          <Box sx={{ textAlign: "center" }}>
            <b>
              {" "}
              {t("demo.info_message_with_version", { version: appInfo.version })}
              {" "}
            </b>
          </Box>
        </Alert>
      )}

      <Box component="main">
        <Outlet />
      </Box>
    </Box>
  );
}
