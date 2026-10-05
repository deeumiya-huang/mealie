// Usage: <AppLoader /> · <AppLoader small /> · <AppLoader large waitingText={t("…")} /> · <AppLoader>{node}</AppLoader>
// Spinning ring around the Mealie icon; shows "Loading" (general.loading) unless small/tiny.
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { MdiIcon } from "./MdiIcon";

interface AppLoaderProps {
  /** Accepted for parity with the Vue props (the loader is always shown while rendered). */
  loading?: boolean;
  tiny?: boolean;
  small?: boolean;
  medium?: boolean;
  large?: boolean;
  waitingText?: string;
  children?: ReactNode;
}

export function AppLoader({ tiny = false, small = false, large = false, waitingText, children }: AppLoaderProps) {
  const { t } = useI18n();
  const size = tiny
    ? { width: 2, icon: 0, size: 25 }
    : small
      ? { width: 2, icon: 30, size: 50 }
      : large
        ? { width: 4, icon: 120, size: 200 }
        : { width: 3, icon: 75, size: 125 };
  const text = waitingText ?? t("general.loading");
  // MUI's thickness is relative to a 44px viewBox; Vuetify's width is in px
  const thickness = (size.width * 44) / size.size;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mx: "auto", my: 1.5 }}>
      <Box sx={{ textAlign: "center" }}>
        <Box sx={{ position: "relative", display: "inline-flex", color: "primary.light" }}>
          <CircularProgress size={size.size} thickness={thickness} color="inherit" />
          {size.icon > 0 && (
            <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MdiIcon path={icons.primary} size={size.icon} />
            </Box>
          )}
        </Box>
        <Box sx={large ? { fontSize: "1.375rem", mt: 2.5 } : { fontSize: "1rem", mt: 1.5 }}>
          {children ?? ((small || tiny) ? "" : text)}
        </Box>
      </Box>
    </Box>
  );
}
