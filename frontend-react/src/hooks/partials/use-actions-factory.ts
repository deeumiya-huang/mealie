import type { BoundT } from "./types";
import type { BaseCRUDAPI, BaseCRUDAPIReadOnly } from "~/lib/api/base/base-clients";
import type { QueryValue } from "~/lib/api/base/route";
import type { Store } from "~/lib/store";

type Lazy<A> = A | (() => A);
const resolve = <A>(api: Lazy<A>): A => (typeof api === "function" ? (api as () => A)() : api);

interface ReadOnlyStoreActions<T extends BoundT> {
  getAll(page?: number, perPage?: number, params?: Record<string, QueryValue>): Promise<T[]>;
  refresh(page?: number, perPage?: number, params?: Record<string, QueryValue>): Promise<void>;
}

interface StoreActions<T extends BoundT> extends ReadOnlyStoreActions<T> {
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
 * Reusable GET/GET-all actions over a module-level store (the Vue app's refs become `Store`s).
 * `api` may be passed lazily so the Accept-Language header is taken per request.
 */
export function createReadOnlyActions<T extends BoundT>(
  _storeKey: string,
  api: Lazy<BaseCRUDAPIReadOnly<T>>,
  allRef: Store<T[]> | null,
  loading: Store<boolean>,
  initialized: Store<boolean>,
  defaultQueryParams: Record<string, QueryValue> = {},
): ReadOnlyStoreActions<T> {
  async function getAll(page = 1, perPage = -1, params = {} as Record<string, QueryValue>) {
    loading.set(true);
    try {
      const { data } = await resolve(api).getAll(page, perPage, withDefaults(defaultQueryParams, params));
      if (data && allRef) {
        allRef.set(data.items);
      }
      return data?.items ?? [];
    }
    finally {
      loading.set(false);
    }
  }

  async function refresh(page = 1, perPage = -1, params = {} as Record<string, QueryValue>) {
    loading.set(true);
    const { data } = await resolve(api).getAll(page, perPage, withDefaults(defaultQueryParams, params));

    if (data && data.items && allRef) {
      allRef.set(data.items);
    }

    initialized.set(true);
    loading.set(false);
  }

  return { getAll, refresh };
}

/** CRUD actions over a module-level store; mutations refresh the list. */
export function createStoreActions<T extends BoundT>(
  storeKey: string,
  api: Lazy<BaseCRUDAPI<unknown, T, unknown>>,
  allRef: Store<T[]> | null,
  loading: Store<boolean>,
  initialized: Store<boolean>,
  defaultQueryParams: Record<string, QueryValue> = {},
): StoreActions<T> {
  const { getAll, refresh } = createReadOnlyActions<T>(storeKey, api as Lazy<BaseCRUDAPIReadOnly<T>>, allRef, loading, initialized, defaultQueryParams);

  async function createOne(createData: T) {
    loading.set(true);
    const { data } = await resolve(api).createOne(createData);
    if (data && allRef?.get()) {
      allRef.set([...allRef.get(), data]);
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
    const { data } = await resolve(api).updateOne(updateData.id, updateData);
    if (data && allRef?.get()) {
      await refresh();
    }
    loading.set(false);
    return data;
  }

  async function deleteOne(id: string | number) {
    loading.set(true);
    const { response } = await resolve(api).deleteOne(id);
    if (response && allRef?.get()) {
      await refresh();
    }
    loading.set(false);
    return response?.data || null;
  }

  async function deleteMany(ids: (string | number)[]) {
    loading.set(true);
    for (const id of ids) {
      await resolve(api).deleteOne(id);
    }
    if (allRef?.get()) {
      await refresh();
    }
    loading.set(false);
  }

  return { getAll, refresh, createOne, updateOne, deleteOne, deleteMany };
}
