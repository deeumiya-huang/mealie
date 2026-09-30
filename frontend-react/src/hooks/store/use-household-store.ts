import { createListStoreState, useReadOnlyStore } from "../partials/use-store-factory";
import type { HouseholdSummary } from "~/lib/api/types/household";
import { publicExploreApi, userApi } from "~/hooks/api";

const state = createListStoreState<HouseholdSummary>();
const publicState = createListStoreState<HouseholdSummary>(state.store);
const api = () => userApi().households;

export function resetHouseholdStore() {
  state.store.set([]);
  state.loading.set(false);
  state.initialized.set(false);
  publicState.loading.set(false);
  publicState.initialized.set(false);
}

export const useHouseholdStore = function () {
  return useReadOnlyStore<HouseholdSummary>("household", state, api);
};

export const usePublicHouseholdStore = function (groupSlug: string) {
  return useReadOnlyStore<HouseholdSummary>("household-public", publicState, () => publicExploreApi(groupSlug).explore.households);
};

/**
 * The group's own store when the user belongs to it, the public (explore) store otherwise. One
 * hook call either way, so callers can switch on login state without breaking hook order.
 */
export const useHouseholdStoreFor = function (isOwnGroup: boolean, groupSlug: string) {
  return useReadOnlyStore<HouseholdSummary>(
    isOwnGroup ? "household" : "household-public",
    isOwnGroup ? state : publicState,
    isOwnGroup ? api : () => publicExploreApi(groupSlug).explore.households,
  );
};
