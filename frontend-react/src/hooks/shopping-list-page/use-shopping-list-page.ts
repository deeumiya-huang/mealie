// Port of composables/shopping-list-page/use-shopping-list-page.ts: orchestrates the sub-hooks of the shopping list
// page. The Vue refs keep their names and are `StateRef`s (`.value`, `.set()`), `state` / `listItems` are reactive
// objects (see ./state-ref.ts). Polling starts when the page mounts and stops when it unmounts.
import { useEffect } from "react";
import type { ShoppingListItemOut } from "@/lib/api/types/household";
import { patchReactive, useQuietRef, useStateRef } from "./state-ref";
import { useShoppingListCopy } from "./sub-composables/use-shopping-list-copy";
import { useShoppingListCrud } from "./sub-composables/use-shopping-list-crud";
import { useShoppingListData } from "./sub-composables/use-shopping-list-data";
import { useShoppingListLabels } from "./sub-composables/use-shopping-list-labels";
import { useShoppingListRecipes } from "./sub-composables/use-shopping-list-recipes";
import { useShoppingListSearch } from "./sub-composables/use-shopping-list-search";
import { useShoppingListSorting } from "./sub-composables/use-shopping-list-sorting";
import { useShoppingListState } from "./sub-composables/use-shopping-list-state";

const NO_ITEMS: ShoppingListItemOut[] = [];

/**
 * Main hook that orchestrates all shopping list page functionality
 */
export function useShoppingListPage(listId: string) {
  // Initialize state
  const state = useShoppingListState();
  const {
    shoppingList,
    loadingCounter,
    recipeReferenceLoading,
    preserveItemOrder,
    listItems,
    sortCheckedItems,
  } = state;

  // Initialize sorting functionality
  const sorting = useShoppingListSorting();
  const { groupAndSortListItemsByFood, sortListItems, updateItemsByLabel } = sorting;

  // Track items organized by label
  const itemsByLabel = useStateRef<{ [key: string]: ShoppingListItemOut[] }>({});

  // Initialize search over every item on the list, checked and unchecked alike,
  // so a search can surface something that has already been checked off.
  const searchManager = useShoppingListSearch(shoppingList.value?.listItems ?? NO_ITEMS);
  const { isSearching, matchesSearch, countMatches } = searchManager;

  // Number of checked items currently visible, so the checked section can show
  // how many of them the search matched rather than the total.
  const visibleCheckedCount = countMatches(listItems.checked);

  // Whether the search matched anything at all, used to show an empty state.
  const hasSearchResults = !isSearching
    || Object.values(itemsByLabel.value).some(items => items.some(matchesSearch))
    || listItems.checked.some(matchesSearch);

  function updateListItemOrder() {
    if (!shoppingList.value) return;

    if (!preserveItemOrder.value) {
      groupAndSortListItemsByFood(shoppingList.value);
    }
    else {
      sortListItems(shoppingList.value);
    }

    const labeledItems = updateItemsByLabel(shoppingList.value);
    if (labeledItems) {
      itemsByLabel.set(labeledItems);
    }
    // the sorting changed the list in place
    shoppingList.touch();
  }

  // Initialize data management
  const dataManager = useShoppingListData(listId, shoppingList, loadingCounter);
  const { isOffline, refresh: baseRefresh, startPolling, stopPolling, shoppingListItemActions } = dataManager;

  const refresh = () => baseRefresh(updateListItemOrder);

  // Initialize shopping list labels
  const labels = useShoppingListLabels(shoppingList);

  // Initialize copy functionality
  const copyManager = useShoppingListCopy();

  // Initialize CRUD operations
  const crud = useShoppingListCrud(
    shoppingList,
    loadingCounter,
    listItems,
    shoppingListItemActions,
    refresh,
    sortCheckedItems,
    updateListItemOrder,
  );

  // Initialize recipe management
  const recipes = useShoppingListRecipes(
    shoppingList,
    loadingCounter,
    recipeReferenceLoading,
    refresh,
  );

  // Handle item reordering by label
  function updateIndexUncheckedByLabel(labelName: string, labeledUncheckedItems: ShoppingListItemOut[]) {
    if (!itemsByLabel.value[labelName]) {
      return;
    }

    // update this label's item order
    const updatedItemsByLabel = { ...itemsByLabel.value, [labelName]: labeledUncheckedItems };
    itemsByLabel.set(updatedItemsByLabel);

    // reset list order of all items
    const allUncheckedItems: ShoppingListItemOut[] = [];
    for (const labelKey in updatedItemsByLabel) {
      allUncheckedItems.push(...(updatedItemsByLabel[labelKey] ?? []));
    }

    // since the user has manually reordered the list, we should preserve this order
    preserveItemOrder.set(true);

    // save changes
    patchReactive(listItems, {
      unchecked: allUncheckedItems,
      checked: shoppingList.value?.listItems?.filter(item => item.checked) || [],
    });
    crud.updateUncheckedListItems();
  }

  // Dialog helpers
  function openCheckAll() {
    if (shoppingList.value?.listItems?.some(item => !item.checked)) {
      patchReactive(state.state, { checkAllDialog: true });
    }
  }

  function openUncheckAll() {
    if (shoppingList.value?.listItems?.some(item => item.checked)) {
      patchReactive(state.state, { uncheckAllDialog: true });
    }
  }

  function openDeleteChecked() {
    if (shoppingList.value?.listItems?.some(item => item.checked)) {
      patchReactive(state.state, { deleteCheckedDialog: true });
    }
  }

  function checkAll() {
    patchReactive(state.state, { checkAllDialog: false });
    crud.checkAllItems();
  }

  function uncheckAll() {
    patchReactive(state.state, { uncheckAllDialog: false });
    crud.uncheckAllItems();
  }

  function deleteChecked() {
    patchReactive(state.state, { deleteCheckedDialog: false });
    crud.deleteCheckedItems();
  }

  // Copy functionality wrapper
  function copyListItems(copyType: "plain" | "markdown") {
    copyManager.copyListItems(itemsByLabel.value, copyType);
  }

  // Label reordering helpers
  function toggleReorderLabelsDialog() {
    crud.toggleReorderLabelsDialog(state.reorderLabelsDialog);
  }

  async function saveLabelOrder() {
    await crud.saveLabelOrder(() => {
      const labeledItems = updateItemsByLabel(shoppingList.value!);
      if (labeledItems) {
        itemsByLabel.set(labeledItems);
      }
    });
  }

  // Lifecycle management: the interval outlives renders, so it calls the latest `updateListItemOrder`
  const latestUpdateListItemOrder = useQuietRef(updateListItemOrder);
  useEffect(() => {
    latestUpdateListItemOrder.set(updateListItemOrder);
  });

  useEffect(() => {
    startPolling(() => latestUpdateListItemOrder.value());
    return () => {
      stopPolling();
    };
    // mount/unmount only, like onMounted/onUnmounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    itemsByLabel,
    isOffline,

    // Search
    ...searchManager,
    visibleCheckedCount,
    hasSearchResults,

    // Sub-composables
    ...state,
    ...labels,
    ...crud,
    ...recipes,

    // Specialized functions
    updateIndexUncheckedByLabel,
    copyListItems,

    // Dialog actions
    openCheckAll,
    openUncheckAll,
    openDeleteChecked,
    checkAll,
    uncheckAll,
    deleteChecked,

    // Label management
    toggleReorderLabelsDialog,
    saveLabelOrder,

    // Data refresh
    refresh,
  };
}
