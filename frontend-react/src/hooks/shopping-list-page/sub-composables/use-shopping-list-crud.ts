// Port of composables/shopping-list-page/sub-composables/use-shopping-list-crud.ts.
// Like the Vue version, the operations edit the items of `shoppingList.value` in place (the Vue reactive proxies
// made that visible to the UI; here `shoppingList.touch()` publishes it).
import { useUserApi } from "@/hooks/api";
import { uuid4 } from "@/hooks/use-utils";
import type { ShoppingListItemOut, ShoppingListMultiPurposeLabelOut, ShoppingListOut } from "@/lib/api/types/household";
import { patchReactive, useStateRef, type StateRef } from "../state-ref";
import type { ShoppingListItemGroups } from "./use-shopping-list-state";

export interface ShoppingListItemActionsLike {
  createItem: (item: ShoppingListItemOut) => void;
  updateItem: (item: ShoppingListItemOut) => void;
  deleteItem: (item: ShoppingListItemOut) => void;
}

/** Sets `checked` on every item that differs; returns whether anything changed. */
function setCheckedOnAll(list: ShoppingListOut | null, checked: boolean) {
  let hasChanged = false;
  list?.listItems?.forEach((item) => {
    if (item.checked !== checked) {
      hasChanged = true;
      item.checked = checked;
    }
  });
  return hasChanged;
}

/** Replaces `item` (matched by id) in the list's items; returns the new array. */
function replaceItem(list: ShoppingListOut, item: ShoppingListItemOut) {
  list.listItems?.forEach((oldListItem: ShoppingListItemOut, idx: number) => {
    if (oldListItem.id === item.id && list.listItems) {
      list.listItems[idx] = item;
    }
  });
}

function nextItemPosition(list: ShoppingListOut) {
  return list.listItems?.length
    ? (list.listItems
        .map(({ position }) => position || 0)
        .reduce((a, b) => Math.max(a, b))) + 1
    : 0;
}

/**
 * Composable for managing shopping list item CRUD operations
 */
export function useShoppingListCrud(
  shoppingList: StateRef<ShoppingListOut | null>,
  loadingCounter: StateRef<number>,
  listItems: ShoppingListItemGroups,
  shoppingListItemActions: ShoppingListItemActionsLike,
  refresh: () => void,
  sortCheckedItems: (a: ShoppingListItemOut, b: ShoppingListItemOut) => number,
  updateListItemOrder: () => void,
) {
  const userApi = useUserApi();

  function listItemFactory(): ShoppingListItemOut {
    return {
      id: uuid4(),
      shoppingListId: shoppingList.value?.id || "",
      checked: false,
      position: shoppingList.value?.listItems?.length || 1,
      quantity: 0,
      note: "",
      labelId: undefined,
      unitId: undefined,
      foodId: undefined,
    } as ShoppingListItemOut;
  }

  const createListItemData = useStateRef<ShoppingListItemOut>(listItemFactory);
  const localLabels = useStateRef<ShoppingListMultiPurposeLabelOut[] | undefined>(undefined);

  // Check/Uncheck All operations
  function checkAllItems() {
    if (setCheckedOnAll(shoppingList.value, true)) {
      shoppingList.touch();
      updateUncheckedListItems();
    }
  }

  function uncheckAllItems() {
    if (setCheckedOnAll(shoppingList.value, false)) {
      shoppingList.touch();
      patchReactive(listItems, {
        unchecked: [...listItems.unchecked, ...listItems.checked],
        checked: [],
      });
      updateUncheckedListItems();
    }
  }

  function deleteCheckedItems() {
    const checked = shoppingList.value?.listItems?.filter(item => item.checked);

    if (!checked || checked?.length === 0) {
      return;
    }

    loadingCounter.set(loadingCounter.value + 1);
    deleteListItems(checked);
    loadingCounter.set(loadingCounter.value - 1);
    refresh();
  }

  function saveListItem(item: ShoppingListItemOut) {
    const list = shoppingList.value;
    if (!list) {
      return;
    }

    // set a temporary updatedAt timestamp prior to refresh so it appears at the top of the checked items
    item.updatedAt = new Date().toISOString();

    // make updates reflect immediately
    if (list.listItems) {
      replaceItem(list, item);
      // Immediately update checked/unchecked arrays for UI
      patchReactive(listItems, {
        unchecked: list.listItems.filter(i => !i.checked),
        checked: list.listItems.filter(i => i.checked).sort(sortCheckedItems),
      });
    }

    shoppingListItemActions.updateItem(item);
    updateListItemOrder();
    shoppingList.touch();
  }

  function deleteListItem(item: ShoppingListItemOut) {
    const list = shoppingList.value;
    if (!list) {
      return;
    }

    shoppingListItemActions.deleteItem(item);

    // remove the item from the list immediately so the user sees the change
    if (list.listItems) {
      list.listItems = list.listItems.filter(itm => itm.id !== item.id);
      shoppingList.touch();
    }

    refresh();
  }

  function deleteListItems(items: ShoppingListItemOut[]) {
    const list = shoppingList.value;
    if (!list) {
      return;
    }

    items.forEach((item) => {
      shoppingListItemActions.deleteItem(item);
    });
    // remove the items from the list immediately so the user sees the change
    if (list.listItems) {
      const deletedItems = new Set(items.map(item => item.id));
      list.listItems = list.listItems.filter(itm => !deletedItems.has(itm.id));
      shoppingList.touch();
    }

    refresh();
  }

  function createListItem() {
    const list = shoppingList.value;
    if (!list) {
      return;
    }

    const data = createListItemData.value;
    if (!data.foodId && !data.note) {
      // don't create an empty item
      return;
    }

    loadingCounter.set(loadingCounter.value + 1);

    // ensure list id is set to the current list, which may not have loaded yet in the factory
    data.shoppingListId = list.id;

    // ensure item is inserted into the end of the list, which may have been updated
    data.position = nextItemPosition(list);

    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;

    updateListItemOrder();

    shoppingListItemActions.createItem(data);
    loadingCounter.set(loadingCounter.value - 1);

    if (list.listItems) {
      // add the item to the list immediately so the user sees the change
      list.listItems.push(data);
      shoppingList.touch();
      updateListItemOrder();
    }
    createListItemData.set(listItemFactory());
    refresh();
  }

  function updateUncheckedListItems() {
    if (!shoppingList.value?.listItems) {
      return;
    }

    // Set position for unchecked items
    listItems.unchecked.forEach((item: ShoppingListItemOut, idx: number) => {
      item.position = idx;
      shoppingListItemActions.updateItem(item);
    });

    refresh();
  }

  // Label management
  function updateLabelOrder(labelSettings: ShoppingListMultiPurposeLabelOut[]) {
    if (!shoppingList.value) {
      return;
    }

    labelSettings.forEach((labelSetting, index) => {
      labelSetting.position = index;
      return labelSetting;
    });

    localLabels.set(labelSettings);
  }

  function cancelLabelOrder() {
    loadingCounter.set(loadingCounter.value - 1);
    if (!shoppingList.value) {
      return;
    }
    // restore original state
    localLabels.set(shoppingList.value.labelSettings);
  }

  async function saveLabelOrder(updateItemsByLabel: () => void) {
    const list = shoppingList.value;
    if (!list || !localLabels.value || (localLabels.value === list.labelSettings)) {
      return;
    }

    loadingCounter.set(loadingCounter.value + 1);
    const { data } = await userApi.shopping.lists.updateLabelSettings(list.id, localLabels.value);
    loadingCounter.set(loadingCounter.value - 1);

    if (data) {
      // update shoppingList labels using the API response
      list.labelSettings = (data as ShoppingListOut).labelSettings;
      shoppingList.touch();
      updateItemsByLabel();
    }
  }

  function toggleReorderLabelsDialog(reorderLabelsDialog: StateRef<boolean>) {
    // stop polling and populate localLabels
    loadingCounter.set(loadingCounter.value + 1);
    reorderLabelsDialog.set(!reorderLabelsDialog.value);
    localLabels.set(shoppingList.value?.labelSettings);
  }

  return {
    createListItemData,
    localLabels,
    listItemFactory,
    checkAllItems,
    uncheckAllItems,
    deleteCheckedItems,
    saveListItem,
    deleteListItem,
    deleteListItems,
    createListItem,
    updateUncheckedListItems,
    updateLabelOrder,
    cancelLabelOrder,
    saveLabelOrder,
    toggleReorderLabelsDialog,
  };
}
