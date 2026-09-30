import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "./Icon";

export interface AppLoaderProps {
  loading?: boolean;
  tiny?: boolean;
  small?: boolean;
  medium?: boolean;
  large?: boolean;
  waitingText?: string;
  children?: ReactNode;
}

export function AppLoader({ tiny = false, small = false, large = false, waitingText, children }: AppLoaderProps) {
  const i18n = useI18n();
  const size = tiny
    ? { width: 2, icon: 0, size: 25 }
    : small
      ? { width: 2, icon: 30, size: 50 }
      : large
        ? { width: 4, icon: 120, size: 200 }
        : { width: 3, icon: 75, size: 125 };
  const text = waitingText ?? i18n.t("general.loading");

  return (
    <Box sx={{ mx: "auto", my: 1.5, display: "flex", justifyContent: "center" }}>
      <Box sx={{ textAlign: "center" }}>
        <Box sx={{ position: "relative", display: "inline-flex", color: "primary.light" }}>
          <CircularProgress size={size.size} thickness={(size.width / size.size) * 44} color="inherit" />
          {size.icon > 0 && (
            <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon path={icons.primary} size={size.icon} color="primary" />
            </Box>
          )}
        </Box>
        <Typography variant={large ? "h6" : "body1"} sx={{ mt: large ? 2.5 : 1.5 }}>
          {children ?? (small || tiny ? "" : text)}
        </Typography>
      </Box>
    </Box>
  );
}

export default AppLoader;
