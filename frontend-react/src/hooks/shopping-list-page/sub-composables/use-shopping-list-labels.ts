import { computed } from "~/lib/observable";
import type { Ref } from "~/lib/observable";
import { getGlobalI18n } from "~/hooks/use-global-i18n";
import type { ShoppingListOut } from "~/lib/api/types/household";
import type { MultiPurposeLabelSummary } from "~/lib/api/types/labels";

/**
 * Shopping list label state and operations
 */
export function createShoppingListLabels(shoppingList: Ref<ShoppingListOut | null>) {
  const { t } = getGlobalI18n();

  const labelColorByName = computed<Record<string, string | null | undefined>>(() => {
    return shoppingList.value?.listItems
      ?.map(({ label }) => label as MultiPurposeLabelSummary)
      .filter(label => label)
      .reduce((acc, label) => ({
        ...acc,
        [label.name || t("shopping-list.no-label")]: label.color,
      }), {}) ?? {};
  });

  function getLabelColor(label: string) {
    return labelColorByName.value[label];
  }

  return {
    getLabelColor,
  };
}
