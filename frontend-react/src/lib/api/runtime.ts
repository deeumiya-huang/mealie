import axios from "axios";
import type { AxiosInstance } from "axios";

/**
 * Hooks the API clients need from the running app, without importing React or app state.
 *
 * In the Vue app these were Nuxt auto-imports (`useNuxtApp()`, `useMealieAuth()`, `getGlobalI18n()`)
 * called from inside the clients. The React app wires them up once at bootstrap (src/app/bootstrap.ts).
 */
export interface ApiRuntime {
  axios: () => AxiosInstance;
  getToken: () => string | null;
  getLocale: () => string;
}

export const apiRuntime: ApiRuntime = {
  axios: () => axios,
  getToken: () => null,
  getLocale: () => "en-US",
};

export function configureApiRuntime(overrides: Partial<ApiRuntime>) {
  Object.assign(apiRuntime, overrides);
}
