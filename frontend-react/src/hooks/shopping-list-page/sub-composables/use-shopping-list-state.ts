import { computed, defaultChannel, reactive, ref } from "~/lib/observable";
import type { ChangeChannel, Ref } from "~/lib/observable";
import type { ShoppingListItemOut, ShoppingListOut } from "~/lib/api/types/household";

/**
 * Shopping list state and derived data (the Vue `useShoppingListState` composable, as a plain
 * controller; see ~/lib/observable).
 */
export function createShoppingListState(channel: ChangeChannel = defaultChannel) {
  const loadingCounter = ref(1, channel);
  const recipeReferenceLoading = ref(false, channel);
  const preserveItemOrder = ref(false, channel);

  // UI state
  const edit = ref(false, channel);
  const threeDot = ref(false, channel);
  const reorderLabelsDialog = ref(false, channel);
  const createEditorOpen = ref(false, channel);

  // Dialog states
  const state = reactive({
    checkAllDialog: false,
    uncheckAllDialog: false,
    deleteCheckedDialog: false,
  }, channel);

  // Hydrate listItems from shoppingList.value?.listItems
  const listItems = reactive({
    unchecked: [] as ShoppingListItemOut[],
    checked: [] as ShoppingListItemOut[],
  }, channel);

  function sortCheckedItems(a: ShoppingListItemOut, b: ShoppingListItemOut) {
    if (a.updatedAt! === b.updatedAt!) {
      return ((a.position || 0) > (b.position || 0)) ? -1 : 1;
    }
    return a.updatedAt! < b.updatedAt! ? 1 : -1;
  }

  // The Vue watcher on `shoppingList.value?.listItems`: re-split whenever the list or its items
  // array is replaced.
  let current: ShoppingListOut | null = null;
  function splitItems() {
    const items = current?.listItems;
    listItems.unchecked = (items?.filter(item => !item.checked) ?? []);
    listItems.checked = (items?.filter(item => item.checked).sort(sortCheckedItems) ?? []);
  }
  function track(list: ShoppingListOut | null): ShoppingListOut | null {
    if (!list) return list;
    return new Proxy(list, {
      set(obj, key, value) {
        Reflect.set(obj, key, value);
        if (key === "listItems") splitItems();
        channel.notify();
        return true;
      },
    });
  }
  const shoppingList: Ref<ShoppingListOut | null> = {
    get value() {
      return current;
    },
    set value(next) {
      current = track(next);
      splitItems();
      channel.notify();
    },
  };

  const recipeMap = computed(() => new Map(
    (shoppingList.value?.recipeReferences?.map(ref => ref.recipe) ?? [])
      .map(recipe => [recipe.id || "", recipe]),
  ));

  const recipeList = computed(() => Array.from(recipeMap.value.values()));

  return {
    shoppingList,
    loadingCounter,
    recipeReferenceLoading,
    preserveItemOrder,
    edit,
    threeDot,
    reorderLabelsDialog,
    createEditorOpen,
    state,
    listItems,
    recipeMap,
    recipeList,
    sortCheckedItems,
  };
}
