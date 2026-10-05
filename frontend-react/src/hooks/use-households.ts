import { useCallback, useEffect, useState } from "react";
import { useAdminApi } from "@/hooks/api";
import { userApi } from "@/hooks/api/api-client";
import { authStore } from "@/hooks/use-auth-backend";
import { registerCacheReset } from "@/hooks/use-clear-composable-caches";
import type { HouseholdCreate, HouseholdInDB, UpdateHouseholdPreferences } from "@/lib/api/types/household";
import { createStore, useStore } from "@/lib/store";

// Port of composables/use-households.ts. The current user's household is module state shared by
// every component (Vue: module-level ref); the first component that needs it triggers the load.

const householdSelf = createStore<HouseholdInDB | null>(null);
let loading = false;

export function resetHouseholdSelf() {
  householdSelf.set(null);
  loading = false;
}
registerCacheReset(resetHouseholdSelf);

async function refreshHouseholdSelf() {
  if (!authStore.get().user) {
    householdSelf.set(null);
    return;
  }
  loading = true;
  const { data } = await userApi.households.getCurrentUserHousehold();
  householdSelf.set(data);
  loading = false;
}

const householdSelfActions = {
  /** Loads the household unless it is loaded or loading (Vue `actions.get()`). */
  get() {
    if (!(householdSelf.get() || loading)) {
      void refreshHouseholdSelf();
    }
    return householdSelf.get();
  },
  /**
   * Saves the household preferences. Vue callers mutated `household.preferences` in place and then
   * called this; React callers pass the edited preferences (default: the current ones).
   */
  async updatePreferences(preferences?: UpdateHouseholdPreferences) {
    if (!householdSelf.get()) {
      await refreshHouseholdSelf();
    }
    const payload = preferences ?? householdSelf.get()?.preferences;
    if (!payload) {
      return;
    }

    const { data } = await userApi.households.setPreferences(payload);

    if (data) {
      householdSelf.set(current => (current ? { ...current, preferences: data } : current));
    }

    return data || undefined;
  },
  async refresh() {
    await refreshHouseholdSelf();
  },
  /** Local edit of the shared household (Vue: mutating the ref before saving). */
  set(next: HouseholdInDB | null | ((prev: HouseholdInDB | null) => HouseholdInDB | null)) {
    householdSelf.set(next);
  },
};

export const useHouseholdSelf = function () {
  const household = useStore(householdSelf);

  useEffect(() => {
    householdSelfActions.get();
  }, []);

  return { actions: householdSelfActions, household };
};

/** Households of one group (Vue `useHouseholdsInGroup(groupIdRef)` computed; plain filter here). */
export function householdsInGroup(households: HouseholdInDB[] | null, groupId: string | null | undefined) {
  return households && groupId ? households.filter(h => h.groupId === groupId) : [];
}

export const useAdminHouseholds = function () {
  const api = useAdminApi();
  const [households, setHouseholds] = useState<HouseholdInDB[] | null>(null);

  const fetchHouseholds = useCallback(
    () => api.households.getAll(1, -1, { orderBy: "name, group.name", orderDirection: "asc" }),
    [api],
  );

  const getAllHouseholds = useCallback(async () => {
    const { data } = await fetchHouseholds();
    setHouseholds(data ? data.items : null);
  }, [fetchHouseholds]);

  const refreshAllHouseholds = useCallback(async () => {
    await getAllHouseholds();
  }, [getAllHouseholds]);

  const deleteHousehold = useCallback(async (id: string | number) => {
    const { data } = await api.households.deleteOne(id);
    await refreshAllHouseholds();
    return data;
  }, [api, refreshAllHouseholds]);

  const createHousehold = useCallback(async (payload: HouseholdCreate) => {
    const { data } = await api.households.createOne(payload);
    if (data) {
      setHouseholds(current => (current ? [...current, data] : current));
    }
  }, [api]);

  useEffect(() => {
    let active = true;
    void fetchHouseholds().then(({ data }) => {
      if (active) {
        setHouseholds(data ? data.items : null);
      }
    });
    return () => {
      active = false;
    };
  }, [fetchHouseholds]);

  return {
    households,
    householdsInGroup: (groupId: string | null | undefined) => householdsInGroup(households, groupId),
    getAllHouseholds,
    refreshAllHouseholds,
    deleteHousehold,
    createHousehold,
  };
};
