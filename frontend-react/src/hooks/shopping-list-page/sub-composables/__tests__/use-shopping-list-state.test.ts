import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ShoppingListOut } from "@/lib/api/types/household";
import { useShoppingListState } from "../use-shopping-list-state";
import { MOCK_ITEM, MOCK_RECIPE, MOCK_RECIPE2, MOCK_SHOPPING_LIST } from "./mocks";

// renderHook is the React counterpart of makeWrapper; the returned values are read from `result.current`
const wrapper = (list: ShoppingListOut = MOCK_SHOPPING_LIST) => {
  const { result } = renderHook(() => useShoppingListState());
  act(() => {
    result.current.shoppingList.value = list;
  });
  return result.current;
};

describe("use-shopping-list-state", () => {
  describe("checked items are sorted", () => {
    const { sortCheckedItems } = wrapper();

    test("by timestamp", () => {
      const sorted = sortCheckedItems(MOCK_ITEM, { ...MOCK_ITEM, updatedAt: "200" });
      const sorted2 = sortCheckedItems(MOCK_ITEM, { ...MOCK_ITEM, updatedAt: "0" });
      expect(sorted).toBe(1);
      expect(sorted2).toBe(-1);
    });
    test("by position if timestamps match", () => {
      const sorted = sortCheckedItems(MOCK_ITEM, { ...MOCK_ITEM, position: 2 });
      const sorted2 = sortCheckedItems(MOCK_ITEM, { ...MOCK_ITEM, position: 0 });
      const sorted3 = sortCheckedItems({ ...MOCK_ITEM, position: undefined }, { ...MOCK_ITEM, position: undefined });
      expect(sorted).toBe(1);
      expect(sorted2).toBe(-1);
      expect(sorted3).toBe(1);
    });
  });

  describe("recipeMap", () => {
    test("Updates to match shopping list recipe references", () => {
      const { recipeMap } = wrapper();
      expect(recipeMap).toEqual(new Map([
        [MOCK_RECIPE.id, MOCK_RECIPE],
        ["", MOCK_RECIPE2],
      ]));
    });
    test("handles nulls", () => {
      const { recipeMap } = wrapper({ ...MOCK_SHOPPING_LIST, recipeReferences: undefined });
      expect(recipeMap).toEqual(new Map([]));
    });
  });

  describe("checked and unchecked items", () => {
    test("update appropriately", () => {
      const mockCheckedItem = { ...MOCK_ITEM, checked: true };
      const { listItems: { checked, unchecked } } = wrapper({
        ...MOCK_SHOPPING_LIST, listItems: [
          MOCK_ITEM,
          mockCheckedItem,
        ],
      });
      expect(unchecked[0]).toEqual(MOCK_ITEM);
      expect(checked[0]).toEqual(mockCheckedItem);
    });
  });

  describe("recipe list", () => {
    test("Updates to match shopping list recipe references", () => {
      const { recipeList } = wrapper();
      expect(recipeList).toEqual([
        MOCK_RECIPE,
        MOCK_RECIPE2,
      ]);
    });
  });
});
