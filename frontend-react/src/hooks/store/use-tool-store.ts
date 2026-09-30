import { createListStoreState, useData, useReadOnlyStore, useStore } from "../partials/use-store-factory";
import type { RecipeTool } from "~/lib/api/types/recipe";
import { publicExploreApi, userApi } from "~/hooks/api";

interface RecipeToolWithOnHand extends RecipeTool {
  onHand: boolean;
}

const state = createListStoreState<RecipeTool>();
const publicState = createListStoreState<RecipeTool>(state.store);
const api = () => userApi().tools;

export function resetToolStore() {
  state.store.set([]);
  state.loading.set(false);
  state.initialized.set(false);
  publicState.loading.set(false);
  publicState.initialized.set(false);
}

export const useToolData = function () {
  return useData<RecipeToolWithOnHand>({ id: "", name: "", slug: "", onHand: false, householdsWithTool: [] });
};

export const useToolStore = function () {
  return useStore<RecipeTool>("tool", state, api);
};

export const usePublicToolStore = function (groupSlug: string) {
  return useReadOnlyStore<RecipeTool>("tool", publicState, () => publicExploreApi(groupSlug).explore.tools);
};
