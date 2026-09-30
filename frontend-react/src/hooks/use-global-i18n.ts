import { useTranslation } from "react-i18next";
import { currentLocale, formatDate, i18n, setLocale, translate, translationExists } from "~/i18n";
import type { MessageParams } from "~/i18n/format";

export type TranslateFn = (key: string, paramsOrPlural?: MessageParams | number, plural?: number) => string;

/**
 * The subset of the vue-i18n Composer API the app uses. `t` accepts vue-i18n's argument shapes:
 * `t(key)`, `t(key, params)`, `t(key, plural)` and `t(key, params, plural)`.
 */
export interface I18nComposer {
  t: TranslateFn;
  te: (key: string) => boolean;
  d: (value: Date | number | string, format?: string) => string;
  readonly locale: string;
  setLocale: (code: string) => Promise<void>;
}

const composer: I18nComposer = {
  t: translate,
  te: translationExists,
  d: formatDate,
  get locale() {
    return currentLocale();
  },
  setLocale,
};

/**
 * Non-reactive access to the global i18n instance, usable outside React components (validators,
 * API helpers, stores). Components should call `useI18n()` so they re-render on locale changes.
 */
export function useGlobalI18n(): I18nComposer {
  return composer;
}

/** React hook: same API as `useGlobalI18n()`, and re-renders the caller when the locale changes. */
export function useI18n(): I18nComposer {
  // Subscribes to languageChanged/loaded events; the returned `t` is not used because messages
  // use vue-i18n syntax (see ~/i18n/format.ts).
  useTranslation(undefined, { i18n });
  return composer;
}
