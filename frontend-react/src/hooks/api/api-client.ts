import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";
import type { ApiRequestInstance, RequestResponse } from "@/lib/api/types/non-generated";
import { AdminAPI, PublicApi, UserApi } from "@/lib/api";
import { PublicExploreApi } from "@/lib/api/client-public";
import { http } from "@/lib/http";

// Port of composables/api/api-client.ts. The clients are stateless wrappers around the shared axios
// instance, so they are created once; the Accept-Language header is set per request in lib/http.ts.

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

/** The shared request wrapper, for module-level API clients (stores). */
export const apiRequests = getRequests(http);
const requests = apiRequests;
const adminApi = new AdminAPI(requests);
const userApi = new UserApi(requests);
const publicApi = new PublicApi(requests);
const exploreApis = new Map<string, PublicExploreApi>();

export function useRequests(): ApiRequestInstance {
  return requests;
}

export function useAdminApi(): AdminAPI {
  return adminApi;
}

export function useUserApi(): UserApi {
  return userApi;
}

export function usePublicApi(): PublicApi {
  return publicApi;
}

export function usePublicExploreApi(groupSlug: string): PublicExploreApi {
  let api = exploreApis.get(groupSlug);
  if (!api) {
    api = new PublicExploreApi(requests, groupSlug);
    exploreApis.set(groupSlug, api);
  }
  return api;
}
