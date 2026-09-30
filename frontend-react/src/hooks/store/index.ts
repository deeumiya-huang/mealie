import { resetCategoryStore } from "./use-category-store";
import { resetFoodStore } from "./use-food-store";
import { resetHouseholdStore } from "./use-household-store";
import { resetLabelStore } from "./use-label-store";
import { resetTagStore } from "./use-tag-store";
import { resetToolStore } from "./use-tool-store";
import { resetUnitStore } from "./use-unit-store";
import { resetCookbookStore } from "./use-cookbook-store";
import { resetUserStore } from "./use-user-store";

export { useCategoryStore, usePublicCategoryStore, useCategoryStoreFor, useCategoryData, resetCategoryStore } from "./use-category-store";
export { useFoodStore, usePublicFoodStore, useFoodStoreFor, useFoodData, resetFoodStore } from "./use-food-store";
export { useHouseholdStore, usePublicHouseholdStore, useHouseholdStoreFor, resetHouseholdStore } from "./use-household-store";
export { useLabelStore, useLabelData, resetLabelStore } from "./use-label-store";
export { useTagStore, usePublicTagStore, useTagStoreFor, useTagData, resetTagStore } from "./use-tag-store";
export { useToolStore, usePublicToolStore, useToolStoreFor, useToolData, resetToolStore } from "./use-tool-store";
export { useUnitStore, useUnitData, resetUnitStore } from "./use-unit-store";
export { useCookbookStore, usePublicCookbookStore, useCookbookStoreFor, resetCookbookStore } from "./use-cookbook-store";
export { useUserStore, resetUserStore } from "./use-user-store";

/** Also registered with resetAllCaches(); kept for callers that clear stores explicitly. */
export function clearAllStores() {
  resetCategoryStore();
  resetFoodStore();
  resetHouseholdStore();
  resetLabelStore();
  resetTagStore();
  resetToolStore();
  resetUnitStore();
  resetCookbookStore();
  resetUserStore();
}
