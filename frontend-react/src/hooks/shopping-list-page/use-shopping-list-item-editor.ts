import type { Ref } from "~/lib/observable";
import { useFoodData, useFoodStore, useUnitData, useUnitStore } from "~/hooks/store";
import type { IngredientFood, IngredientUnit, ShoppingListItemOut } from "~/lib/api/types/household";

/**
 * Food/unit creation and label assignment for the item editor. `listItem` is the edited item;
 * React callers pass a ref whose setter updates their state (see ShoppingListItemEditor).
 */
export function useShoppingListItemEditor(listItem: Ref<ShoppingListItemOut>) {
  const foodStore = useFoodStore();
  const foodData = useFoodData();

  const unitStore = useUnitStore();
  const unitData = useUnitData();

  async function createAssignFood(val: string) {
    // keep UI reactive
    listItem.value = { ...listItem.value, food: { ...(listItem.value.food ?? {}), name: val } as IngredientFood };

    const newFood = await foodStore.actions.createOne({ ...foodData.data, name: val });
    if (newFood) {
      listItem.value = { ...listItem.value, food: newFood, foodId: newFood.id };
    }
    foodData.reset();
  }

  async function createAssignUnit(val: string) {
    // keep UI reactive
    listItem.value = { ...listItem.value, unit: { ...(listItem.value.unit ?? {}), name: val } as IngredientUnit };

    const newUnit = await unitStore.actions.createOne({ ...unitData.data, name: val });
    if (newUnit) {
      listItem.value = { ...listItem.value, unit: newUnit, unitId: newUnit.id };
    }
    unitData.reset();
  }

  async function assignLabelToFood() {
    if (!(listItem.value.food && listItem.value.foodId && listItem.value.labelId)) {
      return;
    }

    const food = { ...listItem.value.food, labelId: listItem.value.labelId } as IngredientFood;
    listItem.value = { ...listItem.value, food };
    await foodStore.actions.updateOne(food);
  }

  return {
    assignLabelToFood,
    createAssignFood,
    createAssignUnit,
  };
}

/**
 * The editors' watchers: an emptied quantity becomes 0, and picking a food takes on that food's
 * label. Applied to every edit of the item (`prev` is the item before the edit).
 */
export function applyItemEdit(prev: ShoppingListItemOut, next: ShoppingListItemOut): ShoppingListItemOut {
  let item = next;
  if (item.quantity !== prev.quantity && !item.quantity) {
    item = { ...item, quantity: 0 };
  }
  if (item.food !== prev.food) {
    const label = item.food?.label || null;
    item = { ...item, label, labelId: label?.id || null };
  }
  return item;
}
