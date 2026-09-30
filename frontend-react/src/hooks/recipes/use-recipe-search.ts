import { useCallback, useEffect, useRef, useState } from "react";
import type { UserApi } from "~/lib/api";
import type { ExploreApi } from "~/lib/api/public/explore";
import type { Recipe } from "~/lib/api/types/recipe";

export interface UseRecipeSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  error: string;
  loading: boolean;
  data: Recipe[];
  setData: (data: Recipe[]) => void;
  trigger(): Promise<void>;
}

/**
 * Basic search: when `query` changes (debounced 500ms), searches recipes by it. Useful for
 * searchable list views. For advanced search, use the recipe explorer search.
 */
export function useRecipeSearch(api: UserApi | ExploreApi): UseRecipeSearchReturn {
  const [query, setQuery] = useState("");
  const [error] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const apiRef = useRef(api);
  apiRef.current = api;

  const searchRecipes = useCallback(async (term: string) => {
    setLoading(true);
    const { data, error: err } = await apiRef.current.recipes.search({
      search: term,
      page: 1,
      orderBy: "name",
      orderDirection: "asc",
      perPage: 20,
      _searchSeed: Date.now().toString(),
    });

    if (err) {
      console.error(err);
      setLoading(false);
      setRecipes([]);
      return;
    }
    if (data) setRecipes(data.items);
    setLoading(false);
  }, []);

  const first = useRef(true);
  useEffect(() => {
    // watchDebounced does not fire for the initial value
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => void searchRecipes(query), 500);
    return () => clearTimeout(timer);
  }, [query, searchRecipes]);

  return {
    query,
    setQuery,
    error,
    loading,
    data: recipes,
    setData: setRecipes,
    trigger: () => searchRecipes(query),
  };
}
