// Port of pages/g/[groupSlug]/shared/r/[id].vue: a recipe opened through a share link (layout "basic", no login).
// An invalid or expired token sends the visitor to the group's page.
import { useEffect, useState, type SetStateAction } from "react";
import { useNavigate, useParams } from "react-router";
import { RecipePage } from "@/components/Domain/Recipe/RecipePage/RecipePage";
import { applyUpdate, type RecipeModel } from "@/components/Domain/Recipe/RecipePage/recipe-model";
import { usePublicApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { usePageTitle } from "@/hooks/utils";
import type { Recipe } from "@/lib/api/types/recipe";

export default function SharedRecipePage() {
  const auth = useMealieAuth();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const navigate = useNavigate();
  const recipeId = params.id || "";
  const api = usePublicApi();

  const [title, setTitle] = useState("");
  usePageTitle(title);

  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await api.shared.getShared(recipeId);
      if (!active) {
        return;
      }

      if (error) {
        console.error("error loading recipe -> ", error);
        void navigate(`/g/${groupSlug}`);
      }

      if (data) {
        setTitle(data?.name || "");
      }

      setRecipe(data);
    })();
    return () => {
      active = false;
    };
  }, [api, recipeId, groupSlug, navigate]);

  function updateRecipe(update: SetStateAction<RecipeModel>) {
    setRecipe(prev => (prev ? applyUpdate(update, prev as RecipeModel) : prev));
  }

  return (
    <div>
      {recipe && (
        <RecipePage
          recipe={recipe as RecipeModel}
          onRecipeChange={updateRecipe}
        />
      )}
    </div>
  );
}
