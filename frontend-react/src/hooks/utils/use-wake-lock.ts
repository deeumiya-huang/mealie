import { useCallback, useEffect, useRef, useState } from "react";

/** Port of VueUse `useWakeLock`: `isSupported`, `isActive`, `request("screen")`, `release()`. */
export function useWakeLock() {
  const isSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);

  const release = useCallback(async () => {
    const current = sentinel.current;
    sentinel.current = null;
    setIsActive(false);
    if (current && !current.released) {
      await current.release();
    }
  }, []);

  const request = useCallback(async (type: WakeLockType = "screen") => {
    if (!isSupported) return;
    const lock = await navigator.wakeLock.request(type);
    sentinel.current = lock;
    setIsActive(true);
    lock.addEventListener("release", () => {
      if (sentinel.current === lock) {
        sentinel.current = null;
        setIsActive(false);
      }
    });
  }, [isSupported]);

  useEffect(() => () => {
    void sentinel.current?.release();
  }, []);

  return { isSupported, isActive, request, release };
}
