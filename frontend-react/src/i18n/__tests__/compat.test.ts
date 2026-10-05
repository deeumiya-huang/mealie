import { describe, expect, test } from "vitest";
import { createDateFormat, createTranslate, formatMessage, interpolate, pluralIndex } from "../compat";

describe("pluralIndex (vue-i18n default rule)", () => {
  test("three choices: 0 → first, 1 → second, ≥ 2 → third", () => {
    expect(pluralIndex(0, 3)).toBe(0);
    expect(pluralIndex(1, 3)).toBe(1);
    expect(pluralIndex(2, 3)).toBe(2);
    expect(pluralIndex(5, 3)).toBe(2);
    expect(pluralIndex(-1, 3)).toBe(1);
  });

  test("two choices: 1 → first, otherwise second", () => {
    expect(pluralIndex(1, 2)).toBe(0);
    expect(pluralIndex(0, 2)).toBe(1);
    expect(pluralIndex(2, 2)).toBe(1);
    expect(pluralIndex(-1, 2)).toBe(0);
  });
});

describe("formatMessage", () => {
  test("named interpolation", () => {
    expect(formatMessage("Hello {name}!", { name: "Ann" })).toBe("Hello Ann!");
  });

  test("list interpolation", () => {
    expect(formatMessage("{0} of {1}", ["a", "b"])).toBe("a of b");
  });

  test("missing values render as empty strings", () => {
    expect(interpolate("a {x} b", {})).toBe("a  b");
  });

  test("plural choice trims around the pipes and provides count / n", () => {
    const message = "none | {count} one | {n} many";
    expect(formatMessage(message, {}, 0)).toBe("none");
    expect(formatMessage(message, {}, 1)).toBe("1 one");
    expect(formatMessage(message, {}, 7)).toBe("7 many");
  });

  test("an explicit count value wins over the plural number", () => {
    expect(formatMessage("a|b {count}", { count: "x" }, 3)).toBe("b x");
  });

  test("a plural message without a count picks the choice for 1", () => {
    expect(formatMessage("one {max}|many {max}", { max: 3 })).toBe("one 3");
    expect(formatMessage("zero|one|many")).toBe("one");
  });
});

describe("createTranslate", () => {
  const messages: Record<string, Record<string, string>> = {
    "en-US": { "a.b": "English {0}", "only.en": "Only English" },
    "de-DE": { "a.b": "Deutsch {0}" },
  };
  const t = createTranslate((locale, key) => messages[locale]?.[key], () => ["de-DE", "en-US"]);

  test("uses the current locale, then the fallback, then the key", () => {
    expect(t("a.b", ["x"])).toBe("Deutsch x");
    expect(t("only.en")).toBe("Only English");
    expect(t("does.not.exist")).toBe("does.not.exist");
  });
});

describe("createDateFormat", () => {
  const formats = { "en-US": { short: { month: "short", day: "numeric" } as Intl.DateTimeFormatOptions } };
  const d = createDateFormat(locale => formats[locale as "en-US"], () => ["en-US"]);
  const date = new Date(2024, 0, 15, 12, 0);

  test("named format", () => {
    expect(d(date, "short")).toBe("Jan 15");
  });

  test("default format, epoch and ISO inputs", () => {
    expect(d(date)).toBe("1/15/2024");
    expect(d(date.getTime())).toBe("1/15/2024");
    expect(d("2024-01-15T12:00:00")).toBe("1/15/2024");
  });

  test("unknown format renders an empty string", () => {
    expect(d(date, "nope")).toBe("");
  });
});
