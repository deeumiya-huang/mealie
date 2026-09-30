import i18next from "i18next";
import type { i18n as I18nextInstance } from "i18next";
import enUSMessages from "@mealie-lang/messages/en-US.json";
import enUSUnitNames from "@mealie-unit-locales/en-US.json";
import { LOCALES } from "@mealie-locales";
import { formatMessage } from "./format";
import type { MessageParams } from "./format";

export const DEFAULT_LOCALE = "en-US";
/** Same cookie @nuxtjs/i18n used (detectBrowserLanguage.useCookie), so an existing choice carries over. */
export const LOCALE_COOKIE = "i18n_redirected";

type Messages = Record<string, unknown>;
type JsonModule = { default: Messages };

// Locale files are shared with the Vue app and must never be edited here (Crowdin owns them).
const messageLoaders = import.meta.glob<JsonModule>("../../../frontend/app/lang/messages/*.json");
const unitNameLoaders = import.meta.glob<JsonModule>("../../../mealie/repos/seed/resources/units/locales/*.json");
const dateTimeFormatModules = import.meta.glob<JsonModule>("../../../frontend/app/lang/dateTimeFormats/*.json", { eager: true });

function codeFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.json$/, "");
}

function byCode<T>(modules: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(modules).map(([path, mod]) => [codeFromPath(path), mod]));
}

const messagesByCode = byCode(messageLoaders);
const unitNamesByCode = byCode(unitNameLoaders);
const dateTimeFormats = Object.fromEntries(
  Object.entries(byCode(dateTimeFormatModules)).map(([code, mod]) => [code, mod.default]),
) as Record<string, Record<string, Intl.DateTimeFormatOptions>>;

/** Locale codes that have a messages file, i.e. the ones @nuxtjs/i18n was configured with. */
export const availableLocaleCodes: string[] = Object.keys(messagesByCode).sort();

export function localeDirection(code: string): "ltr" | "rtl" {
  return LOCALES.find(l => l.value === code)?.dir === "rtl" ? "rtl" : "ltr";
}

export const i18n: I18nextInstance = i18next.createInstance();

void i18n.init({
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  resources: {
    [DEFAULT_LOCALE]: { translation: { ...enUSMessages, "unit-names": enUSUnitNames } },
  },
  keySeparator: ".",
  nsSeparator: false,
  returnNull: false,
  returnEmptyString: false,
  // Messages use vue-i18n syntax ({name}, "a | b" plurals); formatting is done in ./format.ts.
  interpolation: { escapeValue: false },
  initAsync: false,
  react: { useSuspense: false },
});

const loaded = new Set<string>([DEFAULT_LOCALE]);

export async function loadLocaleMessages(code: string): Promise<void> {
  if (loaded.has(code) || !messagesByCode[code]) {
    return;
  }
  const [messages, unitNames] = await Promise.all([
    messagesByCode[code](),
    unitNamesByCode[code]?.() ?? Promise.resolve({ default: {} }),
  ]);
  i18n.addResourceBundle(code, "translation", { ...messages.default, "unit-names": unitNames.default }, true, true);
  loaded.add(code);
}

export function resolveLocale(candidate: string | null | undefined): string | null {
  if (!candidate) {
    return null;
  }
  if (messagesByCode[candidate]) {
    return candidate;
  }
  const lang = candidate.split("-")[0]?.toLowerCase();
  return availableLocaleCodes.find(code => code.split("-")[0]?.toLowerCase() === lang) ?? null;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** Cookie first, then the browser's languages, then en-US: the same order @nuxtjs/i18n used. */
export function detectInitialLocale(): string {
  const fromCookie = resolveLocale(readCookie(LOCALE_COOKIE));
  if (fromCookie) {
    return fromCookie;
  }
  for (const lang of navigator.languages ?? [navigator.language]) {
    const match = resolveLocale(lang);
    if (match) {
      return match;
    }
  }
  return DEFAULT_LOCALE;
}

function applyDocumentLocale(code: string) {
  document.documentElement.lang = code;
  document.documentElement.dir = localeDirection(code);
}

export async function setLocale(code: string): Promise<void> {
  const resolved = resolveLocale(code) ?? DEFAULT_LOCALE;
  await loadLocaleMessages(resolved);
  await i18n.changeLanguage(resolved);
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(resolved)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  applyDocumentLocale(resolved);
}

export async function initI18n(): Promise<void> {
  const code = detectInitialLocale();
  await loadLocaleMessages(code);
  await i18n.changeLanguage(code);
  applyDocumentLocale(code);
}

export function currentLocale(): string {
  return i18n.language || DEFAULT_LOCALE;
}

/** Raw (unformatted) message lookup with en-US fallback; returns the key when missing, like vue-i18n. */
function rawMessage(key: string): string | null {
  const value = i18n.t(key, { skipInterpolation: true, returnObjects: false, defaultValue: "" });
  return typeof value === "string" && value !== "" ? value : null;
}

export function translate(key: string, paramsOrPlural?: MessageParams | number, plural?: number): string {
  const raw = rawMessage(key);
  if (raw === null) {
    return key;
  }
  return formatMessage(raw, paramsOrPlural, plural);
}

export function translationExists(key: string): boolean {
  return rawMessage(key) !== null;
}

export function formatDate(value: Date | number | string, format?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const code = currentLocale();
  const options = format ? (dateTimeFormats[code]?.[format] ?? dateTimeFormats[DEFAULT_LOCALE]?.[format]) : undefined;
  try {
    return new Intl.DateTimeFormat(code, options).format(date);
  }
  catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(date);
  }
}
