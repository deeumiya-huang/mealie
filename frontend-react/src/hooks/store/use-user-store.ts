import { createListStoreState, useReadOnlyStore } from "../partials/use-store-factory";
import type { UserSummary } from "~/lib/api/types/user";
import { BaseCRUDAPIReadOnly } from "~/lib/api/base/base-clients";
import { requests } from "~/hooks/api";

const state = createListStoreState<UserSummary>();

export function resetUserStore() {
  state.store.set([]);
  state.loading.set(false);
  state.initialized.set(false);
}

class GroupUserAPIReadOnly extends BaseCRUDAPIReadOnly<UserSummary> {
  baseRoute = "/api/groups/members";
  itemRoute = (idOrUsername: string | number) => `/groups/members/${idOrUsername}`;
}

const api = () => new GroupUserAPIReadOnly(requests());

export const useUserStore = function () {
  return useReadOnlyStore<UserSummary>("user", state, api, { orderBy: "full_name" });
};
