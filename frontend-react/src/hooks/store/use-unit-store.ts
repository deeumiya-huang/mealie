import { createListStoreState, useData, useStore } from "../partials/use-store-factory";
import type { IngredientUnit } from "~/lib/api/types/recipe";
import { userApi } from "~/hooks/api";

const state = createListStoreState<IngredientUnit>();
const api = () => userApi().units;

export function resetUnitStore() {
  state.store.set([]);
  state.loading.set(false);
  state.initialized.set(false);
}

export const useUnitData = function () {
  return useData<IngredientUnit>({ id: "", name: "", fraction: true, abbreviation: "", description: "" });
};

export const useUnitStore = function () {
  return useStore<IngredientUnit>("unit", state, api);
};
