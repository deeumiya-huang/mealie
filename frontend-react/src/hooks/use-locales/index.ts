import { LOCALES } from "@mealie-locales";
import { availableLocaleCodes } from "~/i18n";
import { useI18n } from "~/hooks/use-global-i18n";

export { LOCALES };

export const useLocales = () => {
  const i18n = useI18n();
  return {
    locale: i18n.locale,
    setLocale: (code: string) => i18n.setLocale(code),
    locales: LOCALES,
    /** Codes the app ships messages for (`i18n.locales` in @nuxtjs/i18n). */
    availableLocaleCodes,
    i18n,
  };
};
