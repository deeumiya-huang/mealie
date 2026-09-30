import { createStore, useStore } from "~/lib/store";
import type { Store } from "~/lib/store";

type StorageKind = "local" | "session";

const stores = new Map<string, Store<unknown>>();

function storageOf(kind: StorageKind): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  }
  catch {
    return null;
  }
}

function read<T extends object>(kind: StorageKind, key: string, defaults: T): T {
  const raw = storageOf(kind)?.getItem(key);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<T>;
    // vueuse `mergeDefaults: true`: stored values over defaults (shallow)
    return { ...defaults, ...parsed };
  }
  catch {
    return defaults;
  }
}

/**
 * A JSON value persisted in local/session storage and shared by every caller using the same key,
 * like @vueuse/core's useLocalStorage/useSessionStorage (same keys and JSON format, so existing
 * preferences carry over from the Vue app).
 */
export function storageStore<T extends object>(key: string, defaults: T, kind: StorageKind = "local"): Store<T> {
  const id = `${kind}:${key}`;
  let store = stores.get(id) as Store<T> | undefined;
  if (!store) {
    const created = createStore<T>(read(kind, key, defaults));
    created.subscribe(() => {
      try {
        storageOf(kind)?.setItem(key, JSON.stringify(created.get()));
      }
      catch {
        // quota / private mode: keep the in-memory value
      }
    });
    if (kind === "local" && typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === key) {
          created.set(read(kind, key, defaults));
        }
      });
    }
    store = created;
    stores.set(id, store as Store<unknown>);
  }
  return store;
}

export type StorageSetter<T> = (next: Partial<T> | ((prev: T) => T)) => void;

export function useStorageValue<T extends object>(key: string, defaults: T, kind: StorageKind = "local"): [T, StorageSetter<T>] {
  const store = storageStore(key, defaults, kind);
  const value = useStore(store);
  const set: StorageSetter<T> = next => store.set(prev => (typeof next === "function" ? next(prev) : { ...prev, ...next }));
  return [value, set];
}
