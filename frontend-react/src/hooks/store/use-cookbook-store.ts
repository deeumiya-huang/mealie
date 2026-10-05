import { useCallback } from "react";
import { useReadOnlyStore, useStore } from "../partials/use-store-factory";
import type { ReadCookBook, UpdateCookBook } from "@/lib/api/types/cookbook";
import { usePublicExploreApi, useUserApi } from "@/hooks/api";
import { createStore } from "@/lib/store";

const cookbooks = createStore<ReadCookBook[]>([]);
const loading = createStore(false);
const initialized = createStore(false);
const publicLoading = createStore(false);
const publicInitialized = createStore(false);

export function resetCookbookStore() {
  cookbooks.set([]);
  loading.set(false);
  initialized.set(false);
  publicLoading.set(false);
  publicInitialized.set(false);
}

export const useCookbookStore = function () {
  const api = useUserApi();
  const store = useStore<ReadCookBook>("cookbook", cookbooks, loading, initialized, api.cookbooks);

  const updateAll = useCallback(async (updateData: UpdateCookBook[]) => {
    loading.set(true);
    updateData.forEach((cookbook, index) => {
      cookbook.position = index;
    });
    const { data } = await api.cookbooks.updateAll(updateData);
    loading.set(false);
    return data;
  }, [api]);

  return { ...store, updateAll };
};

export const usePublicCookbookStore = function (groupSlug: string) {
  const api = usePublicExploreApi(groupSlug).explore;
  return useReadOnlyStore<ReadCookBook>("cookbook", cookbooks, publicLoading, publicInitialized, api.cookbooks);
};
