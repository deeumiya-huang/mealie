import { useReadOnlyStore } from "../partials/use-store-factory";
import { apiRequests } from "../api/api-client";
import type { UserSummary } from "@/lib/api/types/user";
import { BaseCRUDAPIReadOnly } from "@/lib/api/base/base-clients";
import { createStore } from "@/lib/store";

const store = createStore<UserSummary[]>([]);
const loading = createStore(false);
const initialized = createStore(false);

export function resetUserStore() {
  store.set([]);
  loading.set(false);
  initialized.set(false);
}

class GroupUserAPIReadOnly extends BaseCRUDAPIReadOnly<UserSummary> {
  baseRoute = "/api/groups/members";
  itemRoute = (idOrUsername: string | number) => `/groups/members/${idOrUsername}`;
}

const api = new GroupUserAPIReadOnly(apiRequests);

export const useUserStore = function () {
  return useReadOnlyStore<UserSummary>("user", store, loading, initialized, api, { orderBy: "full_name" });
};
