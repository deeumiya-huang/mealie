/**
 * Browser state as observable refs for controllers (vueuse `useOnline`, `useIdle` and
 * `useLocalStorage` equivalents; see ~/lib/observable). Tests mock this module.
 */
import { ref } from "~/lib/observable";
import type { Ref } from "~/lib/observable";

/** `navigator.onLine`, kept up to date by the online/offline events. */
export function onlineState(): Ref<boolean> {
  const online = ref(typeof navigator === "undefined" ? true : navigator.onLine);
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => (online.value = true));
    window.addEventListener("offline", () => (online.value = false));
  }
  return online;
}

const IDLE_EVENTS = ["mousemove", "mousedown", "resize", "keydown", "touchstart", "wheel"] as const;

/** True after `timeout` ms without user activity. */
export function idleState(timeout: number): { idle: Ref<boolean>; stop: () => void } {
  const idle = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const reset = () => {
    if (idle.value) idle.value = false;
    clearTimeout(timer);
    timer = setTimeout(() => (idle.value = true), timeout);
  };
  const onVisibility = () => {
    if (!document.hidden) reset();
  };
  if (typeof window !== "undefined") {
    IDLE_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    reset();
  }
  return {
    idle,
    stop() {
      clearTimeout(timer);
      if (typeof window !== "undefined") {
        IDLE_EVENTS.forEach(e => window.removeEventListener(e, reset));
        document.removeEventListener("visibilitychange", onVisibility);
      }
    },
  };
}

/** A JSON value in localStorage; assigning `.value` writes it back. */
export function localStorageRef<T>(key: string, defaults: T): Ref<T> {
  let current = defaults;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) current = JSON.parse(raw) as T;
  }
  catch {
    // unavailable or corrupt storage: start from the defaults
  }
  return {
    get value() {
      return current;
    },
    set value(next: T) {
      current = next;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      }
      catch {
        // storage full or blocked; keep the in-memory value
      }
    },
  };
}
