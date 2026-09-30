/**
 * vue-i18n compatible message formatting.
 *
 * The locale files are shared with the Vue app and use vue-i18n syntax:
 *  - named interpolation `{name}` and list interpolation `{0}`
 *  - literal interpolation `{'text'}`
 *  - pluralization with `|` separated choices, selected by the `plural` argument
 *
 * i18next's own syntax (`{{name}}`, `_one`/`_other` keys) is therefore not used.
 */

export type MessageParams = Record<string, unknown> | unknown[];

/**
 * vue-i18n's default plural rule. With no plural argument vue-i18n uses -1, whose absolute value
 * selects the singular form (index 0 for two choices, index 1 for three).
 */
export function pluralIndex(choice: number, choicesLength: number): number {
  const abs = Math.abs(choice);
  if (choicesLength === 2) {
    return abs ? (abs > 1 ? 1 : 0) : 1;
  }
  return abs ? Math.min(abs, 2) : 0;
}

function splitChoices(message: string): string[] {
  // Split on unescaped "|" outside of {...} placeholders.
  const choices: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of message) {
    if (char === "{") depth++;
    if (char === "}") depth = Math.max(0, depth - 1);
    if (char === "|" && depth === 0) {
      choices.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  choices.push(choices.length ? current.trim() : current);
  return choices;
}

export function interpolate(message: string, params: MessageParams = {}): string {
  return message.replace(/\{\s*('([^']*)'|[\w-]+)\s*\}/g, (match, token: string, literal: string | undefined) => {
    if (literal !== undefined) {
      return literal;
    }
    const value = Array.isArray(params) ? params[Number(token)] : params[token];
    if (value === undefined || value === null) {
      return Array.isArray(params) || !(token in params) ? match : "";
    }
    return String(value);
  });
}

export function formatMessage(message: string, paramsOrPlural?: MessageParams | number, plural?: number): string {
  let params: MessageParams = {};
  let choice: number | undefined = plural;
  if (typeof paramsOrPlural === "number") {
    choice = paramsOrPlural;
  }
  else if (paramsOrPlural) {
    params = paramsOrPlural;
  }

  const choices = splitChoices(message);
  let selected = message;
  if (choices.length > 1) {
    selected = choices[pluralIndex(choice ?? -1, choices.length)] ?? choices[choices.length - 1]!;
  }

  if (choice !== undefined && !Array.isArray(params)) {
    // vue-i18n implicitly provides {count} and {n} when a plural is given.
    params = { count: choice, n: choice, ...params };
  }

  return interpolate(selected, params);
}
