import { afterEach, describe, expect, test, vi } from "vitest";
import type { ShoppingListOut } from "@/lib/api/types/household";
import { createStateRef } from "../../state-ref";
import { useShoppingListRecipes } from "../use-shopping-list-recipes";
import { MOCK_SHOPPING_LIST } from "./mocks";
import { renderHook } from "@testing-library/react";

const addRecipes = vi.fn().mockResolvedValue({ data: true });
const removeRecipe = vi.fn().mockResolvedValue(({ data: true }));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({
    shopping: { lists: { addRecipes, removeRecipe } },
  }),
}));

describe("use-shopping-list-recipes", () => {
  const list = MOCK_SHOPPING_LIST;
  const shoppingList = createStateRef<ShoppingListOut | null>(list);
  const loadingCounter = createStateRef(0);
  const recipeReferenceLoading = createStateRef(false);
  const refresh = vi.fn();
  const { result } = renderHook(() => useShoppingListRecipes(
    shoppingList,
    loadingCounter,
    recipeReferenceLoading,
    refresh,
  ));
  const {
    addRecipeReferenceToList,
    removeRecipeReferenceToList,
  } = result.current;

  afterEach(() => {
    shoppingList.value = list;
    loadingCounter.value = 0;
    recipeReferenceLoading.value = false;
  });

  describe.for([
    ["adding recipes", addRecipeReferenceToList, addRecipes] as const,
    ["removing recipes", removeRecipeReferenceToList, removeRecipe] as const,
  ])("%s", async ([_, recipeUpdater, mock]) => {
    test("updates tracking values", async () => {
      expect(loadingCounter.value).toBe(0);
      expect(recipeReferenceLoading.value).toBe(false);
      const promise = recipeUpdater("recipe_id");
      expect(loadingCounter.value).toBe(1);
      expect(recipeReferenceLoading.value).toBe(true);
      await promise;
      expect(loadingCounter.value).toBe(0);
      expect(recipeReferenceLoading.value).toBe(false);
      expect(mock).toHaveBeenCalled();
    });
    test("refreshes only on success", async () => {
      refresh.mockClear();
      mock.mockResolvedValueOnce({ data: false });
      await recipeUpdater("recipe_id");
      expect(refresh).not.toHaveBeenCalled();
      await recipeUpdater("recipe_id");
      expect(refresh).toHaveBeenCalled();
    });
    test("only updates if shopping list exists", async () => {
      mock.mockClear();
      shoppingList.value = null;
      await recipeUpdater("recipe_id");
      expect(mock).not.toHaveBeenCalled();
    });
    test("doesn't update if something else is loading", async () => {
      mock.mockClear();
      recipeReferenceLoading.value = true;
      await recipeUpdater("recipe_id");
      expect(mock).not.toHaveBeenCalled();
    });
  });
});
