/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Build-time settings, same environment variables as frontend/nuxt.config.ts runtimeConfig
// (exposed through `envPrefix` in vite.config.ts).
interface ImportMetaEnv {
  readonly SUB_PATH?: string;
  readonly GLOBAL_MIDDLEWARE?: string;
  readonly THEME_USE_DARK?: string;
  readonly THEME_DARK_PRIMARY?: string;
  readonly THEME_DARK_ACCENT?: string;
  readonly THEME_DARK_SECONDARY?: string;
  readonly THEME_DARK_SUCCESS?: string;
  readonly THEME_DARK_INFO?: string;
  readonly THEME_DARK_WARNING?: string;
  readonly THEME_DARK_ERROR?: string;
  readonly THEME_LIGHT_PRIMARY?: string;
  readonly THEME_LIGHT_ACCENT?: string;
  readonly THEME_LIGHT_SECONDARY?: string;
  readonly THEME_LIGHT_SUCCESS?: string;
  readonly THEME_LIGHT_INFO?: string;
  readonly THEME_LIGHT_WARNING?: string;
  readonly THEME_LIGHT_ERROR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
