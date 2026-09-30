import { alpha, createTheme } from "@mui/material/styles";
import type { PaletteColor, PaletteColorOptions, Theme } from "@mui/material/styles";
import * as muiLocales from "@mui/material/locale";

declare module "@mui/material/styles" {
  interface Palette {
    accent: PaletteColor;
    grey2: PaletteColor;
  }
  interface PaletteOptions {
    accent?: PaletteColorOptions;
    grey2?: PaletteColorOptions;
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    accent: true;
    grey2: true;
  }
}
declare module "@mui/material/IconButton" {
  interface IconButtonPropsColorOverrides {
    accent: true;
    grey2: true;
  }
}
declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    accent: true;
    grey2: true;
  }
}
declare module "@mui/material/SvgIcon" {
  interface SvgIconPropsColorOverrides {
    accent: true;
    grey2: true;
  }
}
declare module "@mui/material/Fab" {
  interface FabPropsColorOverrides {
    accent: true;
    grey2: true;
  }
}
declare module "@mui/material/Badge" {
  interface BadgePropsColorOverrides {
    accent: true;
  }
}
declare module "@mui/material/LinearProgress" {
  interface LinearProgressPropsColorOverrides {
    accent: true;
  }
}
declare module "@mui/material/CircularProgress" {
  interface CircularProgressPropsColorOverrides {
    accent: true;
  }
}
declare module "@mui/material/Switch" {
  interface SwitchPropsColorOverrides {
    accent: true;
  }
}
declare module "@mui/material/Checkbox" {
  interface CheckboxPropsColorOverrides {
    accent: true;
  }
}

/** Response of /api/app/about/theme (was fetched by the Nuxt `theme` plugin). */
export interface ThemeConfig {
  lightPrimary: string;
  lightAccent: string;
  lightSecondary: string;
  lightSuccess: string;
  lightInfo: string;
  lightWarning: string;
  lightError: string;
  darkPrimary: string;
  darkAccent: string;
  darkSecondary: string;
  darkSuccess: string;
  darkInfo: string;
  darkWarning: string;
  darkError: string;
}

export async function fetchThemeConfig(): Promise<ThemeConfig | undefined> {
  try {
    const response = await fetch("/api/app/about/theme");
    return (await response.json()) as ThemeConfig;
  }
  catch {
    return undefined;
  }
}

export type ThemeMode = "light" | "dark";

/** Vuetify color names used throughout the app as `color` props. */
export type VColor = "primary" | "secondary" | "accent" | "success" | "info" | "warning" | "error";

export const THEME_COLORS: VColor[] = ["primary", "secondary", "accent", "success", "info", "warning", "error"];

export function isThemeColor(color: string | null | undefined): color is VColor {
  return !!color && (THEME_COLORS as string[]).includes(color);
}

const MUI_LOCALE_ALIASES: Record<string, keyof typeof muiLocales> = { "no-NO": "nbNO", "sr-SP": "srRS", "fr-BE": "frFR", "fr-CA": "frFR", "en-GB": "enUS" };

/** MUI's built-in component strings (pagination etc.), which Vuetify took from its own locale packs. */
function muiLocaleFor(code: string) {
  const key = (MUI_LOCALE_ALIASES[code] ?? code.replace("-", "")) as keyof typeof muiLocales;
  return muiLocales[key] ?? muiLocales.enUS;
}

export function createMealieTheme(mode: ThemeMode, config: ThemeConfig | undefined, direction: "ltr" | "rtl", localeCode = "en-US"): Theme {
  const dark = mode === "dark";
  const pick = (light: keyof ThemeConfig, darkKey: keyof ThemeConfig, fallback: string) =>
    (dark ? config?.[darkKey] : config?.[light]) ?? fallback;

  return createTheme({
    direction,
    // Vuetify's breakpoints, so `cols/sm/md/lg` props translate 1:1 to Grid sizes.
    breakpoints: { values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 } },
    palette: {
      mode,
      primary: { main: pick("lightPrimary", "darkPrimary", "#E58325"), contrastText: "#fff" },
      accent: { main: pick("lightAccent", "darkAccent", "#007A99"), contrastText: "#fff" },
      secondary: { main: pick("lightSecondary", "darkSecondary", "#973542"), contrastText: "#fff" },
      success: { main: pick("lightSuccess", "darkSuccess", "#43A047"), contrastText: "#fff" },
      info: { main: pick("lightInfo", "darkInfo", "#1976d2"), contrastText: "#fff" },
      warning: { main: pick("lightWarning", "darkWarning", "#FF6D00"), contrastText: "#fff" },
      error: { main: pick("lightError", "darkError", "#EF5350"), contrastText: "#fff" },
      grey2: { main: dark ? "#9e9e9e" : "#757575", contrastText: "#fff" },
      ...(dark ? { background: { default: "#1E1E1E", paper: "#1E1E1E" } } : {}),
    },
    typography: {
      fontFamily: "\"Roboto\", sans-serif",
      button: { textTransform: "none" },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: false } },
      MuiTab: { styleOverrides: { root: { textTransform: "none" } } },
      MuiCard: { defaultProps: { elevation: 2 } },
      MuiTextField: { defaultProps: { variant: "outlined", size: "small" } },
      MuiAutocomplete: { defaultProps: { size: "small" } },
      MuiSelect: { defaultProps: { size: "small" } },
      MuiTooltip: { defaultProps: { arrow: false } },
      MuiPaper: dark ? { styleOverrides: { root: { backgroundImage: "none" } } } : {},
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: dark ? "#1E1E1E" : undefined },
        },
      },
    },
  }, muiLocaleFor(localeCode));
}

/** CSS color for a Vuetify-style color name (theme color or any CSS color), for `sx` usage. */
export function cssColor(theme: Theme, color: string | null | undefined, fallback = "inherit"): string {
  if (!color) return fallback;
  if (isThemeColor(color)) return theme.palette[color].main;
  if (color === "grey" || color === "gray") return theme.palette.grey2.main;
  if (color === "white") return "#fff";
  if (color === "black") return "#000";
  return color;
}

export function tonal(theme: Theme, color: string | null | undefined, opacity = 0.12): string {
  const base = cssColor(theme, color, theme.palette.text.primary);
  try {
    return alpha(base, opacity);
  }
  catch {
    return base;
  }
}
