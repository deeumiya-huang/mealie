import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { publicExploreApi, userApi } from "~/hooks/api";
import { createStore, registerCacheReset, useStore } from "~/lib/store";
import { isSafeRedirectTarget } from "~/lib/validators/redirect";
import type { OrderByNullPosition, Recipe } from "~/lib/api/types/recipe";
import type { RecipeSearchQuery } from "~/lib/api/user/recipes/recipe";

export const allRecipesStore = createStore<Recipe[]>([]);
export const recentRecipesStore = createStore<Recipe[]>([]);

export function resetRecipes() {
  allRecipesStore.set([]);
  recentRecipesStore.set([]);
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
}

/** Recipe list with incremental loading. Passing a group slug switches to the public API. */
export const useLazyRecipes = function (publicGroupSlug: string | null = null) {
  const navigate = useNavigate();
  const location = useLocation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const api = useCallback(() => (publicGroupSlug ? publicExploreApi(publicGroupSlug).explore : userApi()), [publicGroupSlug]);

  const fetchMore = useCallback(async (
    page: number,
    perPage: number,
    orderBy: string | null = null,
    orderDirection = "desc",
    orderByNullPosition: OrderByNullPosition | null = null,
    query: RecipeSearchQuery | null = null,
    queryFilter: string | null = null,
  ) => {
    const { data, error } = await api().recipes.getAll(
      page,
      perPage,
      getParams(orderBy, orderDirection, orderByNullPosition, query, queryFilter),
    );

    if ((error as { response?: { status?: number } } | null)?.response?.status === 404) {
      const redirect = new URLSearchParams(location.search).get("redirect") ?? undefined;
      void navigate(isSafeRedirectTarget(redirect) ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login");
    }

    return data ? data.items : [];
  }, [api, location.search, navigate]);

  const appendRecipes = useCallback((val: Recipe[]) => setRecipes(prev => [...prev, ...val]), []);
  const assignSorted = useCallback((val: Recipe[]) => setRecipes(val), []);
  const replaceRecipes = assignSorted;
  const removeRecipe = useCallback((slug: string) => {
    setRecipes((prev) => {
      const index = prev.findIndex(r => r.slug === slug);
      return index === -1 ? prev : [...prev.slice(0, index), ...prev.slice(index + 1)];
    });
  }, []);

  const getRandom = useCallback(async (query: RecipeSearchQuery | null = null, queryFilter: string | null = null) => {
    const q: RecipeSearchQuery = { ...(query || {}) };
    q._searchSeed = q._searchSeed || Date.now().toString();
    const { data } = await api().recipes.getAll(1, 1, getParams("random", "desc", null, q, queryFilter));
    if (data?.items.length) {
      return data.items[0];
    }
  }, [api]);

  return { recipes, fetchMore, appendRecipes, assignSorted, removeRecipe, replaceRecipes, getRandom };
};

export const useRecipes = (
  all = false,
  fetchRecipes = true,
  loadFood = false,
  queryFilter: string | null = null,
  publicGroupSlug: string | null = null,
) => {
  const store = all ? allRecipesStore : recentRecipesStore;
  const page = 1;
  const perPage = all ? -1 : 30;
  const recipes = useStore(store);

  const refreshRecipes = useCallback(async () => {
    const api = publicGroupSlug ? publicExploreApi(publicGroupSlug).explore : userApi();
    const { data } = await api.recipes.getAll(page, perPage, { loadFood, orderBy: "created_at", queryFilter });
    if (data) store.set(data.items);
  }, [publicGroupSlug, perPage, loadFood, queryFilter, store]);

  useEffect(() => {
    if (fetchRecipes) void refreshRecipes();
  }, [fetchRecipes, refreshRecipes]);

  const actions = useMemo(() => ({
    getAllRecipes: () => void refreshRecipes(),
    assignSorted: (val: Recipe[]) => store.set(val),
    refreshRecipes,
  }), [refreshRecipes, store]);

  return { recipes, ...actions };
};
