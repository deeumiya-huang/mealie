// Usage: <RecipePageScale recipe={recipe} value={scale} onChange={setScale} /> — the unit system and servings/scale
// controls above the ingredients (hidden while editing). (Vue `v-model` → `value` + `onChange`.)
import Box from "@mui/material/Box";
import { RecipeScaleEditButton } from "@/components/Domain/Recipe/RecipeScaleEditButton";
import { RecipeUnitSystemButton } from "@/components/Domain/Recipe/RecipeUnitSystemButton";
import { usePageState } from "@/hooks/recipe-page/shared-state";
import type { RecipeModel } from "../recipe-model";

interface RecipePageScaleProps {
  recipe: RecipeModel;
  value?: number;
  onChange: (value: number) => void;
}

export function RecipePageScale({ recipe, value: scale = 1, onChange }: RecipePageScaleProps) {
  const { isEditMode } = usePageState(recipe.slug);

  const recipeServings = recipe.recipeServings || recipe.recipeYieldQuantity || 1;

  let hasFoodOrUnit = false;
  if (recipe.recipeIngredient) {
    for (const ingredient of recipe.recipeIngredient) {
      if (ingredient.food || ingredient.unit) {
        hasFoodOrUnit = true;
        break;
      }
    }
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 1, pb: 1.5 }}>
      {!isEditMode && (
        <RecipeUnitSystemButton recipe={recipe} />
      )}
      {!isEditMode && (
        <RecipeScaleEditButton
          value={scale}
          onChange={value => onChange(Number(value))}
          recipeServings={recipeServings}
          editScale={hasFoodOrUnit && !isEditMode}
        />
      )}
    </Box>
  );
}
