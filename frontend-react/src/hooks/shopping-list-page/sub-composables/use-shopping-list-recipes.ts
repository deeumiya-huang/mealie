// Port of composables/shopping-list-page/sub-composables/use-shopping-list-recipes.ts.
import { useUserApi } from "@/hooks/api";
import type { ShoppingListOut } from "@/lib/api/types/household";
import type { StateRef } from "../state-ref";

/**
 * Composable for managing shopping list recipe references
 */
export function useShoppingListRecipes(
  shoppingList: StateRef<ShoppingListOut | null>,
  loadingCounter: StateRef<number>,
  recipeReferenceLoading: StateRef<boolean>,
  refresh: () => void,
) {
  const userApi = useUserApi();

  async function addRecipeReferenceToList(recipeId: string) {
    if (!shoppingList.value || recipeReferenceLoading.value) {
      return;
    }

    loadingCounter.set(loadingCounter.value + 1);
    recipeReferenceLoading.set(true);
    const { data } = await userApi.shopping.lists.addRecipes(shoppingList.value.id, [{ recipeId }]);
    recipeReferenceLoading.set(false);
    loadingCounter.set(loadingCounter.value - 1);

    if (data) {
      refresh();
    }
  }

  async function removeRecipeReferenceToList(recipeId: string) {
    if (!shoppingList.value || recipeReferenceLoading.value) {
      return;
    }

    loadingCounter.set(loadingCounter.value + 1);
    recipeReferenceLoading.set(true);
    const { data } = await userApi.shopping.lists.removeRecipe(shoppingList.value.id, recipeId);
    recipeReferenceLoading.set(false);
    loadingCounter.set(loadingCounter.value - 1);

    if (data) {
      refresh();
    }
  }

  return {
    addRecipeReferenceToList,
    removeRecipeReferenceToList,
  };
}
