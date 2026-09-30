import { useCallback, useEffect, useState } from "react";
import { adminApi, useAdminApi, userApi } from "~/hooks/api";
import { getAuthBackend } from "~/hooks/use-auth-backend";
import { createStore, registerCacheReset, useStore } from "~/lib/store";
import type { HouseholdCreate, HouseholdInDB } from "~/lib/api/types/household";

const householdSelfStore = createStore<HouseholdInDB | null>(null);
const loadingStore = createStore(false);

export function resetHouseholdSelf() {
  householdSelfStore.set(null);
  loadingStore.set(false);
}
registerCacheReset(resetHouseholdSelf);

async function refreshHouseholdSelf() {
  if (!getAuthBackend().getUser()) {
    householdSelfStore.set(null);
    return;
  }
  loadingStore.set(true);
  const { data } = await userApi().households.getCurrentUserHousehold();
  householdSelfStore.set(data);
  loadingStore.set(false);
}

const householdSelfActions = {
  get() {
    if (!(householdSelfStore.get() || loadingStore.get())) {
      void refreshHouseholdSelf();
    }
    return householdSelfStore.get();
  },
  set(next: HouseholdInDB | null | ((prev: HouseholdInDB | null) => HouseholdInDB | null)) {
    householdSelfStore.set(next);
  },
  async updatePreferences(preferences?: HouseholdInDB["preferences"]) {
    if (!householdSelfStore.get()) {
      await refreshHouseholdSelf();
    }
    const current = householdSelfStore.get();
    const prefs = preferences ?? current?.preferences;
    if (!current || !prefs) {
      return;
    }

    const { data } = await userApi().households.setPreferences(prefs);
    if (data) {
      householdSelfStore.set({ ...current, preferences: data });
    }
    return data || undefined;
  },
  async refresh() {
    await refreshHouseholdSelf();
  },
};

export const useHouseholdSelf = function () {
  const household = useStore(householdSelfStore);
  const user = useStore(getAuthBackend().store).user;
  useEffect(() => {
    householdSelfActions.get();
  }, [user?.id]);
  return { actions: householdSelfActions, household };
};

export const useAdminHouseholds = function () {
  const api = useAdminApi();
  const [households, setHouseholds] = useState<HouseholdInDB[] | null>(null);

  const getAllHouseholds = useCallback(async () => {
    const { data } = await api.households.getAll(1, -1, { orderBy: "name, group.name", orderDirection: "asc" });
    setHouseholds(data ? data.items : null);
  }, [api]);

  const refreshAllHouseholds = getAllHouseholds;

  async function deleteHousehold(id: string | number) {
    const { data } = await adminApi().households.deleteOne(id);
    await refreshAllHouseholds();
    return data;
  }

  async function createHousehold(payload: HouseholdCreate) {
    const { data } = await adminApi().households.createOne(payload);
    if (data) {
      setHouseholds(prev => (prev ? [...prev, data] : prev));
    }
  }

  /** Households belonging to one group (was a computed factory). */
  function householdsInGroup(groupId: string | null | undefined) {
    return households && groupId ? households.filter(h => h.groupId === groupId) : [];
  }

  useEffect(() => {
    void getAllHouseholds();
  }, [getAllHouseholds]);

  return {
    households,
    householdsInGroup,
    getAllHouseholds,
    refreshAllHouseholds,
    deleteHousehold,
    createHousehold,
  };
};
