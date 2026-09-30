import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Snackbar from "@mui/material/Snackbar";
import { icons } from "~/lib/icons";
import { useStore } from "~/lib/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { toastAlert, toastLoading } from "~/hooks/use-toast";
import { Icon } from "~/components/global/Icon";

type Severity = "error" | "success" | "info" | "warning";

export function TheSnackbar() {
  const i18n = useI18n();
  const alert = useStore(toastAlert);
  const loading = useStore(toastLoading);
  const icon = alert.color === "success" ? icons.checkBold : alert.color === "info" ? icons.informationOutline : icons.alertOutline;
  const severity = (["error", "success", "info", "warning"].includes(alert.color) ? alert.color : "info") as Severity;

  return (
    <div>
      <Snackbar
        open={alert.open}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={alert.timeout === -1 ? null : (alert.timeout ?? 2000)}
        onClose={(_e, reason) => {
          if (reason !== "clickaway") toastAlert.patch({ open: false });
        }}
      >
        <Alert
          variant="filled"
          severity={severity}
          icon={<Icon path={icon} />}
          sx={{ width: "100%", alignItems: "center" }}
          action={(
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                alert.action?.onClick();
                toastAlert.patch({ open: false });
              }}
            >
              {alert.action?.message ?? i18n.t("general.close")}
            </Button>
          )}
        >
          {alert.title} {alert.text}
        </Alert>
      </Snackbar>
      <Snackbar open={loading.open} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert variant="filled" severity={(["error", "success", "info", "warning"].includes(loading.color) ? loading.color : "info") as Severity} icon={false} sx={{ py: 1 }}>
          <Box
            sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minWidth: 240 }}
            onClick={() => toastLoading.patch({ open: false })}
          >
            <Box sx={{ mb: 1, mt: 0, typography: "subtitle1", textAlign: "center" }}>{loading.text}</Box>
            <LinearProgress color="inherit" sx={{ width: "100%" }} />
          </Box>
        </Alert>
      </Snackbar>
    </div>
  );
}

export default TheSnackbar;
