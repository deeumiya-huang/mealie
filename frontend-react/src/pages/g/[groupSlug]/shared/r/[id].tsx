import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe } from "~/lib/api/types/recipe";
import { usePublicApi } from "~/hooks/api";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { RecipePage } from "~/components/Domain/Recipe/RecipePage/RecipePage";

type R = NoUndefinedField<Recipe>;

/** A recipe opened through a share token (no login required). */
export default function SharedRecipePage() {
  const auth = useMealieAuth();
  const params = useParams();
  const navigate = useNavigate();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const recipeId = params.id as string;
  const api = usePublicApi();
  const [recipe, setRecipe] = useState<R | null>(null);

  useSeoMeta({ title: recipe?.name || "" });

  useEffect(() => {
    void api.shared.getShared(recipeId).then(({ data, error }) => {
      if (error) {
        console.error("error loading recipe -> ", error);
        void navigate(`/g/${groupSlug}`);
      }
      if (data) setRecipe(data as R);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per token
  }, [recipeId]);

  return <div>{recipe && <RecipePage value={recipe} onChange={setRecipe as React.Dispatch<React.SetStateAction<R>>} />}</div>;
}
