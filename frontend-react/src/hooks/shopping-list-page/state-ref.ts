// Vue-style mutable state for the shopping list page (port of the `ref` / `reactive` objects that the composables
// in composables/shopping-list-page pass around and mutate from async code).
//
//   const loadingCounter = useQuietRef(1);        // a counter only code reads: no re-render
//   const shoppingList = useStateRef(null);       // re-renders the component on every change
//   loadingCounter.value                          // read like a Vue ref: always the latest value
//   loadingCounter.set(loadingCounter.value + 1); // write (`ref.value = x` works too in plain code and tests)
//   shoppingList.touch();                         // after mutating the value in place: notify subscribers
//   const state = useReactive({ open: false });   // shallow `reactive({...})`
//   patchReactive(state, { open: true });         // assign properties (`state.open = true` works in plain code)
//
// Hooks and components use the methods because the React lint rules forbid assigning to values returned from hooks.
//
// The objects are stable across renders, so closures that outlive a render (polling, awaited requests) always
// see the current value, which React state would not give them. `createStateRef` / `createReactive` build the
// same objects outside React (tests, plain modules).
import { useState } from "react";
import { createStore, useStore, type Store } from "@/lib/store";

interface Box<T> {
  readonly value: T;
}

export interface StateRef<T> {
  value: T;
  set: (next: T) => void;
  /** Notifies subscribers after the value was mutated in place (a plain assignment already does). */
  touch: () => void;
  readonly store: Store<Box<T>>;
}

export function createStateRef<T>(initial: T, onChange?: (value: T) => void): StateRef<T> {
  const store = createStore<Box<T>>({ value: initial });
  function set(next: T) {
    store.set({ value: next });
    onChange?.(next);
  }
  return {
    get value() {
      return store.get().value;
    },
    set value(next: T) {
      set(next);
    },
    set,
    touch() {
      store.set({ value: store.get().value });
      onChange?.(store.get().value);
    },
    store,
  };
}

/** A `ref` owned by the calling component: it re-renders whenever the value is set or touched. */
export function useStateRef<T>(initial: T | (() => T)): StateRef<T> {
  const [ref] = useState(() => createStateRef(typeof initial === "function" ? (initial as () => T)() : initial));
  useStore(ref.store);
  return ref;
}

/** A `ref` the component does not re-render for (counters and flags only read by code). */
export function useQuietRef<T>(initial: T): StateRef<T> {
  const [ref] = useState(() => createStateRef(initial));
  return ref;
}

interface ReactiveHandle<T extends object> {
  state: T;
  store: Store<T>;
}

const reactiveStores = new WeakMap<object, unknown>();

/** Assigns the given properties of a `createReactive` / `useReactive` object in one update. */
export function patchReactive<T extends object>(state: T, patch: Partial<T>) {
  const store = reactiveStores.get(state) as Store<T> | undefined;
  if (!store) {
    throw new Error("patchReactive: not a reactive object");
  }
  store.set({ ...store.get(), ...patch });
}

/** Shallow `reactive({...})`: assigning a property publishes a new snapshot. */
export function createReactive<T extends object>(initial: T): ReactiveHandle<T> {
  const store = createStore<T>({ ...initial });
  const state = new Proxy({} as T, {
    get: (_target, key) => (store.get() as Record<PropertyKey, unknown>)[key],
    set: (_target, key, value) => {
      store.set({ ...store.get(), [key]: value });
      return true;
    },
    ownKeys: () => Reflect.ownKeys(store.get()),
    getOwnPropertyDescriptor: (_target, key) => {
      const snapshot = store.get() as Record<PropertyKey, unknown>;
      return key in snapshot ? { enumerable: true, configurable: true, value: snapshot[key] } : undefined;
    },
  });
  reactiveStores.set(state, store);
  return { state, store };
}

/** A `reactive` object owned by the calling component: it re-renders whenever a property is assigned. */
export function useReactive<T extends object>(initial: T): T {
  const [handle] = useState(() => createReactive(initial));
  useStore(handle.store);
  return handle.state;
}
