import i18next from "i18next";

// The app-wide i18next instance (initialised by the I18nProvider / test setup).
export const i18n = i18next.createInstance();

export type TranslateParams = Record<string, unknown>;

export interface GlobalI18n {
  t: (key: string, params?: TranslateParams) => string;
}

/**
 * Translation outside React components (validators, plain modules).
 * Port of composables/use-global-i18n.ts; not a React hook, so it has no `use` prefix.
 */
export function getGlobalI18n(): GlobalI18n {
  return {
    t: (key, params) => i18n.t(key, params ?? {}),
  };
}
