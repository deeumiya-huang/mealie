import { useMediaQuery, useTheme } from "@mui/material";

/**
 * Port of Vuetify `useDisplay()` with the same names. Breakpoints are Vuetify's (0/600/960/1280/1920),
 * configured in providers/theme.ts.
 */
export function useDisplay() {
  const theme = useTheme();
  const { values } = theme.breakpoints;
  const width = (min: number) => `(min-width:${min}px)`;

  const smUp = useMediaQuery(width(values.sm), { noSsr: true });
  const mdUp = useMediaQuery(width(values.md), { noSsr: true });
  const lgUp = useMediaQuery(width(values.lg), { noSsr: true });
  const xlUp = useMediaQuery(width(values.xl), { noSsr: true });

  const xs = !smUp;
  const sm = smUp && !mdUp;
  const md = mdUp && !lgUp;
  const lg = lgUp && !xlUp;
  const xl = xlUp;

  return {
    xs,
    sm,
    md,
    lg,
    xl,
    smAndDown: !mdUp,
    smAndUp: smUp,
    mdAndDown: !lgUp,
    mdAndUp: mdUp,
    lgAndDown: !xlUp,
    lgAndUp: lgUp,
    xlAndUp: xlUp,
    mobile: !lgUp,
    name: xs ? "xs" : sm ? "sm" : md ? "md" : lg ? "lg" : "xl",
  } as const;
}
