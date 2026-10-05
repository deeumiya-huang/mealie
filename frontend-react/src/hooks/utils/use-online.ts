import { useEffect, useState, useSyncExternalStore } from "react";

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** Port of VueUse `useOnline`. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

const IDLE_EVENTS = ["mousemove", "mousedown", "resize", "keydown", "touchstart", "wheel"] as const;

/** Port of VueUse `useIdle(timeout)`: true after `timeout` ms without user activity. */
export function useIdle(timeout = 60_000) {
  const [idle, setIdle] = useState(false);
  const [lastActive, setLastActive] = useState(() => Date.now());

  useEffect(() => {
    let timer = setTimeout(() => setIdle(true), timeout);
    const onActivity = () => {
      setIdle(false);
      setLastActive(Date.now());
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), timeout);
    };
    const onVisibility = () => {
      if (!document.hidden) onActivity();
    };
    IDLE_EVENTS.forEach(event => window.addEventListener(event, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      IDLE_EVENTS.forEach(event => window.removeEventListener(event, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [timeout]);

  return { idle, lastActive };
}

/** Port of VueUse `useIntervalFn`: calls `fn` every `interval` ms while `active`. */
export function useIntervalFn(fn: () => void, interval: number, active = true) {
  const [fnRef] = useState(() => ({ current: fn }));
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => fnRef.current(), interval);
    return () => clearInterval(timer);
  }, [interval, active, fnRef]);
}
