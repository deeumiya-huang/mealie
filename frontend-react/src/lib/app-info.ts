import axios from "axios";
import type { AppInfo } from "~/lib/api/types/admin";
import { createStore, useStore } from "~/lib/store";

/** Replaces the Nuxt `$appInfo` plugin: fetched once before the app renders. */
export const appInfoStore = createStore<AppInfo>({
  production: false,
  version: "",
  demoStatus: false,
  allowSignup: false,
  allowPasswordLogin: true,
  enableOidc: false,
  oidcRedirect: false,
  oidcProviderName: "",
  tokenTime: 0,
});

export async function loadAppInfo(): Promise<AppInfo> {
  const { data } = await axios.get<AppInfo>("/api/app/about");
  appInfoStore.set(data);
  return data;
}

export function getAppInfo(): AppInfo {
  return appInfoStore.get();
}

export function useAppInfo(): AppInfo {
  return useStore(appInfoStore);
}
