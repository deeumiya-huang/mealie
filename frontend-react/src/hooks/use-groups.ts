import { useCallback, useEffect, useState } from "react";
import { useUserApi } from "@/hooks/api";
import { userApi } from "@/hooks/api/api-client";
import { authStore } from "@/hooks/use-auth-backend";
import { registerCacheReset } from "@/hooks/use-clear-composable-caches";
import type { AIProviderSettingsUpdate, UpdateGroupPreferences } from "@/lib/api/types/group";
import type { GroupBase, GroupInDB, GroupSummary } from "@/lib/api/types/user";
import { createStore, useStore } from "@/lib/store";

// Port of composables/use-groups.ts. The current user's group is module state shared by every
// component (Vue: module-level ref); the first component that needs it triggers the load.

const groupSelf = createStore<GroupSummary | null>(null);
let loading = false;

export function resetGroupSelf() {
  groupSelf.set(null);
  loading = false;
}
registerCacheReset(resetGroupSelf);

async function refreshGroupSelf() {
  if (!authStore.get().user) {
    groupSelf.set(null);
    return;
  }
  loading = true;
  const { data } = await userApi.groups.getCurrentUserGroup();
  groupSelf.set(data);
  loading = false;
}

const groupSelfActions = {
  /** Loads the group unless it is loaded or loading (Vue `actions.get()`). */
  get() {
    if (!(groupSelf.get() || loading)) {
      void refreshGroupSelf();
    }
    return groupSelf.get();
  },
  /**
   * Saves the group preferences. Vue callers mutated `group.preferences` in place and then called
   * this; React callers pass the edited preferences (default: the current ones).
   */
  async updatePreferences(preferences?: UpdateGroupPreferences) {
    if (!groupSelf.get()) {
      await refreshGroupSelf();
    }
    const payload = preferences ?? groupSelf.get()?.preferences;
    if (!payload) {
      return;
    }

    const { data } = await userApi.groups.setPreferences(payload);

    if (data) {
      groupSelf.set(current => (current ? { ...current, preferences: data } : current));
    }

    return data || undefined;
  },
  /** Same pattern as `updatePreferences` for the AI provider settings. */
  async updateAIProviderSettings(settings?: AIProviderSettingsUpdate) {
    if (!groupSelf.get()) {
      await refreshGroupSelf();
    }
    const payload = settings ?? groupSelf.get()?.aiProviderSettings;
    if (!payload) {
      return;
    }

    const { data } = await userApi.groups.setAIProviderSettings(payload);

    if (data) {
      groupSelf.set(current => (current ? { ...current, aiProviderSettings: data } : current));
    }

    return data || undefined;
  },
  async refresh() {
    await refreshGroupSelf();
  },
  /** Local edit of the shared group (Vue: mutating the ref before saving). */
  set(next: GroupSummary | null | ((prev: GroupSummary | null) => GroupSummary | null)) {
    groupSelf.set(next);
  },
};

export const useGroupSelf = function () {
  const group = useStore(groupSelf);

  useEffect(() => {
    groupSelfActions.get();
  }, []);

  return { actions: groupSelfActions, group };
};

export const useGroups = function () {
  const api = useUserApi();
  const [groups, setGroups] = useState<GroupInDB[] | null>(null);

  const fetchGroups = useCallback(() => api.groups.getAll(1, -1, { orderBy: "name", orderDirection: "asc" }), [api]);

  const getAllGroups = useCallback(async () => {
    const { data } = await fetchGroups();
    setGroups(data ? data.items : null);
  }, [fetchGroups]);

  const refreshAllGroups = useCallback(async () => {
    await getAllGroups();
  }, [getAllGroups]);

  const deleteGroup = useCallback(async (id: string | number) => {
    const { data } = await api.groups.deleteOne(id);
    await refreshAllGroups();
    return data;
  }, [api, refreshAllGroups]);

  const createGroup = useCallback(async (payload: GroupBase) => {
    const { data } = await api.groups.createOne(payload);
    if (data) {
      setGroups(current => (current ? [...current, data] : current));
    }
  }, [api]);

  // Initialize data on first render
  useEffect(() => {
    let active = true;
    void fetchGroups().then(({ data }) => {
      if (active) {
        setGroups(data ? data.items : null);
      }
    });
    return () => {
      active = false;
    };
  }, [fetchGroups]);

  return { groups, getAllGroups, refreshAllGroups, deleteGroup, createGroup };
};
