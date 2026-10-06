// Port of composables/shopping-list-page/sub-composables/use-shopping-list-state.ts.
// The Vue refs / `reactive` objects become `StateRef`s / reactive objects (see ../state-ref.ts): `shoppingList.value`,
// `loadingCounter.value`, `state.checkAllDialog` … keep their names. The `watch(shoppingList.listItems)` that
// hydrates `listItems.checked/unchecked` runs whenever `shoppingList` is set or touched and its `listItems`
// array is a different array than before.
import { useMemo, useState } from "react";
import type { ShoppingListItemOut, ShoppingListOut } from "@/lib/api/types/household";
import type { RecipeSummary } from "@/lib/api/types/recipe";
import { useStore } from "@/lib/store";
import { createReactive, createStateRef, patchReactive } from "../state-ref";

export interface ShoppingListItemGroups {
  unchecked: ShoppingListItemOut[];
  checked: ShoppingListItemOut[];
}

export interface ShoppingListDialogState {
  checkAllDialog: boolean;
  uncheckAllDialog: boolean;
  deleteCheckedDialog: boolean;
}

export function sortCheckedItems(a: ShoppingListItemOut, b: ShoppingListItemOut) {
  if (a.updatedAt! === b.updatedAt!) {
    return ((a.position || 0) > (b.position || 0)) ? -1 : 1;
  }
  return a.updatedAt! < b.updatedAt! ? 1 : -1;
}

function createShoppingListState() {
  const listItemsHandle = createReactive<ShoppingListItemGroups>({ unchecked: [], checked: [] });
  const dialogsHandle = createReactive<ShoppingListDialogState>({
    checkAllDialog: false,
    uncheckAllDialog: false,
    deleteCheckedDialog: false,
  });

  // watch(() => shoppingList.value?.listItems, …, { immediate: true }): only a different array triggers it
  let hydratedFrom: ShoppingListItemOut[] | undefined | null = null;
  function hydrate(list: ShoppingListOut | null) {
    const items = list?.listItems;
    if (items === hydratedFrom) {
      return;
    }
    hydratedFrom = items;
    patchReactive(listItemsHandle.state, {
      unchecked: items?.filter(item => !item.checked) ?? [],
      checked: items?.filter(item => item.checked).sort(sortCheckedItems) ?? [],
    });
  }

  return {
    shoppingList: createStateRef<ShoppingListOut | null>(null, hydrate),
    loadingCounter: createStateRef(1),
    recipeReferenceLoading: createStateRef(false),
    preserveItemOrder: createStateRef(false),
    edit: createStateRef(false),
    threeDot: createStateRef(false),
    reorderLabelsDialog: createStateRef(false),
    createEditorOpen: createStateRef(false),
    state: dialogsHandle.state,
    listItems: listItemsHandle.state,
    stores: [listItemsHandle.store, dialogsHandle.store] as const,
  };
}

/**
 * Composable for managing shopping list state and reactive data. The calling component re-renders when the
 * list, the dialogs, the UI flags or the checked/unchecked items change; the counters and loading flags are
 * only read by code and do not re-render.
 */
export function useShoppingListState() {
  const [model] = useState(createShoppingListState);
  const { shoppingList, edit, threeDot, reorderLabelsDialog, createEditorOpen } = model;

  useStore(shoppingList.store);
  useStore(edit.store);
  useStore(threeDot.store);
  useStore(reorderLabelsDialog.store);
  useStore(createEditorOpen.store);
  useStore(model.stores[0]);
  useStore(model.stores[1]);

  const referencesList = shoppingList.value?.recipeReferences;
  const recipeMap = useMemo(() => new Map<string, RecipeSummary>(
    (referencesList?.map(ref => ref.recipe) ?? [])
      .map(recipe => [recipe.id || "", recipe] as [string, RecipeSummary])),
  [referencesList]);

  const recipeList = useMemo(() => Array.from(recipeMap.values()), [recipeMap]);

  return {
    shoppingList,
    loadingCounter: model.loadingCounter,
    recipeReferenceLoading: model.recipeReferenceLoading,
    preserveItemOrder: model.preserveItemOrder,
    edit,
    threeDot,
    reorderLabelsDialog,
    createEditorOpen,
    state: model.state,
    listItems: model.listItems,
    recipeMap,
    recipeList,
    sortCheckedItems,
  };
}
