import { createListStoreState, useData, useReadOnlyStore, useStore } from "../partials/use-store-factory";
import type { RecipeTag } from "~/lib/api/types/recipe";
import { publicExploreApi, userApi } from "~/hooks/api";

const state = createListStoreState<RecipeTag>();
const publicState = createListStoreState<RecipeTag>(state.store);
const api = () => userApi().tags;

export function resetTagStore() {
  state.store.set([]);
  state.loading.set(false);
  state.initialized.set(false);
  publicState.loading.set(false);
  publicState.initialized.set(false);
}

export const useTagData = function () {
  return useData<RecipeTag>({ id: "", name: "", slug: "" });
};

export const useTagStore = function () {
  return useStore<RecipeTag>("tag", state, api);
};

export const usePublicTagStore = function (groupSlug: string) {
  return useReadOnlyStore<RecipeTag>("tag", publicState, () => publicExploreApi(groupSlug).explore.tags);
};
