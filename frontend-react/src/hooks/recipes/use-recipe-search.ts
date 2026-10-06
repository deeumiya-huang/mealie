import { useCallback, useRef, useState } from "react";
import { useDebouncedCallback } from "@/hooks/utils";
import type { UserApi } from "@/lib/api";
import type { ExploreApi } from "@/lib/api/public/explore";
import type { Recipe } from "@/lib/api/types/recipe";

export interface UseRecipeSearchReturn {
  query: string;
  /** Changing the query (to a different value) searches after 500 ms without further changes. */
  setQuery: (term: string) => void;
  error: string;
  loading: boolean;
  data: Recipe[];
  trigger(): Promise<void>;
}

/**
 * `useRecipeSearch` constructs a basic search query
 * that when `query` is changed, will search for recipes based
 * on the query. Useful for searchable list views. For advanced
 * search, use the `useRecipeQuery` composable.
 *
 * Vue exposed `query`/`error`/`loading`/`data` as refs and watched `query` (debounced); here
 * the values are plain and the debounced search starts from `setQuery`.
 */
export function useRecipeSearch(api: UserApi | ExploreApi): UseRecipeSearchReturn {
  const [query, setQueryState] = useState("");
  const [error] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const queryRef = useRef("");

  const searchRecipes = useCallback(async (term: string) => {
    setLoading(true);
    const { data, error } = await api.recipes.search({
      search: term,
      page: 1,
      orderBy: "name",
      orderDirection: "asc",
      perPage: 20,
      _searchSeed: Date.now().toString(),
    });

    if (error) {
      console.error(error);
      setLoading(false);
      setRecipes([]);
      return;
    }

    if (data) {
      setRecipes(data.items);
    }

    setLoading(false);
  }, [api]);

  const debouncedSearch = useDebouncedCallback((term: string) => {
    void searchRecipes(term);
  }, 500);

  const setQuery = useCallback((term: string) => {
    if (term === queryRef.current) {
      return;
    }
    queryRef.current = term;
    setQueryState(term);
    debouncedSearch(term);
  }, [debouncedSearch]);

  const trigger = useCallback(async () => {
    await searchRecipes(queryRef.current);
  }, [searchRecipes]);

  return {
    query,
    setQuery,
    error,
    loading,
    data: recipes,
    trigger,
  };
}
