import { useMemo } from "react";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { ApiRequestInstance, RequestResponse } from "~/lib/api/types/non-generated";
import { AdminAPI, PublicApi, UserApi } from "~/lib/api";
import { PublicExploreApi } from "~/lib/api/client-public";
import { apiHttp } from "~/app/services";
import { useI18n } from "~/hooks/use-global-i18n";

const request = {
  async safe<T, U>(
    funcCall: (url: string, data: U, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>>,
    url: string,
    data: U,
    config?: AxiosRequestConfig,
  ): Promise<RequestResponse<T>> {
    let error = null;
    const response = await funcCall(url, data, config).catch(function (e) {
      console.log(e);
      // Insert Generic Error Handling Here
      error = e;
      return null;
    });
    return { response, error, data: response?.data ?? null };
  },
};

export function getRequests(axiosInstance: AxiosInstance): ApiRequestInstance {
  return {
    async get<T>(url: string, params = {}, config?: AxiosRequestConfig): Promise<RequestResponse<T>> {
      let error = null;
      const response = await axiosInstance.get<T>(url, { ...config, params }).catch((e) => {
        error = e;
      });
      if (response != null) {
        return { response, error, data: response?.data };
      }
      return { response: null, error, data: null };
    },

    async post<T, U>(url: string, data: U, config?: AxiosRequestConfig) {
      return await request.safe<T, U>(axiosInstance.post, url, data, config);
    },

    async put<T, U = T>(url: string, data: U, config?: AxiosRequestConfig) {
      return await request.safe<T, U>(axiosInstance.put, url, data, config);
    },

    async patch<T, U = Partial<T>>(url: string, data: U, config?: AxiosRequestConfig) {
      return await request.safe<T, U>(axiosInstance.patch, url, data, config);
    },

    async delete<T>(url: string, config?: AxiosRequestConfig) {
      return await request.safe<T, undefined>(axiosInstance.delete, url, undefined, config);
    },
  };
}

/**
 * Non-hook API factories, for code that runs outside components (stores, helpers). Each call sets the
 * Accept-Language header from the current locale, as the Vue `useRequests()` did.
 */
export const requests = (): ApiRequestInstance => getRequests(apiHttp());
export const userApi = (): UserApi => new UserApi(requests());
export const adminApi = (): AdminAPI => new AdminAPI(requests());
export const publicApi = (): PublicApi => new PublicApi(requests());
export const publicExploreApi = (groupSlug: string): PublicExploreApi => new PublicExploreApi(requests(), groupSlug);

// Hooks: stable per locale, so they are safe to list as effect dependencies.

export function useUserApi(): UserApi {
  const { locale } = useI18n();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when the locale changes (header)
  return useMemo(() => userApi(), [locale]);
}

export function useAdminApi(): AdminAPI {
  const { locale } = useI18n();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when the locale changes (header)
  return useMemo(() => adminApi(), [locale]);
}

export function usePublicApi(): PublicApi {
  const { locale } = useI18n();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when the locale changes (header)
  return useMemo(() => publicApi(), [locale]);
}

export function usePublicExploreApi(groupSlug: string): PublicExploreApi {
  const { locale } = useI18n();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when the locale changes (header)
  return useMemo(() => publicExploreApi(groupSlug), [groupSlug, locale]);
}
