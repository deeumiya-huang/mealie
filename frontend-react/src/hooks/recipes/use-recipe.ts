import { useCallback, useEffect, useState } from "react";
import { useUserApi } from "~/hooks/api";
import type { Recipe } from "~/lib/api/types/recipe";

export const useRecipe = function (slug: string, eager = true) {
  const api = useUserApi();
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  const fetchRecipe = useCallback(async () => {
    setLoading(true);
    const { data } = await api.recipes.getOne(slug);
    setLoading(false);
    if (data) setRecipe(data);
  }, [api, slug]);

  async function deleteRecipe() {
    setLoading(true);
    const { data } = await api.recipes.deleteOne(slug);
    setLoading(false);
    return data;
  }

  async function updateRecipe(next: Recipe) {
    setLoading(true);
    const { data } = await api.recipes.updateOne(slug, next);
    setLoading(false);
    return data;
  }

  useEffect(() => {
    if (eager) void fetchRecipe();
  }, [eager, fetchRecipe]);

  return { recipe, setRecipe, loading, fetchRecipe, deleteRecipe, updateRecipe };
};
