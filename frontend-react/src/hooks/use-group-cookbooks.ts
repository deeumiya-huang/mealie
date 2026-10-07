import { useCallback, useState } from "react";
import { useAsyncKey as newAsyncKey } from "./use-utils";
import { usePublicExploreApi, useUserApi } from "./api";
import { useAsyncData } from "./utils";

// Port of composables/use-group-cookbooks.ts. Vue's `getOne(id)` was itself a composable (it called `useAsyncData`
// and returned a ref), so React splits it: `useCookbook().getOne` is the plain fetch and `useCookbookData(slug, id)`
// the hook that loads the cookbook for a component (a fresh async key per mount, like Vue's `useAsyncKey()`).
export const useCookbook = function (publicGroupSlug: string | null = null) {
  const userApi = useUserApi();
  const exploreApi = usePublicExploreApi(publicGroupSlug ?? "").explore;

  const getOne = useCallback(async (id: string | number) => {
    // passing the group slug switches to using the public API
    const api = publicGroupSlug ? exploreApi : userApi;
    const { data } = await api.cookbooks.getOne(id);

    return data;
  }, [publicGroupSlug, exploreApi, userApi]);

  return { getOne };
};

/** Loads one cookbook; `data` is the cookbook (null while loading or when it does not exist). */
export const useCookbookData = function (publicGroupSlug: string | null, id: string | number) {
  const { getOne } = useCookbook(publicGroupSlug);
  const [key] = useState(() => newAsyncKey());
  return useAsyncData(key, () => getOne(id), [getOne, id]);
};
