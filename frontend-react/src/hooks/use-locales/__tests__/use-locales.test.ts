import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useLocales } from "@/hooks/use-locales";

describe("useLocales", () => {
  test("exposes the 42 locales and the current locale", () => {
    const { result } = renderHook(() => useLocales());
    expect(result.current.locales).toHaveLength(42);
    expect(result.current.locale).toBe("en-US");
    expect(result.current.locales.find(l => l.value === "en-US")?.pluralFoodHandling).toBe("without-unit");
  });

  test("setLocale switches the language for every consumer", async () => {
    const { result } = renderHook(() => useLocales());
    await act(() => result.current.setLocale("fr-FR"));
    expect(result.current.locale).toBe("fr-FR");
    expect(result.current.i18n.t("general.save")).toBe("Sauvegarder");
    await act(() => result.current.setLocale("en-US"));
    expect(result.current.locale).toBe("en-US");
  });
});
