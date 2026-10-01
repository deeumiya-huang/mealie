import { useEffect, useState } from "react";
import { ChangeChannel, computed, ref, useChannel, withNotify } from "~/lib/observable";
import type { ShoppingListItemOut } from "~/lib/api/types/household";
import { createShoppingListState } from "./sub-composables/use-shopping-list-state";
import { createShoppingListData } from "./sub-composables/use-shopping-list-data";
import { createShoppingListSorting } from "./sub-composables/use-shopping-list-sorting";
import { createShoppingListLabels } from "./sub-composables/use-shopping-list-labels";
import { createShoppingListCopy } from "./sub-composables/use-shopping-list-copy";
import { createShoppingListCrud } from "./sub-composables/use-shopping-list-crud";
import { createShoppingListRecipes } from "./sub-composables/use-shopping-list-recipes";
import { createShoppingListSearch } from "./sub-composables/use-shopping-list-search";

/**
 * Orchestrates all shopping list page functionality (the Vue `useShoppingListPage` composable as a
 * plain controller). Polling starts with `start()` and stops with `stop()` (Vue: onMounted /
 * onUnmounted); `useShoppingListPage` below wires those to a component.
 */
export function createShoppingListPage(listId: string, channel: ChangeChannel = new ChangeChannel()) {
  // Initialize state
  const state = createShoppingListState(channel);
  const {
    shoppingList,
    loadingCounter,
    recipeReferenceLoading,
    preserveItemOrder,
    listItems,
    sortCheckedItems,
  } = state;

  // Initialize sorting functionality
  const sorting = createShoppingListSorting();
  const { groupAndSortListItemsByFood, sortListItems, updateItemsByLabel } = sorting;

  // Track items organized by label
  const itemsByLabel = ref<{ [key: string]: ShoppingListItemOut[] }>({}, channel);

  // Initialize search over every item on the list, checked and unchecked alike,
  // so a search can surface something that has already been checked off.
  const searchManager = createShoppingListSearch(
    computed(() => shoppingList.value?.listItems ?? []),
    channel,
  );
  const { isSearching, matchesSearch, countMatches } = searchManager;

  // Number of checked items currently visible, so the checked section can show
  // how many of them the search matched rather than the total.
  const visibleCheckedCount = computed(() => countMatches(listItems.checked));

  // Whether the search matched anything at all, used to show an empty state.
  const hasSearchResults = computed(() => {
    if (!isSearching.value) {
      return true;
    }
    return (
      Object.values(itemsByLabel.value).some(items => items.some(matchesSearch))
      || listItems.checked.some(matchesSearch)
    );
  });

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
      itemsByLabel.value = labeledItems;
    }
  }

  // Initialize data management
  const dataManager = createShoppingListData(listId, shoppingList, loadingCounter);
  const { isOffline, refresh: baseRefresh, startPolling, stopPolling, shoppingListItemActions } = dataManager;

  const refresh = () => baseRefresh(updateListItemOrder);

  // Initialize shopping list labels
  const labels = createShoppingListLabels(shoppingList);

  // Initialize copy functionality
  const copyManager = createShoppingListCopy();

  // Initialize CRUD operations
  const crud = createShoppingListCrud(
    shoppingList,
    loadingCounter,
    listItems,
    shoppingListItemActions,
    refresh,
    sortCheckedItems,
    updateListItemOrder,
    channel,
  );

  // Initialize recipe management
  const recipes = createShoppingListRecipes(
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
    itemsByLabel.value[labelName] = labeledUncheckedItems;

    // reset list order of all items
    const allUncheckedItems: ShoppingListItemOut[] = [];
    for (const labelKey in itemsByLabel.value) {
      allUncheckedItems.push(...(itemsByLabel.value[labelKey] ?? []));
    }

    // since the user has manually reordered the list, we should preserve this order
    preserveItemOrder.value = true;

    // save changes
    listItems.unchecked = allUncheckedItems;
    listItems.checked = shoppingList.value?.listItems?.filter(item => item.checked) || [];
    crud.updateUncheckedListItems();
  }

  // Dialog helpers
  function openCheckAll() {
    if (shoppingList.value?.listItems?.some(item => !item.checked)) {
      state.state.checkAllDialog = true;
    }
  }

  function openUncheckAll() {
    if (shoppingList.value?.listItems?.some(item => item.checked)) {
      state.state.uncheckAllDialog = true;
    }
  }

  function openDeleteChecked() {
    if (shoppingList.value?.listItems?.some(item => item.checked)) {
      state.state.deleteCheckedDialog = true;
    }
  }

  function checkAll() {
    state.state.checkAllDialog = false;
    crud.checkAllItems();
  }

  function uncheckAll() {
    state.state.uncheckAllDialog = false;
    crud.uncheckAllItems();
  }

  function deleteChecked() {
    state.state.deleteCheckedDialog = false;
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
        itemsByLabel.value = labeledItems;
      }
    });
  }

  // Lifecycle management
  function start() {
    startPolling(updateListItemOrder);
  }

  function stop() {
    stopPolling();
  }

  return {
    channel,
    start,
    stop,
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

export type ShoppingListPage = ReturnType<typeof createShoppingListPage>;

/**
 * React adapter: one controller per mount, polling while mounted, and a re-render whenever the
 * controller changes (ref writes, plus every action call since actions mutate items in place).
 */
export function useShoppingListPage(listId: string): ShoppingListPage {
  const [page] = useState(() => {
    const controller = createShoppingListPage(listId);
    // read-only helpers the page calls while rendering
    return withNotify(controller, controller.channel, [
      "matchesSearch",
      "countMatches",
      "hasMatches",
      "getLabelColor",
      "sortCheckedItems",
      "listItemFactory",
    ]);
  });
  useChannel(page.channel);
  useEffect(() => {
    page.start();
    return () => page.stop();
  }, [page]);
  return page;
}
