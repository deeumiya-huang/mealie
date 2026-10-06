import { beforeEach, describe, expect, test } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { resetStorageStores } from "@/hooks/utils";
import { useUnitSystem } from "../use-unit-system";

describe("useUnitSystem", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageStores();
  });

  test("shows recipes as written until the reader opts in", () => {
    const { result } = renderHook(() => useUnitSystem());

    expect(result.current.unitSystem).toBeNull();
    expect(result.current.isConverting).toBe(false);
  });

  test("nothing is inferred from the locale", () => {
    // deliberately no locale lookup: a wrong guess would silently rewrite every quantity
    expect(renderHook(() => useUnitSystem()).result.current.unitSystem).toBeNull();
  });

  test.each(["metric", "us"] as const)("%s can be chosen", (system) => {
    const { result } = renderHook(() => useUnitSystem());
    act(() => {
      result.current.setUnitSystem(system);
    });

    expect(result.current.unitSystem).toBe(system);
    expect(result.current.isConverting).toBe(true);
  });

  test("the choice survives a reload", async () => {
    const first = renderHook(() => useUnitSystem());
    act(() => {
      first.result.current.setUnitSystem("us");
    });

    expect(localStorage.getItem("recipe-unit-system-preferences")).toContain("us");

    // a reload drops the in-memory store and reads storage again
    resetStorageStores();
    expect(renderHook(() => useUnitSystem()).result.current.unitSystem).toBe("us");
  });

  test("showAsWritten goes back to the authored units", () => {
    const { result } = renderHook(() => useUnitSystem());
    act(() => {
      result.current.setUnitSystem("metric");
    });
    act(() => {
      result.current.showAsWritten();
    });

    expect(result.current.unitSystem).toBeNull();
    expect(result.current.isConverting).toBe(false);
  });
});
