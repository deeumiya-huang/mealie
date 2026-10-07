import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useWakeLock } from "./use-wake-lock";

class FakeSentinel extends EventTarget {
  released = false;
  readonly type = "screen" as const;
  release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  });
}

let visibility: DocumentVisibilityState = "visible";
const sentinels: FakeSentinel[] = [];
const requestLock = vi.fn(async () => {
  const sentinel = new FakeSentinel();
  sentinels.push(sentinel);
  return sentinel;
});

function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useWakeLock", () => {
  beforeEach(() => {
    visibility = "visible";
    sentinels.length = 0;
    requestLock.mockClear();
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: requestLock } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "wakeLock");
  });

  test("requests the lock again when the page becomes visible after the browser released it", async () => {
    const { result } = renderHook(() => useWakeLock());
    await act(() => result.current.request("screen"));
    expect(result.current.isActive).toBe(true);

    // the browser releases the lock when the tab is hidden
    await act(async () => {
      setVisibility("hidden");
      await sentinels[0]!.release();
    });
    expect(result.current.isActive).toBe(false);

    await act(async () => setVisibility("visible"));
    expect(requestLock).toHaveBeenCalledTimes(2);
    expect(result.current.isActive).toBe(true);
  });

  test("defers a request made while hidden and does not re-request after release()", async () => {
    visibility = "hidden";
    const { result } = renderHook(() => useWakeLock());
    await act(() => result.current.request("screen"));
    expect(requestLock).not.toHaveBeenCalled();

    await act(async () => setVisibility("visible"));
    expect(requestLock).toHaveBeenCalledTimes(1);

    await act(() => result.current.release());
    await act(async () => {
      setVisibility("hidden");
      setVisibility("visible");
    });
    expect(requestLock).toHaveBeenCalledTimes(1);
    expect(result.current.isActive).toBe(false);
  });

  test("releases a lock that resolves after unmount", async () => {
    let resolve: (sentinel: FakeSentinel) => void = () => {};
    requestLock.mockImplementationOnce(() => new Promise<FakeSentinel>((r) => {
      resolve = r;
    }));
    const { result, unmount } = renderHook(() => useWakeLock());
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.request("screen");
    });
    await vi.waitFor(() => expect(requestLock).toHaveBeenCalled());
    unmount();
    const late = new FakeSentinel();
    resolve(late);
    await pending;
    expect(late.release).toHaveBeenCalled();
  });
});
