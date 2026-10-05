// Locale files and locale selection, as configured for @nuxtjs/i18n in frontend/nuxt.config.ts:
// strategy no_prefix, lazy messages, browser-language detection remembered in the `i18n_redirected`
// cookie, fallback en-US. Messages are merged like frontend/app/lang/locales/<code>.ts.
import { LOCALES } from "@/hooks/use-locales/available-locales";
import type { DateTimeFormats } from "./compat";

export const DEFAULT_LOCALE = "en-US";
export const LOCALE_COOKIE = "i18n_redirected";

export type Messages = Record<string, unknown>;

type JsonModule = { default: Messages };

const messageLoaders = import.meta.glob<JsonModule>("@locales/messages/*.json");
const unitLoaders = import.meta.glob<JsonModule>("@unit-locales/*.json");
const dateTimeFormatFiles = import.meta.glob<Record<string, DateTimeFormats>>(
  "@locales/dateTimeFormats/*.json",
  { eager: true, import: "default" },
);

function byLocale<T>(files: Record<string, T>, code: string): T | undefined {
  const suffix = `/${code}.json`;
  const path = Object.keys(files).find(file => file.endsWith(suffix));
  return path ? files[path] : undefined;
}

export const LOCALE_CODES = LOCALES.map(locale => locale.value);

export function isLocaleCode(code: string | null | undefined): code is string {
  return !!code && LOCALE_CODES.includes(code);
}

export function getLocaleDir(code: string): "ltr" | "rtl" {
  return LOCALES.find(locale => locale.value === code)?.dir ?? "ltr";
}

export function getDateTimeFormats(code: string): DateTimeFormats | undefined {
  return byLocale(dateTimeFormatFiles, code) as DateTimeFormats | undefined;
}

/** Loads `messages/<code>.json` with the backend's unit names merged in as `unit-names`. */
export async function loadLocaleMessages(code: string): Promise<Messages> {
  const loadMessages = byLocale(messageLoaders, code);
  const loadUnits = byLocale(unitLoaders, code);
  if (!loadMessages) {
    throw new Error(`Unknown locale: ${code}`);
  }
  const [messages, units] = await Promise.all([loadMessages(), loadUnits?.()]);
  return { ...messages.default, "unit-names": units?.default ?? {} };
}

export function readLocaleCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function writeLocaleCookie(code: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Best match of the browser languages against the available locales: an exact code first
 * (case-insensitive, in browser preference order), then the first one with the same language.
 */
export function matchBrowserLocale(browserLanguages: readonly string[]): string | null {
  const lower = (code: string) => code.toLowerCase();
  for (const language of browserLanguages) {
    const exact = LOCALE_CODES.find(code => lower(code) === lower(language));
    if (exact) return exact;
  }
  for (const language of browserLanguages) {
    const prefix = lower(language).split("-")[0];
    const sameLanguage = LOCALE_CODES.find(code => lower(code).split("-")[0] === prefix);
    if (sameLanguage) return sameLanguage;
  }
  return null;
}

/** Cookie → browser language → en-US; the detected locale is remembered in the cookie. */
export function detectLocale(): string {
  const fromCookie = readLocaleCookie();
  if (isLocaleCode(fromCookie)) {
    return fromCookie;
  }
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const detected = matchBrowserLocale(languages) ?? DEFAULT_LOCALE;
  writeLocaleCookie(detected);
  return detected;
}
