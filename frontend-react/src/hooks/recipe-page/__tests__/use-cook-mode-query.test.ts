import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PageMode } from "../shared-state";
import { useCookModeQuery } from "../use-cook-mode-query";
import type { BooleanString } from "../use-cook-mode-query";

/** Page mode and the route's cook query as React state, wired to the hook like the recipe page does. */
function buildHarness(initialCookQuery: BooleanString | undefined = undefined, initialMode = PageMode.VIEW, asyncQueryWrites = false) {
  return renderHook(() => {
    const [cookQuery, setCookQueryNow] = useState<BooleanString | undefined>(initialCookQuery);
    const [pageMode, setMode] = useState(initialMode);
    // The async harness defers query writes, as a router navigation would (Vue: nextTick).
    const setCookQuery = asyncQueryWrites
      ? (value: BooleanString | undefined) => queueMicrotask(() => setCookQueryNow(value))
      : setCookQueryNow;
    const sync = useCookModeQuery({
      cookQuery,
      setCookQuery,
      isEditMode: pageMode === PageMode.EDIT,
      pageMode,
      setMode,
    });
    return { cookQuery, setCookQuery: setCookQueryNow, pageMode, setMode, ...sync };
  });
}

const tick = () => act(async () => {
  await Promise.resolve();
});

describe("useCookModeQuery", () => {
  test("hydrates cook mode from the query", async () => {
    const { result } = buildHarness("true");

    act(() => result.current.hydrateCookMode());
    await tick();

    expect(result.current.pageMode).toBe(PageMode.COOK);
  });

  test("does not enter cook mode while edit mode is active", async () => {
    const { result } = buildHarness("true", PageMode.EDIT);

    act(() => result.current.hydrateCookMode());
    await tick();

    expect(result.current.pageMode).toBe(PageMode.EDIT);
    expect(result.current.cookQuery).toBe("true");
  });

  test("enters cook mode after leaving edit mode if the query is still set", async () => {
    const { result } = buildHarness("true", PageMode.EDIT);

    act(() => {
      result.current.hydrateCookMode();
      result.current.setMode(PageMode.VIEW);
    });
    await tick();

    expect(result.current.pageMode).toBe(PageMode.COOK);
  });

  test("writes cook=true when cook mode is entered from the UI", async () => {
    const { result } = buildHarness();

    act(() => {
      result.current.hydrateCookMode();
      result.current.setMode(PageMode.COOK);
    });
    await tick();

    expect(result.current.cookQuery).toBe("true");
  });

  test("removes the query when cook mode is exited to view mode", async () => {
    const { result } = buildHarness("true", PageMode.COOK);

    act(() => result.current.hydrateCookMode());
    act(() => result.current.setMode(PageMode.VIEW));
    await tick();

    expect(result.current.cookQuery).toBeUndefined();
  });

  test("reacts to route query changes after hydration", async () => {
    const { result } = buildHarness();

    act(() => result.current.hydrateCookMode());
    act(() => result.current.setCookQuery("true"));
    await tick();

    expect(result.current.pageMode).toBe(PageMode.COOK);

    act(() => result.current.setCookQuery(undefined));
    await tick();

    expect(result.current.pageMode).toBe(PageMode.VIEW);
  });

  test("clears a pending cook query when cook mode is entered and exited in the same tick", async () => {
    const { result } = buildHarness(undefined, PageMode.VIEW, true);

    act(() => {
      result.current.hydrateCookMode();
      result.current.setMode(PageMode.COOK);
      result.current.setMode(PageMode.VIEW);
    });
    await tick();
    await tick();

    expect(result.current.cookQuery).toBeUndefined();
    expect(result.current.pageMode).toBe(PageMode.VIEW);
  });
});
