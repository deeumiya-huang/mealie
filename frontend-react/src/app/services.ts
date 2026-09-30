import type { AxiosInstance } from "axios";
import { createAxiosInstance } from "~/lib/http/axios";
import { configureApiRuntime } from "~/lib/api/runtime";
import { AUTH_TOKEN } from "~/lib/constants";
import { navigate } from "~/lib/navigation";
import { createAuthBackend, setAuthBackend } from "~/hooks/use-auth-backend";
import { currentLocale } from "~/i18n";

/**
 * App-wide singletons, the equivalent of the Nuxt plugins `axios`, `init-auth` and the `$axios`
 * injection. Created on first import; bootstrap (./bootstrap.ts) then starts the session.
 */
const authBackend = createAuthBackend({
  http: () => apiHttp(),
  navigate: to => navigate(to),
  tokenName: AUTH_TOKEN,
});
setAuthBackend(authBackend);

const axiosInstance: AxiosInstance = createAxiosInstance({
  tokenName: AUTH_TOKEN,
  refresh: () => authBackend.refresh(),
  setToken: token => authBackend.setToken(token),
});

configureApiRuntime({
  axios: () => apiHttp(),
  getToken: () => authBackend.getToken(),
  getLocale: () => currentLocale(),
});

/** The configured axios instance (`$axios` in the Vue app). */
export function apiHttp(): AxiosInstance {
  axiosInstance.defaults.headers.common["Accept-Language"] = currentLocale();
  return axiosInstance;
}

export { authBackend };
