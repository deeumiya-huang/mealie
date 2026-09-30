import { useCallback, useEffect, useState } from "react";
import { userApi } from "~/hooks/api";
import { useUserApi } from "~/hooks/api";
import { getAuthBackend } from "~/hooks/use-auth-backend";
import { createStore, registerCacheReset, useStore } from "~/lib/store";
import type { GroupBase, GroupInDB, GroupSummary } from "~/lib/api/types/user";

const groupSelfStore = createStore<GroupSummary | null>(null);
const loadingStore = createStore(false);

export function resetGroupSelf() {
  groupSelfStore.set(null);
  loadingStore.set(false);
}
registerCacheReset(resetGroupSelf);

async function refreshGroupSelf() {
  if (!getAuthBackend().getUser()) {
    groupSelfStore.set(null);
    return;
  }
  loadingStore.set(true);
  const { data } = await userApi().groups.getCurrentUserGroup();
  groupSelfStore.set(data);
  loadingStore.set(false);
}

const groupSelfActions = {
  get() {
    if (!(groupSelfStore.get() || loadingStore.get())) {
      void refreshGroupSelf();
    }
    return groupSelfStore.get();
  },
  /** Replaces the cached group locally (the Vue pages mutated the shared ref directly). */
  set(next: GroupSummary | null | ((prev: GroupSummary | null) => GroupSummary | null)) {
    groupSelfStore.set(next);
  },
  async updatePreferences(preferences?: GroupSummary["preferences"]) {
    if (!groupSelfStore.get()) {
      await refreshGroupSelf();
    }
    const current = groupSelfStore.get();
    const prefs = preferences ?? current?.preferences;
    if (!current || !prefs) {
      return;
    }

    const { data } = await userApi().groups.setPreferences(prefs);
    if (data) {
      groupSelfStore.set({ ...current, preferences: data });
    }
    return data || undefined;
  },
  async updateAIProviderSettings(settings?: GroupSummary["aiProviderSettings"]) {
    if (!groupSelfStore.get()) {
      await refreshGroupSelf();
    }
    const current = groupSelfStore.get();
    const aiSettings = settings ?? current?.aiProviderSettings;
    if (!current || !aiSettings) {
      return;
    }

    const { data } = await userApi().groups.setAIProviderSettings(aiSettings);
    if (data) {
      groupSelfStore.set({ ...current, aiProviderSettings: data });
    }
    return data || undefined;
  },
  async refresh() {
    await refreshGroupSelf();
  },
};

export const useGroupSelf = function () {
  const group = useStore(groupSelfStore);
  const user = useStore(getAuthBackend().store).user;
  useEffect(() => {
    groupSelfActions.get();
  }, [user?.id]);
  return { actions: groupSelfActions, group };
};

export const useGroups = function () {
  const api = useUserApi();
  const [groups, setGroups] = useState<GroupInDB[] | null>(null);

  const getAllGroups = useCallback(async () => {
    const { data } = await api.groups.getAll(1, -1, { orderBy: "name", orderDirection: "asc" });
    setGroups(data ? data.items : null);
  }, [api]);

  const refreshAllGroups = getAllGroups;

  async function deleteGroup(id: string | number) {
    const { data } = await api.groups.deleteOne(id);
    await refreshAllGroups();
    return data;
  }

  async function createGroup(payload: GroupBase) {
    const { data } = await api.groups.createOne(payload);
    if (data) {
      setGroups(prev => (prev ? [...prev, data] : prev));
    }
  }

  // Initialize data on first call
  useEffect(() => {
    void getAllGroups();
  }, [getAllGroups]);

  return { groups, getAllGroups, refreshAllGroups, deleteGroup, createGroup };
};
