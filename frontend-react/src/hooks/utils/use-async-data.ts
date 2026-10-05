import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Port of Nuxt `useAsyncData(key, fn)`: runs `fn` on mount and whenever `deps` change, and caches
 * the last result per key at module level so a remount shows the previous data immediately while
 * it refreshes. `clearAsyncDataCache()` is the port of `clearNuxtData()` (called on logout).
 *
 *   const { data, pending, refresh } = useAsyncData(`recipe-${slug}`, () => api.recipes.getOne(slug), [slug]);
 */
const cache = new Map<string, unknown>();

export function clearAsyncDataCache(key?: string) {
  if (key === undefined) {
    cache.clear();
  }
  else {
    cache.delete(key);
  }
}

export interface AsyncData<T> {
  data: T | null;
  /** True until the first load finishes, and during an explicit `refresh()`. */
  pending: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}

export function useAsyncData<T>(key: string, fn: () => Promise<T>, deps: readonly unknown[] = []): AsyncData<T> {
  const [data, setData] = useState<T | null>(() => (cache.has(key) ? (cache.get(key) as T) : null));
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const fnRef = useRef(fn);
  const requestId = useRef(0);

  useEffect(() => {
    fnRef.current = fn;
  });

  // Only sets state after the await, so it is safe to start from an effect.
  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await fnRef.current();
      if (id === requestId.current) {
        cache.set(key, result);
        setData(result);
        setError(null);
      }
    }
    catch (e) {
      if (id === requestId.current) {
        setError(e);
      }
    }
    finally {
      if (id === requestId.current) {
        setPending(false);
      }
    }
  }, [key]);

  const refresh = useCallback(async () => {
    setPending(true);
    await load();
  }, [load]);

  useEffect(() => {
    void load();
    const requests = requestId;
    return () => {
      // a newer request (or unmount) makes any in-flight result stale
      requests.current++;
    };
    // deps are the caller's dependency list, like a useEffect dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  return { data, pending, error, refresh };
}
