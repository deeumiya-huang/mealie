// Port of pages/g/[groupSlug]/r/[slug]/index.vue: a recipe. Members of the recipe's group load it through the user
// API (and can edit it); everyone else through the public explore API, and is sent to the group's page (with a
// redirect back here) when that fails — e.g. a private group after logging out.
import { useEffect, useState, type SetStateAction } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { RecipePage } from "@/components/Domain/Recipe/RecipePage/RecipePage";
import { applyUpdate, type RecipeModel } from "@/components/Domain/Recipe/RecipePage/recipe-model";
import { usePublicExploreApi } from "@/hooks/api";
import { useRecipe } from "@/hooks/recipes";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { usePageTitle } from "@/hooks/utils";
import type { Recipe } from "@/lib/api/types/recipe";

interface RecipeSlugPageContentProps {
  slug: string;
}

function RecipeSlugPageContent({ slug }: RecipeSlugPageContentProps) {
  const auth = useMealieAuth();
  const { isOwnGroup } = useLoggedInState();
  // Vue decided once, during setup, which API loads the recipe
  const [ownGroup] = useState(isOwnGroup);
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  // Vue set the title when the recipe was (re)loaded, to a non-empty name; edits in the page do not change it
  const [title, setTitle] = useState("");

  // the group's own members: useRecipe(slug), copied into the editable page state whenever it loads
  const { recipe: data } = useRecipe(slug, ownGroup);
  const [loadedRecipe, setLoadedRecipe] = useState<Recipe | null>(null);
  if (ownGroup && data !== loadedRecipe) {
    setLoadedRecipe(data);
    setRecipe(data);
    if (data?.name) {
      setTitle(data.name);
    }
  }

  // everyone else: the public explore API (Vue: onMounted(loadPublicRecipe))
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const publicApi = usePublicExploreApi(groupSlug);
  const fullPath = `${location.pathname}${location.search}${location.hash}`;
  useEffect(() => {
    if (ownGroup) {
      return;
    }
    let active = true;
    void (async () => {
      const { data: publicRecipe, error } = await publicApi.explore.recipes.getOne(slug);
      if (!active) {
        return;
      }
      if (error) {
        console.error("error loading recipe -> ", error);
        void navigate({ pathname: `/g/${groupSlug}`, search: `?${new URLSearchParams({ redirect: fullPath }).toString()}` });
      }

      setRecipe(publicRecipe);
      if (publicRecipe?.name) {
        setTitle(publicRecipe.name);
      }
    })();
    return () => {
      active = false;
    };
    // runs on mount only, like onMounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePageTitle(title);

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

export default function RecipeSlugPage() {
  const { slug = "" } = useParams();
  // a new slug (e.g. after a rename) is a new page, as a new route was in Nuxt
  return <RecipeSlugPageContent key={slug} slug={slug} />;
}
