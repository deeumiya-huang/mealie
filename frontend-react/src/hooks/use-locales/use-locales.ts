import { useI18n } from "@/i18n";
import { LOCALES } from "./available-locales";

/**
 * Port of composables/use-locales/use-locales.ts. Vue's writable `locale` computed becomes
 * `locale` + `setLocale(code)`; MUI needs no separate locale sync (Vue synced Vuetify's locale here).
 */
export const useLocales = () => {
  const i18n = useI18n();

  return {
    locale: i18n.locale,
    setLocale: i18n.setLocale,
    locales: LOCALES,
    i18n,
  };
};
