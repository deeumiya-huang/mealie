import { useData, useReadOnlyStore, useStore } from "../partials/use-store-factory";
import type { RecipeCategory } from "@/lib/api/types/recipe";
import { usePublicExploreApi, useUserApi } from "@/hooks/api";
import { createStore } from "@/lib/store";

const store = createStore<RecipeCategory[]>([]);
const loading = createStore(false);
const initialized = createStore(false);
const publicLoading = createStore(false);
const publicInitialized = createStore(false);

export function resetCategoryStore() {
  store.set([]);
  loading.set(false);
  initialized.set(false);
  publicLoading.set(false);
  publicInitialized.set(false);
}

const defaultCategory: RecipeCategory = {
  id: "",
  name: "",
  slug: "",
};

export const useCategoryData = function () {
  return useData<RecipeCategory>(defaultCategory);
};

export const useCategoryStore = function () {
  const api = useUserApi();
  return useStore<RecipeCategory>("category", store, loading, initialized, api.categories);
};

export const usePublicCategoryStore = function (groupSlug: string) {
  const api = usePublicExploreApi(groupSlug).explore;
  return useReadOnlyStore<RecipeCategory>("category", store, publicLoading, publicInitialized, api.categories);
};
