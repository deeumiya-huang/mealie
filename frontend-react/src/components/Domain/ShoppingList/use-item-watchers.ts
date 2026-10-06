// The two `watch`es that ShoppingListAddItemForm and ShoppingListItemEditor share (the Vue files declare them
// twice): an emptied quantity becomes 0, and picking another food takes over the food's label. `patchItem` assigns
// properties of the edited item in place and notifies its subscribers (the Vue reactive model).
import { useEffect, useRef } from "react";
import type { StateRef } from "@/hooks/shopping-list-page/state-ref";
import type { ShoppingListItemOut } from "@/lib/api/types/household";

export function patchItem(listItem: StateRef<ShoppingListItemOut>, patch: Partial<ShoppingListItemOut>) {
  Object.assign(listItem.value, patch);
  listItem.touch();
}

/** Calls `onChange` after `value` changed (not on mount), like a Vue `watch` without `immediate`. */
function useWatchChange<T>(value: T, onChange: (value: T) => void) {
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value) {
      return;
    }
    previous.current = value;
    onChange(value);
  });
}

export function useListItemWatchers(listItem: StateRef<ShoppingListItemOut>) {
  useWatchChange(listItem.value.quantity, (quantity) => {
    if (!quantity) {
      patchItem(listItem, { quantity: 0 });
    }
  });

  useWatchChange(listItem.value.food, (food) => {
    const label = food?.label || null;
    patchItem(listItem, { label, labelId: label?.id || null } as Partial<ShoppingListItemOut>);
  });
}
