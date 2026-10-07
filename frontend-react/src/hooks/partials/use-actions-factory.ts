import type { BoundT } from "./types";
import type { BaseCRUDAPI, BaseCRUDAPIReadOnly } from "@/lib/api/base/base-clients";
import type { QueryValue } from "@/lib/api/base/route";
import type { Store } from "@/lib/store";

// Port of composables/partials/use-actions-factory.ts. The Vue refs become module-level stores
// (lib/store.ts); these factories call no React hooks, hence `create…` instead of `use…`.

export interface ReadOnlyStoreActions<T extends BoundT> {
  getAll(page?: number, perPage?: number, params?: Record<string, QueryValue>): Promise<T[]>;
  refresh(page?: number, perPage?: number, params?: Record<string, QueryValue>): Promise<T[]>;
}

export interface StoreActions<T extends BoundT> extends ReadOnlyStoreActions<T> {
  createOne(createData: T): Promise<T | null>;
  updateOne(updateData: T): Promise<T | null>;
  deleteOne(id: string | number): Promise<T | null>;
  deleteMany(ids: (string | number)[]): Promise<void>;
}

function withDefaults(defaultQueryParams: Record<string, QueryValue>, params: Record<string, QueryValue>) {
  const merged = { ...defaultQueryParams, ...params };
  merged.orderBy ??= "name";
  merged.orderDirection ??= "asc";
  return merged;
}

/**
 * createReadOnlyActions returns a set of methods that can be reused to manage the state of a data
 * store. This is primarily used for basic GET/GETALL operations that required a lot of refreshing
 * hooks to be called on operations.
 */
export function createReadOnlyActions<T extends BoundT>(
  _storeKey: string,
  api: BaseCRUDAPIReadOnly<T>,
  allRef: Store<T[]> | null,
  loading: Store<boolean>,
  initialized: Store<boolean>,
  defaultQueryParams: Record<string, QueryValue> = {},
): ReadOnlyStoreActions<T> {
  async function getAll(page = 1, perPage = -1, params = {} as Record<string, QueryValue>) {
    loading.set(true);
    try {
      const { data } = await api.getAll(page, perPage, withDefaults(defaultQueryParams, params));

      if (data && allRef) {
        allRef.set(data.items);
      }

      return data ? data.items ?? [] : [];
    }
    finally {
      loading.set(false);
    }
  }

  async function refresh(page = 1, perPage = -1, params = {} as Record<string, QueryValue>) {
    loading.set(true);
    const { data } = await api.getAll(page, perPage, withDefaults(defaultQueryParams, params));

    if (data && data.items && allRef) {
      allRef.set(data.items);
    }

    initialized.set(true);
    loading.set(false);
    // Vue callers read the store ref after awaiting; React callers get the list (store state is not re-read)
    return data?.items ?? [];
  }

  return {
    getAll,
    refresh,
  };
}

/**
 * createStoreActions returns a set of methods that can be reused to manage the state of a data
 * store. This is primarily used for basic CRUD operations that required a lot of refreshing hooks
 * to be called on operations.
 */
export function createStoreActions<T extends BoundT>(
  storeKey: string,
  api: BaseCRUDAPI<unknown, T, unknown>,
  allRef: Store<T[]> | null,
  loading: Store<boolean>,
  initialized: Store<boolean>,
  defaultQueryParams: Record<string, QueryValue> = {},
): StoreActions<T> {
  const { getAll, refresh } = createReadOnlyActions(storeKey, api, allRef, loading, initialized, defaultQueryParams);

  async function createOne(createData: T) {
    loading.set(true);
    const { data } = await api.createOne(createData);
    if (data && allRef) {
      allRef.set(items => [...items, data]);
    }
    else {
      await refresh();
    }
    loading.set(false);
    return data;
  }

  async function updateOne(updateData: T) {
    if (!updateData.id) {
      return null;
    }

    loading.set(true);
    const { data } = await api.updateOne(updateData.id, updateData);
    if (data && allRef) {
      await refresh();
    }
    loading.set(false);
    return data;
  }

  async function deleteOne(id: string | number) {
    loading.set(true);
    const { response } = await api.deleteOne(id);
    if (response && allRef) {
      await refresh();
    }
    loading.set(false);
    return response?.data || null;
  }

  async function deleteMany(ids: (string | number)[]) {
    loading.set(true);
    for (const id of ids) {
      await api.deleteOne(id);
    }
    if (allRef) {
      await refresh();
    }
    loading.set(false);
  }

  return {
    getAll,
    refresh,
    createOne,
    updateOne,
    deleteOne,
    deleteMany,
  };
}
