import { loadAppInfo } from "~/lib/app-info";
import { initI18n } from "~/i18n";
import { fetchThemeConfig } from "~/theme/theme";
import type { ThemeConfig } from "~/theme/theme";
import { authBackend } from "./services";

export interface BootstrapResult {
  themeConfig: ThemeConfig | undefined;
}

/**
 * Everything the Nuxt plugins did before the first render: app info (`app-info.client.ts`), theme
 * colors (`theme.ts`), locale messages (@nuxtjs/i18n) and the session (`init-auth.client.ts`).
 */
export async function bootstrap(): Promise<BootstrapResult> {
  const [themeConfig] = await Promise.all([
    fetchThemeConfig(),
    loadAppInfo().catch((e) => {
      console.error("Failed to load app info", e);
    }),
    initI18n(),
  ]);

  console.debug("Initializing auth");
  // Must come first: it hydrates the token from the cookie, which getSession checks before it
  // will bother asking the server who we are.
  authBackend.initTokenRefresh();
  await authBackend.getSession();
  console.debug("Auth initialized");

  return { themeConfig };
}
