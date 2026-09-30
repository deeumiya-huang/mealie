import Box from "@mui/material/Box";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe } from "~/lib/api/types/recipe";
import { usePageState } from "~/hooks/recipe-page/shared-state";
import { RecipeScaleEditButton } from "../../RecipeScaleEditButton";
import { RecipeUnitSystemButton } from "../../RecipeUnitSystemButton";

export function RecipePageScale({ value: scale = 1, onChange, recipe }: { value?: number; onChange: (scale: number) => void; recipe: NoUndefinedField<Recipe> }) {
  const { isEditMode } = usePageState(recipe.slug);
  const recipeServings = recipe.recipeServings || recipe.recipeYieldQuantity || 1;
  const hasFoodOrUnit = (recipe.recipeIngredient ?? []).some(ingredient => ingredient.food || ingredient.unit);
  if (isEditMode) return <Box sx={{ pt: 1, pb: 1.5 }} />;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 1, pb: 1.5 }}>
      <RecipeUnitSystemButton recipe={recipe} />
      <RecipeScaleEditButton value={scale} onChange={onChange} recipeServings={recipeServings} editScale={hasFoodOrUnit && !isEditMode} />
    </Box>
  );
}

export default RecipePageScale;
