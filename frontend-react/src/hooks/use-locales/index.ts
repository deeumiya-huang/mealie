import { LOCALES } from "@mealie-locales";
import { availableLocaleCodes } from "~/i18n";
import { getGlobalI18n } from "~/hooks/use-global-i18n";

export { LOCALES };

/**
 * Locale list and the current locale. Not a React hook (safe to call anywhere); components that
 * must re-render on a locale change also call `useI18n()`.
 */
export const useLocales = () => {
  const i18n = getGlobalI18n();
  return {
    get locale() {
      return i18n.locale;
    },
    setLocale: (code: string) => i18n.setLocale(code),
    locales: LOCALES,
    /** Codes the app ships messages for (`i18n.locales` in @nuxtjs/i18n). */
    availableLocaleCodes,
    i18n,
  };
};
