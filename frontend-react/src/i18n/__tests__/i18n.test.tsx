import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { d, getGlobalI18n, i18n, setLocale, t, useI18n } from "@/i18n";
import { I18nT } from "@/i18n/I18nT";
import { LOCALE_COOKIE, matchBrowserLocale, readLocaleCookie } from "@/i18n/locales";
import { stubI18n } from "@/test/utils";

afterEach(async () => {
  await act(() => setLocale("en-US"));
});

describe("app i18n with the en-US messages", () => {
  test("translates a plain key", () => {
    expect(t("general.save")).toBe("Save");
    const { result } = renderHook(() => useI18n());
    expect(result.current.t("general.save")).toBe("Save");
  });

  test("pipe plurals choose by count", () => {
    expect(t("shopping-list.items-checked-count", 0)).toBe("No items checked");
    expect(t("shopping-list.items-checked-count", 1)).toBe("One item checked");
    expect(t("shopping-list.items-checked-count", 5)).toBe("5 items checked");
    expect(t("data-pages.tags.delete-unused-confirm", 1)).toBe("Okay to delete this unused tag? This cannot be undone.");
    expect(t("data-pages.tags.delete-unused-confirm", 3)).toBe("Okay to delete these 3 unused tags? This cannot be undone.");
  });

  test("named and list interpolation", () => {
    expect(t("general.selected-count", { count: 2 })).toBe("Selected: 2");
    expect(t("general.created-on-date", ["today"])).toBe("Created on: today");
    expect(t("validators.min-length", { min: 4 })).toBe("Must Be At Least 4 Characters");
  });

  test("a missing key renders the key", () => {
    expect(t("general.no-such-key")).toBe("general.no-such-key");
  });

  test("unit names are merged in", () => {
    expect(t("unit-names.teaspoon.name")).toBe("teaspoon");
  });

  test("d() uses the en-US datetime formats", () => {
    const date = new Date(2024, 0, 15, 9, 5);
    expect(d(date, "short")).toBe("Monday, Jan 15");
    expect(d(date, "medium")).toBe("Monday, January 15, 2024");
    expect(d(date)).toBe("1/15/2024");
  });

  test("stubI18n translates like the app instance", () => {
    const stub = stubI18n();
    expect(stub.t("shopping-list.items-checked-count", 5)).toBe("5 items checked");
    expect(stub.locale).toBe("en-US");
  });
});

describe("locale switching", () => {
  test("setLocale loads the messages, falls back to en-US, updates <html> and the cookie", async () => {
    const { result } = renderHook(() => useI18n());
    await act(() => setLocale("de-DE"));

    expect(result.current.locale).toBe("de-DE");
    expect(result.current.t("general.save")).toBe("Speichern");
    expect(getGlobalI18n().locale).toBe("de-DE");
    expect(i18n.getResource("de-DE", "translation", "general.save")).toBe("Speichern");
    expect(document.documentElement.lang).toBe("de-DE");
    expect(document.documentElement.dir).toBe("ltr");
    expect(readLocaleCookie()).toBe("de-DE");
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=de-DE`);
  });

  test("rtl locales set dir=rtl", async () => {
    await act(() => setLocale("he-IL"));
    expect(document.documentElement.dir).toBe("rtl");
  });

  test("unknown codes are ignored", async () => {
    await act(() => setLocale("xx-XX"));
    expect(i18n.language).toBe("en-US");
  });

  test("browser language matching: exact code first, then same language", () => {
    expect(matchBrowserLocale(["fr-ca", "de"])).toBe("fr-CA");
    expect(matchBrowserLocale(["de", "en-GB"])).toBe("en-GB");
    expect(matchBrowserLocale(["de"])).toBe("de-DE");
    expect(matchBrowserLocale(["xx"])).toBeNull();
  });
});

describe("I18nT", () => {
  test("replaces placeholders with the given nodes", () => {
    render(
      <p data-testid="text">
        <I18nT
          keypath="language-dialog.how-to-contribute-description"
          slots={{ "read-the-docs-link": <a href="https://docs.mealie.io/">{t("language-dialog.read-the-docs")}</a> }}
        />
      </p>,
    );
    expect(screen.getByRole("link", { name: "Read the docs" })).toHaveAttribute("href", "https://docs.mealie.io/");
    expect(screen.getByTestId("text")).toHaveTextContent(
      "Is something not translated yet, mistranslated, or your language missing from the list? Read the docs on how to contribute!",
    );
  });
});
