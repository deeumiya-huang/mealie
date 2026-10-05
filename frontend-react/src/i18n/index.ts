import { useMemo } from "react";
import i18next from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import { createDateFormat, createTranslate, type DateFn, type TranslateFn } from "./compat";
import {
  DEFAULT_LOCALE,
  detectLocale,
  getDateTimeFormats,
  getLocaleDir,
  isLocaleCode,
  loadLocaleMessages,
  writeLocaleCookie,
  type Messages,
} from "./locales";

export type { DateFn, DateFormatKey, TranslateFn, TranslateValues } from "./compat";
export { DEFAULT_LOCALE } from "./locales";

/**
 * The app-wide i18next instance. It stores the vue-i18n messages and tracks the language;
 * `t`/`d` below format them with vue-i18n semantics (./compat.ts). Inside components use `useI18n()`,
 * elsewhere `getGlobalI18n()`.
 */
export const i18n = i18next.createInstance();

const NAMESPACE = "translation";

function localeChain(): string[] {
  const current = i18n.language;
  return current && current !== DEFAULT_LOCALE ? [current, DEFAULT_LOCALE] : [DEFAULT_LOCALE];
}

function resolveMessage(locale: string, key: string): string | undefined {
  const message: unknown = i18n.getResource(locale, NAMESPACE, key);
  return typeof message === "string" ? message : undefined;
}

/** vue-i18n `t()` in the current locale (falls back to en-US, then to the key). */
export const t: TranslateFn = createTranslate(resolveMessage, localeChain);

/** vue-i18n `d()` with the `dateTimeFormats/<code>.json` formats. */
export const d: DateFn = createDateFormat(getDateTimeFormats, localeChain);

function applyHtmlAttributes(code: string) {
  document.documentElement.lang = code;
  document.documentElement.dir = getLocaleDir(code);
}

/** Initialises the i18next instance once (synchronously, without messages). */
export function ensureI18n() {
  if (i18n.isInitialized) return;
  i18n.use(initReactI18next);
  void i18n.init({
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    resources: {},
    initAsync: false,
    nsSeparator: false,
    returnNull: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  i18n.on("languageChanged", applyHtmlAttributes);
}

/** Adds (or replaces) a locale's messages, e.g. from the test setup. */
export function addLocaleMessages(code: string, messages: Messages) {
  ensureI18n();
  i18n.addResourceBundle(code, NAMESPACE, messages, false, true);
}

async function loadLocale(code: string) {
  if (!i18n.hasResourceBundle(code, NAMESPACE)) {
    addLocaleMessages(code, await loadLocaleMessages(code));
  }
}

/** Switches the language (port of `i18n.setLocale`): loads its messages and remembers it in the cookie. */
export async function setLocale(code: string): Promise<void> {
  if (!isLocaleCode(code)) return;
  ensureI18n();
  await loadLocale(code);
  await i18n.changeLanguage(code);
  writeLocaleCookie(code);
}

let initPromise: Promise<void> | null = null;

/** Loads en-US (the fallback) and the detected locale before the first render (I18nProvider). */
export function initI18n(): Promise<void> {
  initPromise ??= (async () => {
    ensureI18n();
    const code = detectLocale();
    await loadLocale(DEFAULT_LOCALE);
    await loadLocale(code);
    await i18n.changeLanguage(code);
  })();
  return initPromise;
}

export interface GlobalI18n {
  t: TranslateFn;
  d: DateFn;
  readonly locale: string;
}

/**
 * Translation outside React components (validators, plain modules).
 * Port of composables/use-global-i18n.ts; not a React hook, so it has no `use` prefix.
 */
export function getGlobalI18n(): GlobalI18n {
  return {
    t,
    d,
    get locale() {
      return i18n.language || DEFAULT_LOCALE;
    },
  };
}

export interface UseI18n {
  t: TranslateFn;
  d: DateFn;
  locale: string;
  setLocale: (code: string) => Promise<void>;
}

/**
 * Port of `useI18n()` / `$t` / `$d`. Re-renders on a language change; `t` and `d` get a new identity
 * per language so memoised values that depend on them recompute.
 */
export function useI18n(): UseI18n {
  const { i18n: instance } = useTranslation(NAMESPACE, { i18n });
  const locale = instance.language || DEFAULT_LOCALE;

  return useMemo(() => ({
    t: ((...args: Parameters<TranslateFn>) => t(...args)) as TranslateFn,
    d: (...args: Parameters<DateFn>) => d(...args),
    locale,
    setLocale,
  }), [locale]);
}
