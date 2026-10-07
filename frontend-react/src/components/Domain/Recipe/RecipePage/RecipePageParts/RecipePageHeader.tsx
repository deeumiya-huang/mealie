// Usage: <RecipePageHeader ref={toolbarRef} recipe={recipe} recipeScale={scale} landscape onSave={…} onDelete={…}
//   onClose={…} /> — the info card plus the action bar (edit / JSON / print …) of the recipe page. `ref` is the root
// element (the page watches it to show a floating save button once it scrolls away).
import { useEffect, useState, type Ref } from "react";
import Divider from "@mui/material/Divider";
import { RecipeActionMenu } from "@/components/Domain/Recipe/RecipeActionMenu";
import { useUserApi } from "@/hooks/api";
import { PageMode, usePageState, usePageUser } from "@/hooks/recipe-page/shared-state";
import { useRecipePermissions } from "@/hooks/recipes";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import type { HouseholdSummary } from "@/lib/api/types/household";
import type { RecipeModel } from "../recipe-model";
import { RecipePageInfoCard } from "./RecipePageInfoCard";

interface RecipePageHeaderProps {
  recipe: RecipeModel;
  recipeScale?: number;
  landscape?: boolean;
  ref?: Ref<HTMLDivElement>;
  onSave?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onClose?: () => void;
}

export function RecipePageHeader({ recipe, recipeScale = 1, landscape = false, ref, onSave, onDelete, onClose }: RecipePageHeaderProps) {
  const { setMode, toggleEditMode, isEditMode } = usePageState(recipe.slug);
  const { user } = usePageUser();
  const { isOwnGroup } = useLoggedInState();
  const userApi = useUserApi();

  // the household of the recipe decides whether other households may edit it
  const [recipeHousehold, setRecipeHousehold] = useState<HouseholdSummary>();
  const householdId = recipe.householdId;
  const userId = user.id;
  useEffect(() => {
    if (!userId) {
      return;
    }
    let active = true;
    void userApi.households.getOne(householdId).then(({ data }) => {
      if (active) {
        setRecipeHousehold(data || undefined);
      }
    });
    return () => {
      active = false;
    };
  }, [userApi, householdId, userId]);

  const { canEditRecipe } = useRecipePermissions(recipe, recipeHousehold, user);

  function printRecipe() {
    window.print();
  }

  return (
    <div ref={ref}>
      <RecipePageInfoCard
        recipe={recipe}
        recipeScale={recipeScale}
        landscape={landscape}
      />
      <Divider />
      <RecipeActionMenu
        recipe={recipe}
        slug={recipe.slug}
        recipeScale={recipeScale}
        canEdit={canEditRecipe}
        name={recipe.name}
        loggedIn={isOwnGroup}
        open={isEditMode}
        recipeId={recipe.id}
        sx={{ ml: "auto", mt: -3.5, pb: 2 }}
        onClose={() => onClose?.()}
        onJson={() => toggleEditMode()}
        onEdit={() => setMode(PageMode.EDIT)}
        onSave={() => onSave?.()}
        onDelete={() => onDelete?.()}
        onPrint={printRecipe}
      />
    </div>
  );
}
