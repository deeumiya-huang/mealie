import { useEffect } from "react";
import { userApi } from "~/hooks/api";
import { getAuthBackend } from "~/hooks/use-auth-backend";
import { createStore, registerCacheReset, useStore } from "~/lib/store";
import type { UserRatingSummary } from "~/lib/api/types/user";

const userRatingsStore = createStore<UserRatingSummary[]>([]);
const readyStore = createStore(false);
let loading = false;

export function resetUserSelfRatings() {
  userRatingsStore.set([]);
  loading = false;
  readyStore.set(false);
}
registerCacheReset(resetUserSelfRatings);

export async function refreshUserRatings() {
  if (!getAuthBackend().getUser() || loading) {
    return;
  }

  loading = true;
  const { data } = await userApi().users.getSelfRatings();
  userRatingsStore.set(data?.ratings || []);
  loading = false;
  readyStore.set(true);
}

export async function setRating(slug: string, rating: number | null, isFavorite: boolean | null) {
  loading = true;
  const userId = getAuthBackend().getUser()?.id || "";
  await userApi().users.setRating(userId, slug, rating, isFavorite);
  loading = false;
  await refreshUserRatings();
}

export const useUserSelfRatings = function () {
  const userRatings = useStore(userRatingsStore);
  const ready = useStore(readyStore);

  useEffect(() => {
    if (!readyStore.get()) {
      void refreshUserRatings();
    }
  }, []);

  return { userRatings, refreshUserRatings, setRating, ready };
};
