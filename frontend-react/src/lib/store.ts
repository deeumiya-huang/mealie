import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * A tiny module-level state container.
 *
 * The Vue app kept shared state in module-level `ref()`s (auth, toasts, data stores) that non-component
 * code such as the axios interceptor also reads and writes. This is the React equivalent: plain
 * get/set/subscribe that works anywhere, plus `useStore()` to subscribe a component.
 */
export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  /** Shallow-merges a partial object into the current value (object stores only). */
  patch: (partial: Partial<T>) => void;
  subscribe: (listener: () => void) => () => void;
  reset: () => void;
}

export function createStore<T>(initial: T | (() => T)): Store<T> {
  const init = () => (typeof initial === "function" ? (initial as () => T)() : initial);
  let value = init();
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const store: Store<T> = {
    get: () => value,
    set(next) {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      if (Object.is(resolved, value)) {
        return;
      }
      value = resolved;
      emit();
    },
    patch(partial) {
      store.set(prev => ({ ...prev, ...partial }));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      store.set(init());
    },
  };
  return store;
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** Subscribe to a derived slice; re-renders only when the selected value changes (Object.is). */
export function useStoreSelector<T, S>(store: Store<T>, selector: (value: T) => S): S {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const getSnapshot = useCallback(() => selectorRef.current(store.get()), [store]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

const cacheResets = new Set<() => void>();

/**
 * Registers a reset for cached, user-scoped state. All of them run on sign-out so nothing leaks
 * between users (the Vue app's clearAllStores() + clearComposableCaches() + clearNuxtData()).
 */
export function registerCacheReset(reset: () => void): void {
  cacheResets.add(reset);
}

export function resetAllCaches(): void {
  for (const reset of cacheResets) {
    reset();
  }
}
