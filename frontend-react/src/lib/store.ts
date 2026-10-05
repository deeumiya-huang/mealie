import { useCallback, useSyncExternalStore } from "react";

/**
 * Module-level shared state (port of the Vue module-scope `ref`s used as stores and caches).
 *
 *   const counter = createStore(0);
 *   counter.set(n => n + 1);            // anywhere, also outside React
 *   const n = useStore(counter);        // in a component: re-renders on change
 *   const name = useStore(userStore, s => s.name);
 */
export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set(next) {
      const value = typeof next === "function" ? (next as (prev: T) => T)(state) : next;
      if (Object.is(value, state)) {
        return;
      }
      state = value;
      listeners.forEach(listener => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const identity = <T>(value: T) => value;

export function useStore<T>(store: Store<T>): T;
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S;
export function useStore<T, S>(store: Store<T>, selector?: (state: T) => S): T | S {
  const select = selector ?? (identity as (state: T) => S);
  const getSnapshot = useCallback(() => select(store.get()), [store, select]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
