import { useData, useReadOnlyStore, useStore } from "../partials/use-store-factory";
import type { RecipeTool } from "@/lib/api/types/recipe";
import { usePublicExploreApi, useUserApi } from "@/hooks/api";
import { createStore } from "@/lib/store";

interface RecipeToolWithOnHand extends RecipeTool {
  onHand: boolean;
}

const store = createStore<RecipeTool[]>([]);
const loading = createStore(false);
const initialized = createStore(false);
const publicLoading = createStore(false);
const publicInitialized = createStore(false);

export function resetToolStore() {
  store.set([]);
  loading.set(false);
  initialized.set(false);
  publicLoading.set(false);
  publicInitialized.set(false);
}

const defaultTool: RecipeToolWithOnHand = {
  id: "",
  name: "",
  slug: "",
  onHand: false,
  householdsWithTool: [],
};

export const useToolData = function () {
  return useData<RecipeToolWithOnHand>(defaultTool);
};

export const useToolStore = function () {
  const api = useUserApi();
  return useStore<RecipeTool>("tool", store, loading, initialized, api.tools);
};

export const usePublicToolStore = function (groupSlug: string) {
  const api = usePublicExploreApi(groupSlug).explore;
  return useReadOnlyStore<RecipeTool>("tool", store, publicLoading, publicInitialized, api.tools);
};
