import { useMemo } from "react";
import { foodName } from "./use-recipe-ingredients";
import type { IngredientFood, IngredientFoodSubstitution, RecipeIngredient } from "@/lib/api/types/recipe";

// the food is typed as a read-or-create union because either shape is accepted on input;
// an ingredient that came back from the API always carries the read shape
function foodSubstitutionsOf(ingredient: RecipeIngredient): IngredientFoodSubstitution[] {
  const food = ingredient.food as IngredientFood | null | undefined;
  return food?.substitutions || [];
}

/**
 * The name a substitute food shows under, inflected to match the line it stands in for: a
 * substitution for "2 onions" reads "shallots", not "shallot".
 */
export function substitutionFoodName(substitution: IngredientFoodSubstitution, usePluralFood = false): string {
  return foodName(substitution.substituteFood || undefined, usePluralFood);
}

/**
 * Splits an ingredient's substitutions into the two tiers the UI shows separately: the ones
 * this recipe declares for this line, and the ones the food carries everywhere it is used.
 *
 * Both tiers have the same {substituteFood, note} shape, so callers can render them alike.
 * Vue took a getter so a row that swaps ingredients re-read them; here the ingredient is a
 * plain argument and the result is recomputed when it changes.
 */
export function useIngredientSubstitutions(ingredient: RecipeIngredient) {
  return useMemo(() => {
    const recipeSubstitutions = ingredient.substitutions || [];
    const foodSubstitutions = foodSubstitutionsOf(ingredient);
    const hasSubstitutions = !!recipeSubstitutions.length || !!foodSubstitutions.length;

    return { recipeSubstitutions, foodSubstitutions, hasSubstitutions };
  }, [ingredient]);
}

/**
 * Both tiers flattened into one line, recipe-level first, for surfaces that have no room for
 * the two-section treatment and nothing to click -- print, above all.
 *
 * Returns "" when there are none, which is also the "don't render a line" signal.
 */
export function ingredientSubstitutionSummary(ingredient: RecipeIngredient, usePluralFood = false): string {
  return [...(ingredient.substitutions || []), ...foodSubstitutionsOf(ingredient)]
    .map((substitution) => {
      const food = substitutionFoodName(substitution, usePluralFood);
      if (food && substitution.note) {
        return `${food} (${substitution.note})`;
      }
      // either half stands alone, the same way it does on screen
      return food || substitution.note || "";
    })
    .filter(Boolean)
    .join(", ");
}
