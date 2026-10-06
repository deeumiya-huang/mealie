import { useCallback, useEffect, useState } from "react";
import { useUserApi } from "@/hooks/api";
import type { Recipe } from "@/lib/api/types/recipe";

export const useRecipe = function (slug: string, eager = true) {
  const api = useUserApi();
  const [loading, setLoading] = useState(eager);

  const [recipe, setRecipe] = useState<Recipe | null>(null);

  const fetchRecipe = useCallback(async () => {
    setLoading(true);
    const { data } = await api.recipes.getOne(slug);
    setLoading(false);
    if (data) {
      setRecipe(data);
    }
  }, [api, slug]);

  const deleteRecipe = useCallback(async () => {
    setLoading(true);
    const { data } = await api.recipes.deleteOne(slug);
    setLoading(false);
    return data;
  }, [api, slug]);

  const updateRecipe = useCallback(async (recipe: Recipe) => {
    setLoading(true);
    const { data } = await api.recipes.updateOne(slug, recipe);
    setLoading(false);
    return data;
  }, [api, slug]);

  // Vue: onMounted(() => { if (eager) fetchRecipe(); })
  useEffect(() => {
    if (!eager) {
      return;
    }
    // the same request as fetchRecipe, without the synchronous setLoading(true) (loading starts true)
    void (async () => {
      const { data } = await api.recipes.getOne(slug);
      setLoading(false);
      if (data) {
        setRecipe(data);
      }
    })();
    // runs on mount only, like onMounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    recipe,
    loading,
    fetchRecipe,
    deleteRecipe,
    updateRecipe,
  };
};
