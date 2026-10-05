import { useData, useReadOnlyStore, useStore } from "../partials/use-store-factory";
import type { IngredientFood } from "@/lib/api/types/recipe";
import { usePublicExploreApi, useUserApi } from "@/hooks/api";
import { createStore } from "@/lib/store";

const store = createStore<IngredientFood[]>([]);
const loading = createStore(false);
const initialized = createStore(false);
const publicLoading = createStore(false);
const publicInitialized = createStore(false);

export function resetFoodStore() {
  store.set([]);
  loading.set(false);
  initialized.set(false);
  publicLoading.set(false);
  publicInitialized.set(false);
}

const defaultFood: IngredientFood = {
  id: "",
  name: "",
  description: "",
  labelId: undefined,
};

export const useFoodData = function () {
  return useData<IngredientFood>(defaultFood);
};

export const useFoodStore = function () {
  const api = useUserApi();
  return useStore<IngredientFood>("food", store, loading, initialized, api.foods);
};

export const usePublicFoodStore = function (groupSlug: string) {
  const api = usePublicExploreApi(groupSlug).explore;
  return useReadOnlyStore<IngredientFood>("food", store, publicLoading, publicInitialized, api.foods);
};
