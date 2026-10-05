import { useCallback } from "react";
import { createStore, useStore, type Store } from "@/lib/store";

/**
 * Port of VueUse `useLocalStorage` / `useSessionStorage` / `useStorage`: same keys, same
 * serialisation (raw strings, numbers, booleans, JSON for objects), `mergeDefaults` for objects,
 * shared between every component using the same key and synced across tabs via `storage` events.
 */
export interface StorageOptions {
  mergeDefaults?: boolean;
}

type Serializer<T> = { read: (raw: string) => T; write: (value: T) => string };

function serializerFor<T>(defaults: T): Serializer<T> {
  if (defaults === null || defaults === undefined) {
    return { read: raw => raw as T, write: value => String(value) };
  }
  switch (typeof defaults) {
    case "string":
      return { read: raw => raw as T, write: value => String(value) };
    case "number":
      return { read: raw => Number.parseFloat(raw) as T, write: value => String(value) };
    case "boolean":
      return { read: raw => (raw === "true") as T, write: value => String(value) };
    default:
      return { read: raw => JSON.parse(raw) as T, write: value => JSON.stringify(value) };
  }
}

const stores = new Map<string, Store<unknown>>();

function storageArea(kind: "local" | "session"): globalThis.Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  }
  catch {
    return null;
  }
}

function readValue<T>(area: globalThis.Storage | null, key: string, defaults: T, options: StorageOptions): T {
  const raw = area?.getItem(key);
  if (raw === null || raw === undefined) {
    return defaults;
  }
  try {
    const value = serializerFor(defaults).read(raw);
    if (options.mergeDefaults && defaults && typeof defaults === "object" && !Array.isArray(defaults)) {
      return { ...defaults, ...(value as object) } as T;
    }
    return value;
  }
  catch {
    return defaults;
  }
}

/** The shared store behind a storage key (usable outside React, e.g. in plain modules and tests). */
export function getStorageStore<T>(kind: "local" | "session", key: string, defaults: T, options: StorageOptions = {}): Store<T> {
  const id = `${kind}:${key}`;
  const existing = stores.get(id);
  if (existing) {
    return existing as Store<T>;
  }

  const area = storageArea(kind);
  const inner = createStore<T>(readValue(area, key, defaults, options));
  const serializer = serializerFor(defaults);

  // Write through to the storage area on every set.
  const store: Store<T> = {
    get: inner.get,
    subscribe: inner.subscribe,
    set(next) {
      inner.set(next);
      const value = inner.get();
      try {
        if (value === null || value === undefined) {
          area?.removeItem(key);
        }
        else {
          area?.setItem(key, serializer.write(value));
        }
      }
      catch {
        // storage full or unavailable: keep the in-memory value, like VueUse
      }
    },
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.storageArea === area && event.key === key) {
        inner.set(readValue(area, key, defaults, options));
      }
    });
  }

  stores.set(id, store as Store<unknown>);
  return store;
}

/** Forget the shared stores (tests). */
export function resetStorageStores() {
  stores.clear();
}

function useStorageValue<T>(kind: "local" | "session", key: string, defaults: T, options: StorageOptions): [T, (next: T | ((prev: T) => T)) => void] {
  const store = getStorageStore(kind, key, defaults, options);
  const value = useStore(store);
  const setValue = useCallback((next: T | ((prev: T) => T)) => store.set(next), [store]);
  return [value, setValue];
}

export function useLocalStorage<T>(key: string, defaults: T, options: StorageOptions = {}) {
  return useStorageValue("local", key, defaults, options);
}

export function useSessionStorage<T>(key: string, defaults: T, options: StorageOptions = {}) {
  return useStorageValue("session", key, defaults, options);
}
