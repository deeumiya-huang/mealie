import { useCallback, useEffect, useMemo, useState } from "react";
import { createReadOnlyActions, createStoreActions } from "./use-actions-factory";
import type { BoundT } from "./types";
import type { BaseCRUDAPI, BaseCRUDAPIReadOnly } from "@/lib/api/base/base-clients";
import type { QueryValue } from "@/lib/api/base/route";
import { useStore as useStoreValue, type Store } from "@/lib/store";

/** Local form state with a reset (port of the Vue `reactive` copy of a default object). */
export function useData<T extends BoundT>(defaultObject: T) {
  const [data, setData] = useState<T>(() => ({ ...defaultObject }));
  const reset = useCallback(() => setData({ ...defaultObject }), [defaultObject]);
  return { data, setData, reset };
}

/**
 * Shared read-only list store: the items, plus actions. The first component that mounts while the
 * store is neither loading nor initialized triggers the initial load (Vue: during setup).
 */
export function useReadOnlyStore<T extends BoundT>(
  storeKey: string,
  store: Store<T[]>,
  loading: Store<boolean>,
  initialized: Store<boolean>,
  api: BaseCRUDAPIReadOnly<T>,
  params = {} as Record<string, QueryValue>,
) {
  const items = useStoreValue(store);
  const paramsKey = JSON.stringify(params);

  const actions = useMemo(() => {
    const queryParams = JSON.parse(paramsKey) as Record<string, QueryValue>;
    const storeActions = createReadOnlyActions(`${storeKey}-store-readonly`, api, store, loading, initialized);
    return {
      ...storeActions,
      async refresh() {
        return await storeActions.refresh(1, -1, queryParams);
      },
      flushStore() {
        store.set([]);
        initialized.set(false);
      },
    };
  }, [storeKey, api, store, loading, initialized, paramsKey]);

  // initial hydration
  useEffect(() => {
    if (!loading.get() && !initialized.get()) {
      void actions.refresh();
    }
  }, [actions, loading, initialized]);

  return { store: items, actions };
}

/** Shared CRUD list store: the items, plus CRUD actions that keep the store in sync. */
export function useStore<T extends BoundT>(
  storeKey: string,
  store: Store<T[]>,
  loading: Store<boolean>,
  initialized: Store<boolean>,
  api: BaseCRUDAPI<unknown, T, unknown>,
  params = {} as Record<string, QueryValue>,
) {
  const items = useStoreValue(store);
  const paramsKey = JSON.stringify(params);

  const actions = useMemo(() => {
    const queryParams = JSON.parse(paramsKey) as Record<string, QueryValue>;
    const storeActions = createStoreActions(`${storeKey}-store`, api, store, loading, initialized);
    return {
      ...storeActions,
      async refresh() {
        return await storeActions.refresh(1, -1, queryParams);
      },
      flushStore() {
        store.set([]);
        initialized.set(false);
      },
    };
  }, [storeKey, api, store, loading, initialized, paramsKey]);

  // initial hydration
  useEffect(() => {
    if (!loading.get() && !initialized.get()) {
      void actions.refresh();
    }
  }, [actions, loading, initialized]);

  return { store: items, actions };
}
