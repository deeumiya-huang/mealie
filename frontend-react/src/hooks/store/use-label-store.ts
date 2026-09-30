import { createListStoreState, useData, useStore } from "../partials/use-store-factory";
import type { MultiPurposeLabelOut } from "~/lib/api/types/labels";
import { userApi } from "~/hooks/api";

const state = createListStoreState<MultiPurposeLabelOut>();
const api = () => userApi().multiPurposeLabels;

export function resetLabelStore() {
  state.store.set([]);
  state.loading.set(false);
  state.initialized.set(false);
}

export const useLabelData = function () {
  return useData<MultiPurposeLabelOut>({ groupId: "", id: "", name: "", color: "" });
};

export const useLabelStore = function () {
  return useStore<MultiPurposeLabelOut>("label", state, api);
};
