import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { PageMode } from "./shared-state";
import { useCookModeQuery, type BooleanString } from "./use-cook-mode-query";

// Vue's `nextTick` → the end of an `act()` (React has rendered and run its effects).
const nextTick = () => act(async () => {});

function buildHarness(initialCookQuery: BooleanString | undefined = undefined, initialMode = PageMode.VIEW) {
  const { result } = renderHook(() => {
    const [cookQuery, setCookQuery] = useState<BooleanString | undefined>(initialCookQuery);
    const [pageMode, setMode] = useState(initialMode);

    const sync = useCookModeQuery({
      cookQuery,
      setCookQuery,
      isEditMode: pageMode === PageMode.EDIT,
      pageMode,
      setMode,
    });

    return { cookQuery, setCookQuery, pageMode, setMode, ...sync };
  });

  return {
    get cookQuery() {
      return { value: result.current.cookQuery };
    },
    setCookQuery: (value: BooleanString | undefined) => act(() => result.current.setCookQuery(value)),
    get pageMode() {
      return { value: result.current.pageMode };
    },
    setMode: (mode: PageMode) => act(() => result.current.setMode(mode)),
    hydrateCookMode: () => act(() => result.current.hydrateCookMode()),
    /** Several calls in one tick (Vue ran them synchronously before any watcher). */
    batch: (fn: (current: typeof result.current) => void) => act(() => fn(result.current)),
  };
}

function buildAsyncHarness(initialCookQuery: BooleanString | undefined = undefined, initialMode = PageMode.VIEW) {
  const { result } = renderHook(() => {
    const [routeCookQuery, setRouteCookQuery] = useState<BooleanString | undefined>(initialCookQuery);
    const [pageMode, setMode] = useState(initialMode);

    const sync = useCookModeQuery({
      cookQuery: routeCookQuery,
      // the router applies a query change a tick later
      setCookQuery: (value) => {
        void Promise.resolve().then(() => setRouteCookQuery(value));
      },
      isEditMode: pageMode === PageMode.EDIT,
      pageMode,
      setMode,
    });

    return { cookQuery: routeCookQuery, pageMode, setMode, ...sync };
  });

  return {
    get cookQuery() {
      return { value: result.current.cookQuery };
    },
    get pageMode() {
      return { value: result.current.pageMode };
    },
    batch: (fn: (current: typeof result.current) => void) => act(() => fn(result.current)),
  };
}

describe("useCookModeQuery", () => {
  test("hydrates cook mode from the query", async () => {
    const harness = buildHarness("true");

    harness.hydrateCookMode();
    await nextTick();

    expect(harness.pageMode.value).toBe(PageMode.COOK);
  });

  test("does not enter cook mode while edit mode is active", async () => {
    const harness = buildHarness("true", PageMode.EDIT);

    harness.hydrateCookMode();
    await nextTick();

    expect(harness.pageMode.value).toBe(PageMode.EDIT);
    expect(harness.cookQuery.value).toBe("true");
  });

  test("enters cook mode after leaving edit mode if the query is still set", async () => {
    const harness = buildHarness("true", PageMode.EDIT);

    harness.batch((h) => {
      h.hydrateCookMode();
      h.setMode(PageMode.VIEW);
    });
    await nextTick();

    expect(harness.pageMode.value).toBe(PageMode.COOK);
  });

  test("writes cook=true when cook mode is entered from the UI", async () => {
    const harness = buildHarness();

    harness.batch((h) => {
      h.hydrateCookMode();
      h.setMode(PageMode.COOK);
    });
    await nextTick();

    expect(harness.cookQuery.value).toBe("true");
  });

  test("removes the query when cook mode is exited to view mode", async () => {
    const harness = buildHarness("true", PageMode.COOK);

    harness.batch((h) => {
      h.hydrateCookMode();
      h.setMode(PageMode.VIEW);
    });
    await nextTick();

    expect(harness.cookQuery.value).toBeUndefined();
  });

  test("reacts to route query changes after hydration", async () => {
    const harness = buildHarness();

    harness.hydrateCookMode();
    harness.setCookQuery("true");
    await nextTick();

    expect(harness.pageMode.value).toBe(PageMode.COOK);

    harness.setCookQuery(undefined);
    await nextTick();

    expect(harness.pageMode.value).toBe(PageMode.VIEW);
  });

  test("clears a pending cook query when cook mode is entered and exited in the same tick", async () => {
    const harness = buildAsyncHarness();

    harness.batch((h) => {
      h.hydrateCookMode();
      h.setMode(PageMode.COOK);
      h.setMode(PageMode.VIEW);
    });
    await nextTick();
    await nextTick();

    expect(harness.cookQuery.value).toBeUndefined();
    expect(harness.pageMode.value).toBe(PageMode.VIEW);
  });
});
