import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useUserApi } from "@/hooks/api";
import { usePublicExploreApi } from "@/hooks/api/api-client";
import { registerCacheReset } from "@/hooks/use-clear-composable-caches";
import { isSafeRedirectTarget } from "@/lib/validators/redirect";
import { createStore } from "@/lib/store";
import type { OrderByNullPosition, Recipe } from "@/lib/api/types/recipe";
import type { RecipeSearchQuery } from "@/lib/api/user/recipes/recipe";

// Vue module-level refs; read them in components with `useStore(allRecipes)`.
export const allRecipes = createStore<Recipe[]>([]);
export const recentRecipes = createStore<Recipe[]>([]);

export function resetRecipes() {
  allRecipes.set([]);
  recentRecipes.set([]);
}
registerCacheReset(resetRecipes);

function getParams(
  orderBy: string | null = null,
  orderDirection = "desc",
  orderByNullPosition: OrderByNullPosition | null = null,
  query: RecipeSearchQuery | null = null,
  queryFilter: string | null = null,
) {
  return {
    orderBy,
    orderDirection,
    orderByNullPosition,
    paginationSeed: query?._searchSeed, // propagate searchSeed to stabilize random order pagination
    searchSeed: query?._searchSeed, // unused, but pass it along for completeness of data
    search: query?.search,
    cookbook: query?.cookbook,
    households: query?.households,
    categories: query?.categories,
    requireAllCategories: query?.requireAllCategories,
    tags: query?.tags,
    requireAllTags: query?.requireAllTags,
    tools: query?.tools,
    requireAllTools: query?.requireAllTools,
    foods: query?.foods,
    requireAllFoods: query?.requireAllFoods,
    queryFilter,
  };
};

export const useLazyRecipes = function (publicGroupSlug: string | null = null) {
  const navigate = useNavigate();
  const location = useLocation();

  // passing the group slug switches to using the public API
  const userApi = useUserApi();
  const exploreApi = usePublicExploreApi(publicGroupSlug ?? "").explore;
  const api = publicGroupSlug ? exploreApi : userApi;

  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const fetchMore = useCallback(async (
    page: number,
    perPage: number,
    orderBy: string | null = null,
    orderDirection = "desc",
    orderByNullPosition: OrderByNullPosition | null = null,
    query: RecipeSearchQuery | null = null,
    queryFilter: string | null = null,
  ) => {
    const { data, error } = await api.recipes.getAll(
      page,
      perPage,
      getParams(orderBy, orderDirection, orderByNullPosition, query, queryFilter),
    );

    if (error?.response?.status === 404) {
      const redirectParam = new URLSearchParams(location.search).get("redirect");
      const redirect = redirectParam ?? undefined;
      void navigate(isSafeRedirectTarget(redirect) ? `/login?redirect=${encodeURIComponent(redirect as string)}` : "/login");
    }

    return data ? data.items : [];
  }, [api, location.search, navigate]);

  const appendRecipes = useCallback((val: Array<Recipe>) => {
    setRecipes(current => [...current, ...val]);
  }, []);

  const assignSorted = useCallback((val: Array<Recipe>) => {
    setRecipes(val);
  }, []);

  const removeRecipe = useCallback((slug: string) => {
    setRecipes((current) => {
      const index = current.findIndex(recipe => recipe.slug === slug);
      if (index === -1) {
        return current;
      }
      return [...current.slice(0, index), ...current.slice(index + 1)];
    });
  }, []);

  const replaceRecipes = useCallback((val: Array<Recipe>) => {
    setRecipes(val);
  }, []);

  const getRandom = useCallback(async (query: RecipeSearchQuery | null = null, queryFilter: string | null = null) => {
    query = query || {};
    query._searchSeed = query._searchSeed || Date.now().toString();
    const { data } = await api.recipes.getAll(1, 1, getParams("random", "desc", null, query, queryFilter));
    if (data?.items.length) {
      return data.items[0];
    }
  }, [api]);

  return {
    recipes,
    fetchMore,
    appendRecipes,
    assignSorted,
    removeRecipe,
    replaceRecipes,
    getRandom,
  };
};

export const useRecipes = (
  all = false,
  fetchRecipes = true,
  loadFood = false,
  queryFilter: string | null = null,
  publicGroupSlug: string | null = null,
) => {
  const userApi = useUserApi();
  const exploreApi = usePublicExploreApi(publicGroupSlug ?? "").explore;
  const api = publicGroupSlug ? exploreApi : userApi;

  // the recipes themselves live in the module-level stores (read with `useStore`)
  const recipes = all ? allRecipes : recentRecipes;
  const page = 1;
  const perPage = all ? -1 : 30;

  const refreshRecipes = useCallback(async () => {
    const { data } = await api.recipes.getAll(page, perPage, { loadFood, orderBy: "created_at", queryFilter });
    if (data) {
      recipes.set(data.items);
    }
  }, [api, perPage, loadFood, queryFilter, recipes]);

  const getAllRecipes = useCallback(async () => {
    await refreshRecipes();
  }, [refreshRecipes]);

  const assignSorted = useCallback((val: Array<Recipe>) => {
    recipes.set(val);
  }, [recipes]);

  useEffect(() => {
    if (fetchRecipes) {
      void refreshRecipes();
    }
  }, [fetchRecipes, refreshRecipes]);

  return { getAllRecipes, assignSorted, refreshRecipes };
};
