// Port of composables/shopping-list-page/use-shopping-list-item-editor.ts.
// `listItem` is the edited item as a `StateRef` (the Vue `ModelRef`): the functions change the item in place, like
// the Vue ones did through the reactive model, and `touch()` it so the editing component re-renders.
import { useFoodData, useFoodStore, useUnitData, useUnitStore } from "@/hooks/store";
import type { IngredientFood, ShoppingListItemOut } from "@/lib/api/types/household";
import type { StateRef } from "./state-ref";

function setFoodName(item: ShoppingListItemOut, name: string) {
  // keep UI reactive
  if (item.food) {
    item.food.name = name;
  }
  else {
    item.food = { name } as IngredientFood;
  }
}

function setUnitName(item: ShoppingListItemOut, name: string) {
  // keep UI reactive
  if (item.unit) {
    item.unit.name = name;
  }
  else {
    item.unit = { name } as ShoppingListItemOut["unit"];
  }
}

export function useShoppingListItemEditor(listItem: StateRef<ShoppingListItemOut>) {
  const foodStore = useFoodStore();
  const foodData = useFoodData();

  const unitStore = useUnitStore();
  const unitData = useUnitData();

  async function createAssignFood(val: string) {
    setFoodName(listItem.value, val);
    listItem.touch();

    const newFood = await foodStore.actions.createOne({ ...foodData.data, name: val });
    if (newFood) {
      assignFood(listItem.value, newFood);
      listItem.touch();
    }
    foodData.reset();
  }

  async function createAssignUnit(val: string) {
    setUnitName(listItem.value, val);
    listItem.touch();

    const newUnit = await unitStore.actions.createOne({ ...unitData.data, name: val });
    if (newUnit) {
      assignUnit(listItem.value, newUnit);
      listItem.touch();
    }
    unitData.reset();
  }

  async function assignLabelToFood() {
    const item = listItem.value;
    if (!(item.food && item.foodId && item.labelId)) {
      return;
    }

    setFoodLabel(item.food as IngredientFood, item.labelId);
    await foodStore.actions.updateOne(item.food as IngredientFood);
    listItem.touch();
  }

  return {
    assignLabelToFood,
    createAssignFood,
    createAssignUnit,
  };
}

function assignFood(item: ShoppingListItemOut, food: IngredientFood) {
  item.food = food;
  item.foodId = food.id;
}

function assignUnit(item: ShoppingListItemOut, unit: NonNullable<ShoppingListItemOut["unit"]>) {
  item.unit = unit;
  item.unitId = unit.id;
}

function setFoodLabel(food: IngredientFood, labelId: string) {
  food.labelId = labelId;
}
