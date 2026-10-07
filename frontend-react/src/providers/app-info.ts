import axios from "axios";
import type { AppInfo } from "@/lib/api/types/admin";
import { createStore, useStore } from "@/lib/store";

/**
 * Port of plugins/app-info.client.ts: `/api/app/about`, fetched once before the app renders
 * (see AppInfoProvider). `getAppInfo()` is for plain modules, `useAppInfo()` for components.
 */
export const appInfoStore = createStore<AppInfo | null>(null);

let loading: Promise<AppInfo> | null = null;

export function loadAppInfo(): Promise<AppInfo> {
  const known = appInfoStore.get();
  if (known && !loading) {
    loading = Promise.resolve(known);
  }
  // A failed request stays cached: React re-renders the suspended gate when it settles, and a fresh request
  // there would retry in a loop. AppInfoProvider shows the error; a page reload retries.
  loading ??= axios.get<AppInfo>("/api/app/about").then(({ data }) => {
    appInfoStore.set(data);
    return data;
  });
  return loading;
}

export function setAppInfo(info: AppInfo | null) {
  appInfoStore.set(info);
}

/** The loaded app info. Only call after AppInfoProvider has rendered its children. */
export function getAppInfo(): AppInfo {
  const info = appInfoStore.get();
  if (!info) {
    throw new Error("App info is not loaded yet (render inside AppInfoProvider)");
  }
  return info;
}

export function useAppInfo(): AppInfo {
  const info = useStore(appInfoStore);
  if (!info) {
    throw new Error("useAppInfo() must be used inside AppInfoProvider");
  }
  return info;
}
