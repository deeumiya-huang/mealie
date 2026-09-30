import { createListStoreState, useData, useReadOnlyStore, useStore } from "../partials/use-store-factory";
import type { RecipeCategory } from "~/lib/api/types/recipe";
import { publicExploreApi, userApi } from "~/hooks/api";

const state = createListStoreState<RecipeCategory>();
const publicState = createListStoreState<RecipeCategory>(state.store);
const api = () => userApi().categories;

export function resetCategoryStore() {
  state.store.set([]);
  state.loading.set(false);
  state.initialized.set(false);
  publicState.loading.set(false);
  publicState.initialized.set(false);
}

export const useCategoryData = function () {
  return useData<RecipeCategory>({ id: "", name: "", slug: "" });
};

export const useCategoryStore = function () {
  return useStore<RecipeCategory>("category", state, api);
};

export const usePublicCategoryStore = function (groupSlug: string) {
  return useReadOnlyStore<RecipeCategory>("category", publicState, () => publicExploreApi(groupSlug).explore.categories);
};
