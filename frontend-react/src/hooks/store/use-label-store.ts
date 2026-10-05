import { useData, useStore } from "../partials/use-store-factory";
import type { MultiPurposeLabelOut } from "@/lib/api/types/labels";
import { useUserApi } from "@/hooks/api";
import { createStore } from "@/lib/store";

const store = createStore<MultiPurposeLabelOut[]>([]);
const loading = createStore(false);
const initialized = createStore(false);

export function resetLabelStore() {
  store.set([]);
  loading.set(false);
  initialized.set(false);
}

const defaultLabel: MultiPurposeLabelOut = {
  groupId: "",
  id: "",
  name: "",
  color: "",
};

export const useLabelData = function () {
  return useData<MultiPurposeLabelOut>(defaultLabel);
};

export const useLabelStore = function () {
  const api = useUserApi();
  return useStore<MultiPurposeLabelOut>("label", store, loading, initialized, api.multiPurposeLabels);
};
