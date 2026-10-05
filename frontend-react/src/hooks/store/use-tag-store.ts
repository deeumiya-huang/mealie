import { useData, useReadOnlyStore, useStore } from "../partials/use-store-factory";
import type { RecipeTag } from "@/lib/api/types/recipe";
import { usePublicExploreApi, useUserApi } from "@/hooks/api";
import { createStore } from "@/lib/store";

const store = createStore<RecipeTag[]>([]);
const loading = createStore(false);
const initialized = createStore(false);
const publicLoading = createStore(false);
const publicInitialized = createStore(false);

export function resetTagStore() {
  store.set([]);
  loading.set(false);
  initialized.set(false);
  publicLoading.set(false);
  publicInitialized.set(false);
}

const defaultTag: RecipeTag = {
  id: "",
  name: "",
  slug: "",
};

export const useTagData = function () {
  return useData<RecipeTag>(defaultTag);
};

export const useTagStore = function () {
  const api = useUserApi();
  return useStore<RecipeTag>("tag", store, loading, initialized, api.tags);
};

export const usePublicTagStore = function (groupSlug: string) {
  const api = usePublicExploreApi(groupSlug).explore;
  return useReadOnlyStore<RecipeTag>("tag", store, publicLoading, publicInitialized, api.tags);
};
