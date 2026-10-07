import { createTheme, type Theme } from "@mui/material/styles";
import { themes } from "@/config";

/**
 * Port of plugins/theme.ts: the colours come from `/api/app/about/theme` (admin-configurable via
 * env on the backend) with the nuxt.config defaults as fallback. Breakpoints are Vuetify's.
 */
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

declare module "@mui/material/styles" {
  interface Palette {
    accent: Palette["primary"];
  }
  interface PaletteOptions {
    accent?: PaletteOptions["primary"];
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    accent: true;
  }
}

declare module "@mui/material/IconButton" {
  interface IconButtonPropsColorOverrides {
    accent: true;
  }
}

declare module "@mui/material/Badge" {
  interface BadgePropsColorOverrides {
    accent: true;
  }
}

declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    accent: true;
  }
}

declare module "@mui/material/SvgIcon" {
  interface SvgIconPropsColorOverrides {
    accent: true;
  }
}

let cachedTheme: Promise<ThemeConfig | undefined> | null = null;

export function fetchTheme(): Promise<ThemeConfig | undefined> {
  cachedTheme ??= fetch("/api/app/about/theme")
    .then(response => response.json() as Promise<ThemeConfig>)
    .catch(() => undefined);
  return cachedTheme;
}

export const VUETIFY_BREAKPOINTS = { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 };

export function buildTheme(dark: boolean, config?: ThemeConfig): Theme {
  const colors = dark
    ? {
        primary: config?.darkPrimary ?? themes.dark.primary,
        accent: config?.darkAccent ?? themes.dark.accent,
        secondary: config?.darkSecondary ?? themes.dark.secondary,
        success: config?.darkSuccess ?? themes.dark.success,
        info: config?.darkInfo ?? themes.dark.info,
        warning: config?.darkWarning ?? themes.dark.warning,
        error: config?.darkError ?? themes.dark.error,
      }
    : {
        primary: config?.lightPrimary ?? themes.light.primary,
        accent: config?.lightAccent ?? themes.light.accent,
        secondary: config?.lightSecondary ?? themes.light.secondary,
        success: config?.lightSuccess ?? themes.light.success,
        info: config?.lightInfo ?? themes.light.info,
        warning: config?.lightWarning ?? themes.light.warning,
        error: config?.lightError ?? themes.light.error,
      };

  return createTheme({
    breakpoints: { values: VUETIFY_BREAKPOINTS },
    palette: {
      mode: dark ? "dark" : "light",
      primary: { main: colors.primary },
      secondary: { main: colors.secondary },
      success: { main: colors.success },
      info: { main: colors.info },
      warning: { main: colors.warning },
      error: { main: colors.error },
      accent: { main: colors.accent, contrastText: "#FFFFFF" },
      ...(dark ? { background: { default: themes.dark.background ?? "#1E1E1E", paper: "#1E1E1E" } } : {}),
    },
    typography: {
      fontFamily: "Roboto, sans-serif",
    },
    components: {
      // Vuetify's v-container pads 16px on every side; MUI's Container only has side gutters.
      MuiContainer: {
        styleOverrides: {
          root: { paddingTop: 16, paddingBottom: 16 },
        },
      },
    },
  });
}
