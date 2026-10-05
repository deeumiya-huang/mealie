// vue-i18n message semantics on top of i18next resources (PROCESS.md §1.6, decision D2).
// The locale JSON files are vue-i18n messages: `{name}` / `{0}` interpolation and `a | b | c` plurals.
// i18next only stores the resources and tracks the language; formatting happens here so `t()` behaves
// exactly like vue-i18n's `t()` in the Vue app.

export type NamedValues = Record<string, unknown>;
export type ListValues = unknown[];
export type TranslateValues = NamedValues | ListValues;

/**
 * vue-i18n `t()` overloads used by the app:
 * `t(key)`, `t(key, count)`, `t(key, [list])`, `t(key, { named })`, `t(key, named | list, count)`.
 */
export interface TranslateFn {
  (key: string, values?: TranslateValues | number): string;
  (key: string, values: TranslateValues, count: number): string;
}

export type DateFormatKey = "short" | "medium" | "long" | "time";
export type DateTimeFormats = Record<string, Intl.DateTimeFormatOptions>;

/** vue-i18n `d()`: a date (Date, epoch ms or ISO string) formatted with a named locale format. */
export type DateFn = (value: Date | number | string, format?: DateFormatKey | string) => string;

/** Looks a key up in a locale's messages (dotted path); undefined when missing or not a string. */
export type MessageResolver = (locale: string, key: string) => string | undefined;

/** vue-i18n's default plural rule (`getPluralIndex` in @intlify/core-base), used for every locale. */
export function pluralIndex(choice: number, choicesLength: number): number {
  const abs = Math.abs(choice);
  if (choicesLength === 2) {
    if (!abs) return 1;
    return abs > 1 ? 1 : 0;
  }
  return abs ? Math.min(abs, 2) : 0;
}

function toDisplayString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

/** Replaces `{name}` / `{0}` placeholders; a missing value renders as "" (vue-i18n behaviour). */
export function interpolate(message: string, values: NamedValues): string {
  return message.replace(/\{\s*([^{}\s]+)\s*\}/g, (_match, name: string) => toDisplayString(values[name]));
}

/**
 * Formats one vue-i18n message. `plural` picks the choice of a `a | b | c` message; when it is not
 * given vue-i18n uses index -1, i.e. the same choice as 1. With a plural number, `count` and `n` are
 * available to the message unless the caller passed them.
 */
export function formatMessage(message: string, values: TranslateValues = {}, plural?: number): string {
  const named: NamedValues = Array.isArray(values) ? { ...values } : { ...values };
  if (typeof plural === "number") {
    named.count ??= plural;
    named.n ??= plural;
  }

  let chosen = message;
  if (message.includes("|")) {
    const choices = message.split("|").map(choice => choice.trim());
    chosen = choices[pluralIndex(plural ?? -1, choices.length)] ?? "";
  }
  return interpolate(chosen, named);
}

/** Normalises the `t()` arguments into values + plural count. */
export function parseTranslateArgs(arg1?: TranslateValues | number, arg2?: number): { values: TranslateValues; plural?: number } {
  if (typeof arg1 === "number") {
    return { values: {}, plural: arg1 };
  }
  return { values: arg1 ?? {}, plural: arg2 };
}

/**
 * Builds a vue-i18n compatible `t`: looks the key up in `locale`, then in each fallback locale;
 * a key missing everywhere renders as the key itself.
 */
export function createTranslate(resolve: MessageResolver, getLocales: () => string[]): TranslateFn {
  return ((key: string, arg1?: TranslateValues | number, arg2?: number) => {
    const { values, plural } = parseTranslateArgs(arg1, arg2);
    for (const locale of getLocales()) {
      const message = resolve(locale, key);
      if (message !== undefined) {
        return formatMessage(message, values, plural);
      }
    }
    return key;
  }) as TranslateFn;
}

function toDate(value: Date | number | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Builds a vue-i18n compatible `d`: without a format the locale's default (numeric date); a named
 * format comes from the locale's `dateTimeFormats/<code>.json`, falling back like messages do.
 */
export function createDateFormat(
  getFormats: (locale: string) => DateTimeFormats | undefined,
  getLocales: () => string[],
): DateFn {
  return (value, format) => {
    const locales = getLocales();
    const date = toDate(value);
    if (!format) {
      return new Intl.DateTimeFormat(locales[0]).format(date);
    }
    for (const locale of locales) {
      const options = getFormats(locale)?.[format];
      if (options) {
        return new Intl.DateTimeFormat(locale, options).format(date);
      }
    }
    return "";
  };
}
