import { createListStoreState, useData, useReadOnlyStore, useStore } from "../partials/use-store-factory";
import type { IngredientFood } from "~/lib/api/types/recipe";
import { publicExploreApi, userApi } from "~/hooks/api";

const state = createListStoreState<IngredientFood>();
const publicState = createListStoreState<IngredientFood>(state.store);
const api = () => userApi().foods;

export function resetFoodStore() {
  state.store.set([]);
  state.loading.set(false);
  state.initialized.set(false);
  publicState.loading.set(false);
  publicState.initialized.set(false);
}

export const useFoodData = function () {
  return useData<IngredientFood>({ id: "", name: "", description: "", labelId: undefined });
};

export const useFoodStore = function () {
  return useStore<IngredientFood>("food", state, api);
};

export const usePublicFoodStore = function (groupSlug: string) {
  return useReadOnlyStore<IngredientFood>("food", publicState, () => publicExploreApi(groupSlug).explore.foods);
};
