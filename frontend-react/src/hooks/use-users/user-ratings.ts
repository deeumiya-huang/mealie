import { useEffect } from "react";
import { userApi } from "@/hooks/api/api-client";
import { authStore } from "@/hooks/use-auth-backend";
import { registerCacheReset } from "@/hooks/use-clear-composable-caches";
import { createStore, useStore } from "@/lib/store";
import type { UserRatingSummary } from "@/lib/api/types/user";

// Module state shared by every component (Vue: module-level refs).
const userRatings = createStore<UserRatingSummary[]>([]);
const loading = createStore(false);
const ready = createStore(false);

export function resetUserSelfRatings() {
  userRatings.set([]);
  loading.set(false);
  ready.set(false);
}
registerCacheReset(resetUserSelfRatings);

async function refreshUserRatings() {
  if (!authStore.get().user || loading.get()) {
    return;
  }

  loading.set(true);

  const { data } = await userApi.users.getSelfRatings();
  userRatings.set(data?.ratings || []);

  loading.set(false);
  ready.set(true);
}

async function setRating(slug: string, rating: number | null, isFavorite: boolean | null) {
  loading.set(true);

  const userId = authStore.get().user?.id || "";
  await userApi.users.setRating(userId, slug, rating, isFavorite);

  loading.set(false);
  await refreshUserRatings();
}

export const useUserSelfRatings = function () {
  const ratings = useStore(userRatings);
  const isReady = useStore(ready);

  // Vue: `if (!ready.value) refreshUserRatings()` during setup
  useEffect(() => {
    if (!ready.get()) {
      void refreshUserRatings();
    }
  }, []);

  return {
    userRatings: ratings,
    refreshUserRatings,
    setRating,
    ready: isReady,
  };
};
