// Usage: <TheSnackbar /> once per layout — renders the module-level toasts (hooks/use-toast):
// `alert.*` at the top (auto-hides, default 2 s, optional action button) and `loader.*` at the bottom
// (stays until clicked).
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Snackbar from "@mui/material/Snackbar";
import SnackbarContent from "@mui/material/SnackbarContent";
import { MdiIcon } from "@/components/global/MdiIcon";
import { toastAlert, toastLoading } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { useStore } from "@/lib/store";

type Severity = "error" | "success" | "info" | "warning";

function severity(color: string): Severity {
  return color === "error" || color === "success" || color === "info" || color === "warning" ? color : "info";
}

export function TheSnackbar() {
  const { t } = useI18n();
  const alert = useStore(toastAlert);
  const loading = useStore(toastLoading);

  const icon = (() => {
    switch (alert.color) {
      case "error":
        return icons.alertOutline;
      case "success":
        return icons.checkBold;
      case "info":
        return icons.informationOutline;
      default:
        return icons.alertOutline;
    }
  })();

  const closeAlert = () => toastAlert.set(toast => ({ ...toast, open: false }));
  const timeout = alert.timeout ?? 2000;

  return (
    <Box sx={{ textAlign: "center" }}>
      <Snackbar
        open={alert.open}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={timeout < 0 ? null : timeout}
        onClose={(_event, reason) => {
          if (reason !== "clickaway") {
            closeAlert();
          }
        }}
      >
        <Alert
          variant="filled"
          severity={severity(alert.color)}
          icon={icon ? <MdiIcon path={icon} /> : false}
          sx={{ alignItems: "center", minWidth: { sm: 344 } }}
          action={(
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                alert.action?.onClick();
                closeAlert();
              }}
            >
              {alert.action?.message ?? t("general.close")}
            </Button>
          )}
        >
          {alert.title}
          {alert.title ? " " : ""}
          {alert.text}
        </Alert>
      </Snackbar>
      <Snackbar open={loading.open} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <SnackbarContent
          sx={{ bgcolor: `${severity(loading.color)}.main`, py: 1 }}
          message={(
            <Box
              sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minWidth: 280 }}
              onClick={() => toastLoading.set(toast => ({ ...toast, open: false }))}
            >
              <Box sx={{ mb: 1, mt: 0, typography: "subtitle1", textAlign: "center" }}>
                {loading.text}
              </Box>
              <LinearProgress color="inherit" sx={{ width: "100%" }} />
            </Box>
          )}
        />
      </Snackbar>
    </Box>
  );
}
