import { useCallback } from "react";
import { createListStoreState, useReadOnlyStore, useStore } from "../partials/use-store-factory";
import type { ReadCookBook, UpdateCookBook } from "~/lib/api/types/cookbook";
import { publicExploreApi, userApi } from "~/hooks/api";

const state = createListStoreState<ReadCookBook>();
const publicState = createListStoreState<ReadCookBook>(state.store);
const api = () => userApi().cookbooks;

export function resetCookbookStore() {
  state.store.set([]);
  state.loading.set(false);
  state.initialized.set(false);
  publicState.loading.set(false);
  publicState.initialized.set(false);
}

export const useCookbookStore = function () {
  const store = useStore<ReadCookBook>("cookbook", state, api);

  const updateAll = useCallback(async function (updateData: UpdateCookBook[]) {
    state.loading.set(true);
    updateData.forEach((cookbook, index) => {
      cookbook.position = index;
    });
    const { data } = await api().updateAll(updateData);
    state.loading.set(false);
    return data;
  }, []);
  return { ...store, updateAll };
};

export const usePublicCookbookStore = function (groupSlug: string) {
  return useReadOnlyStore<ReadCookBook>("cookbook", publicState, () => publicExploreApi(groupSlug).explore.cookbooks);
};

/**
 * The group's own store when the user belongs to it, the public (explore) store otherwise. One
 * hook call either way, so callers can switch on login state without breaking hook order.
 */
export const useCookbookStoreFor = function (isOwnGroup: boolean, groupSlug: string) {
  return useReadOnlyStore<ReadCookBook>(
    isOwnGroup ? "cookbook" : "cookbook",
    isOwnGroup ? state : publicState,
    isOwnGroup ? api : () => publicExploreApi(groupSlug).explore.cookbooks,
  );
};
