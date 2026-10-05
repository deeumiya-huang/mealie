// Runtime constants: port of `runtimeConfig` in frontend/nuxt.config.ts.
// Values are fixed at build time, like the statically generated Nuxt app.
const env = import.meta.env;

export const AUTH_TOKEN = "mealie.access_token";
export const GLOBAL_MIDDLEWARE = env.GLOBAL_MIDDLEWARE || undefined;
export const SUB_PATH = env.SUB_PATH || "";

export interface ThemeColors {
  primary: string;
  accent: string;
  secondary: string;
  success: string;
  info: string;
  warning: string;
  error: string;
  background?: string;
}

export const useDark = Boolean(env.THEME_USE_DARK) || false;

export const themes: { dark: ThemeColors; light: ThemeColors } = {
  dark: {
    primary: env.THEME_DARK_PRIMARY || "#E58325",
    accent: env.THEME_DARK_ACCENT || "#007A99",
    secondary: env.THEME_DARK_SECONDARY || "#973542",
    success: env.THEME_DARK_SUCCESS || "#43A047",
    info: env.THEME_DARK_INFO || "#1976d2",
    warning: env.THEME_DARK_WARNING || "#FF6D00",
    error: env.THEME_DARK_ERROR || "#EF5350",
    background: "#1E1E1E",
  },
  light: {
    primary: env.THEME_LIGHT_PRIMARY || "#E58325",
    accent: env.THEME_LIGHT_ACCENT || "#007A99",
    secondary: env.THEME_LIGHT_SECONDARY || "#973542",
    success: env.THEME_LIGHT_SUCCESS || "#43A047",
    info: env.THEME_LIGHT_INFO || "#1976d2",
    warning: env.THEME_LIGHT_WARNING || "#FF6D00",
    error: env.THEME_LIGHT_ERROR || "#EF5350",
  },
};
