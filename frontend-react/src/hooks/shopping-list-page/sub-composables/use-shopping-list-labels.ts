// Port of composables/shopping-list-page/sub-composables/use-shopping-list-labels.ts.
import { useI18n } from "@/i18n";
import type { ShoppingListOut } from "@/lib/api/types/household";
import type { MultiPurposeLabelSummary } from "@/lib/api/types/labels";
import type { StateRef } from "../state-ref";

/**
 * Composable for managing shopping list label state and operations
 */
export function useShoppingListLabels(shoppingList: StateRef<ShoppingListOut | null>) {
  const { t } = useI18n();

  // computed in Vue; evaluated on call here so it always reflects the current list
  function labelColorByName(): Record<string, string | undefined> {
    return shoppingList.value?.listItems
      ?.map(({ label }) => label as MultiPurposeLabelSummary)
      .filter(label => label)
      .reduce((acc, label) => ({
        ...acc,
        [label.name || t("shopping-list.no-label")]: label.color,
      }), {}) ?? {};
  }

  function getLabelColor(label: string) {
    return labelColorByName()[label];
  }

  return {
    getLabelColor,
  };
}
