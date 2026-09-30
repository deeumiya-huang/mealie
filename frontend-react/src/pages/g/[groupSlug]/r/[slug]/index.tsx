import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe } from "~/lib/api/types/recipe";
import { usePublicExploreApi, useUserApi } from "~/hooks/api";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { RecipePage } from "~/components/Domain/Recipe/RecipePage/RecipePage";

type R = NoUndefinedField<Recipe>;

export default function RecipeSlugPage() {
  const auth = useMealieAuth();
  const { isOwnGroup } = useLoggedInState();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const slug = params.slug as string;
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const userApi = useUserApi();
  const exploreApi = usePublicExploreApi(groupSlug);
  const [recipe, setRecipe] = useState<R | null>(null);

  useSeoMeta({ title: recipe?.name || "" });

  useEffect(() => {
    let cancelled = false;
    setRecipe(null);
    async function load() {
      if (isOwnGroup) {
        const { data } = await userApi.recipes.getOne(slug);
        if (!cancelled && data) setRecipe(data as R);
      }
      else {
        const { data, error } = await exploreApi.explore.recipes.getOne(slug);
        if (error) {
          console.error("error loading recipe -> ", error);
          void navigate(`/g/${groupSlug}?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
        if (!cancelled && data) setRecipe(data as R);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the slug changes
  }, [slug, isOwnGroup]);

  return (
    <div>
      {/* keyed by slug: page state (edit/cook mode, scale) belongs to one recipe */}
      {recipe && <RecipePage key={slug} value={recipe} onChange={setRecipe as React.Dispatch<React.SetStateAction<R>>} />}
    </div>
  );
}
