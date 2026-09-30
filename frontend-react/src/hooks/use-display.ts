import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

/** Vuetify `useDisplay()` equivalent (breakpoints configured to Vuetify's in ~/theme/theme.ts). */
export function useDisplay() {
  const theme = useTheme();
  const xs = useMediaQuery(theme.breakpoints.only("xs"));
  const sm = useMediaQuery(theme.breakpoints.only("sm"));
  const md = useMediaQuery(theme.breakpoints.only("md"));
  const lg = useMediaQuery(theme.breakpoints.only("lg"));
  const xl = useMediaQuery(theme.breakpoints.up("xl"));
  return {
    xs,
    sm,
    md,
    lg,
    xl,
    smAndDown: xs || sm,
    smAndUp: !xs,
    mdAndDown: xs || sm || md,
    mdAndUp: md || lg || xl,
    lgAndUp: lg || xl,
    lgAndDown: !xl,
    mobile: xs || sm,
  };
}
