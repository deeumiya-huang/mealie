import { forwardRef, useEffect, useState } from "react";
import Divider from "@mui/material/Divider";
import type { HouseholdSummary } from "~/lib/api/types/household";
import type { Recipe } from "~/lib/api/types/recipe";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import { useUserApi } from "~/hooks/api";
import { PageMode, usePageState, usePageUser } from "~/hooks/recipe-page/shared-state";
import { useRecipePermissions } from "~/hooks/recipes";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { RecipeActionMenu } from "../../RecipeActionMenu";
import { RecipePageInfoCard } from "./RecipePageInfoCard";

export interface RecipePageHeaderProps {
  recipe: NoUndefinedField<Recipe>;
  recipeScale?: number;
  landscape?: boolean;
  onSave?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
}

export const RecipePageHeader = forwardRef<HTMLDivElement, RecipePageHeaderProps>(function RecipePageHeader({ recipe, recipeScale = 1, landscape = false, onSave, onDelete, onClose }, ref) {
  const { setMode, toggleEditMode, isEditMode } = usePageState(recipe.slug);
  const { user } = usePageUser();
  const { isOwnGroup } = useLoggedInState();
  const userApi = useUserApi();
  const [recipeHousehold, setRecipeHousehold] = useState<HouseholdSummary>();

  useEffect(() => {
    if (!user) return;
    void userApi.households.getOne(recipe.householdId).then(({ data }) => setRecipeHousehold(data || undefined));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per recipe household
  }, [recipe.householdId]);

  const { canEditRecipe } = useRecipePermissions(recipe, recipeHousehold, user);

  return (
    <div ref={ref}>
      <RecipePageInfoCard recipe={recipe} recipeScale={recipeScale} landscape={landscape} />
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
        onClose={onClose}
        onJson={toggleEditMode}
        onEdit={() => setMode(PageMode.EDIT)}
        onSave={onSave}
        onDelete={onDelete}
        onPrint={() => window.print()}
      />
    </div>
  );
});

export default RecipePageHeader;
