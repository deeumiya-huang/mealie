import { useData, useStore } from "../partials/use-store-factory";
import type { IngredientUnit } from "@/lib/api/types/recipe";
import { useUserApi } from "@/hooks/api";
import { createStore } from "@/lib/store";

const store = createStore<IngredientUnit[]>([]);
const loading = createStore(false);
const initialized = createStore(false);

export function resetUnitStore() {
  store.set([]);
  loading.set(false);
  initialized.set(false);
}

const defaultUnit: IngredientUnit = {
  id: "",
  name: "",
  fraction: true,
  abbreviation: "",
  description: "",
};

export const useUnitData = function () {
  return useData<IngredientUnit>(defaultUnit);
};

export const useUnitStore = function () {
  const api = useUserApi();
  return useStore<IngredientUnit>("unit", store, loading, initialized, api.units);
};
