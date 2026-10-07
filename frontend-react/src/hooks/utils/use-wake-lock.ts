import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Port of VueUse `useWakeLock`: `isSupported`, `isActive`, `request("screen")`, `release()`.
 * Browsers release the lock when the page is hidden; like VueUse, a lock released that way (or requested while
 * hidden) is requested again when the page becomes visible. Unmount releases the lock, also one still pending.
 */
export function useWakeLock() {
  const isSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const sentinel = useRef<WakeLockSentinel | null>(null);
  // the type to request again once the page is visible (VueUse `requestedType`); null = none
  const requestedType = useRef<WakeLockType | null>(null);
  const mounted = useRef(true);
  const [isActive, setIsActive] = useState(false);

  const forceRequest = useCallback(async (type: WakeLockType) => {
    await sentinel.current?.release();
    let lock: WakeLockSentinel;
    try {
      lock = await navigator.wakeLock.request(type);
    }
    catch (error) {
      // e.g. NotAllowedError when the page was hidden meanwhile: try again when it is visible
      console.error(error);
      requestedType.current = type;
      return;
    }
    if (!mounted.current) {
      void lock.release();
      return;
    }
    sentinel.current = lock;
    setIsActive(true);
    lock.addEventListener("release", () => {
      if (sentinel.current === lock) {
        sentinel.current = null;
        requestedType.current = lock.type;
        setIsActive(false);
      }
    });
  }, []);

  const request = useCallback(async (type: WakeLockType = "screen") => {
    if (!isSupported) return;
    if (document.visibilityState === "visible") {
      await forceRequest(type);
    }
    else {
      requestedType.current = type;
    }
  }, [isSupported, forceRequest]);

  const release = useCallback(async () => {
    requestedType.current = null;
    const current = sentinel.current;
    sentinel.current = null;
    setIsActive(false);
    if (current && !current.released) {
      await current.release();
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;
    function onVisibilityChange() {
      const type = requestedType.current;
      if (document.visibilityState === "visible" && type) {
        requestedType.current = null;
        void forceRequest(type);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isSupported, forceRequest]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestedType.current = null;
      void sentinel.current?.release();
      sentinel.current = null;
    };
  }, []);

  return { isSupported, isActive, request, release };
}
