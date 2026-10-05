import { useReadOnlyStore } from "../partials/use-store-factory";
import type { HouseholdSummary } from "@/lib/api/types/household";
import { usePublicExploreApi, useUserApi } from "@/hooks/api";
import { createStore } from "@/lib/store";

const store = createStore<HouseholdSummary[]>([]);
const loading = createStore(false);
const initialized = createStore(false);
const publicLoading = createStore(false);
const publicInitialized = createStore(false);

export function resetHouseholdStore() {
  store.set([]);
  loading.set(false);
  initialized.set(false);
  publicLoading.set(false);
  publicInitialized.set(false);
}

export const useHouseholdStore = function () {
  const api = useUserApi();
  return useReadOnlyStore<HouseholdSummary>("household", store, loading, initialized, api.households);
};

export const usePublicHouseholdStore = function (groupSlug: string) {
  const api = usePublicExploreApi(groupSlug).explore;
  return useReadOnlyStore<HouseholdSummary>("household-public", store, publicLoading, publicInitialized, api.households);
};
