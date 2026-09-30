import { useEffect, useMemo, useRef, useState } from "react";
import { createReadOnlyActions, createStoreActions } from "./use-actions-factory";
import type { BoundT } from "./types";
import type { BaseCRUDAPI, BaseCRUDAPIReadOnly } from "~/lib/api/base/base-clients";
import type { QueryValue } from "~/lib/api/base/route";
import { createStore, registerCacheReset, useStore as useExternalStore } from "~/lib/store";
import type { Store } from "~/lib/store";

/** Module-level list state for one data store (the Vue app's `store`, `loading`, `initialized` refs). */
export interface ListStoreState<T> {
  store: Store<T[]>;
  loading: Store<boolean>;
  initialized: Store<boolean>;
}

export function createListStoreState<T>(shared?: Store<T[]>): ListStoreState<T> {
  const state = {
    store: shared ?? createStore<T[]>([]),
    loading: createStore(false),
    initialized: createStore(false),
  };
  registerCacheReset(() => {
    state.store.set([]);
    state.loading.set(false);
    state.initialized.set(false);
  });
  return state;
}

/** Editable copy of a default object with a `reset()` (Vue's reactive `useData`). */
export const useData = function <T extends BoundT>(defaultObject: T) {
  const [data, setData] = useState<T>({ ...defaultObject });
  const reset = () => setData({ ...defaultObject });
  return { data, setData, reset };
};

function hydrate(state: ListStoreState<unknown>, refresh: () => Promise<void>) {
  if (!state.loading.get() && !state.initialized.get()) {
    void refresh();
  }
}

export const useReadOnlyStore = function <T extends BoundT>(
  storeKey: string,
  state: ListStoreState<T>,
  api: BaseCRUDAPIReadOnly<T> | (() => BaseCRUDAPIReadOnly<T>),
  params = {} as Record<string, QueryValue>,
) {
  const items = useExternalStore(state.store);
  const loading = useExternalStore(state.loading);
  // Callers often pass an inline getter; keep actions stable and read the latest api per request.
  const apiRef = useRef(api);
  apiRef.current = api;
  const actions = useMemo(() => {
    const lazyApi = () => (typeof apiRef.current === "function" ? apiRef.current() : apiRef.current);
    const storeActions = createReadOnlyActions(`${storeKey}-store-readonly`, lazyApi, state.store, state.loading, state.initialized);
    return {
      ...storeActions,
      async refresh() {
        return await storeActions.refresh(1, -1, params);
      },
      flushStore() {
        state.store.set([]);
        state.initialized.set(false);
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one action set per store; params are static
  }, [storeKey, state]);

  // initial hydration
  useEffect(() => {
    hydrate(state as ListStoreState<unknown>, actions.refresh);
  }, [state, actions]);

  return { store: items, loading, actions };
};

export const useStore = function <T extends BoundT>(
  storeKey: string,
  state: ListStoreState<T>,
  api: BaseCRUDAPI<unknown, T, unknown> | (() => BaseCRUDAPI<unknown, T, unknown>),
  params = {} as Record<string, QueryValue>,
) {
  const items = useExternalStore(state.store);
  const loading = useExternalStore(state.loading);
  const apiRef = useRef(api);
  apiRef.current = api;
  const actions = useMemo(() => {
    const lazyApi = () => (typeof apiRef.current === "function" ? apiRef.current() : apiRef.current);
    const storeActions = createStoreActions(`${storeKey}-store`, lazyApi, state.store, state.loading, state.initialized);
    return {
      ...storeActions,
      async refresh() {
        return await storeActions.refresh(1, -1, params);
      },
      flushStore() {
        state.store.set([]);
        state.initialized.set(false);
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one action set per store; params are static
  }, [storeKey, state]);

  useEffect(() => {
    hydrate(state as ListStoreState<unknown>, actions.refresh);
  }, [state, actions]);

  return { store: items, loading, actions };
};
