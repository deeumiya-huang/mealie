import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserApi } from "@/hooks/api";
import { registerCacheReset } from "@/hooks/use-clear-composable-caches";
import { createStoreActions } from "@/hooks/partials/use-actions-factory";
import { createStore, useStore } from "@/lib/store";
import type { GroupRecipeActionOut, GroupRecipeActionType } from "@/lib/api/types/household";
import type { RequestResponse } from "@/lib/api/types/non-generated";
import type { Recipe } from "@/lib/api/types/recipe";

// Module state shared by every component (Vue: module-level refs). `loaded` stands for Vue's
// "ref is not null yet": the items are an array that starts empty.
const groupRecipeActions = createStore<GroupRecipeActionOut[]>([]);
const loaded = createStore(false);
const loading = createStore(false);
const initialized = createStore(false);

export function resetGroupRecipeActions() {
  groupRecipeActions.set([]);
  loaded.set(false);
  loading.set(false);
  initialized.set(false);
}
registerCacheReset(resetGroupRecipeActions);

export interface GroupRecipeActionFormData {
  id: string;
  actionType: GroupRecipeActionType;
  title: string;
  url: string;
}

const emptyActionData = (): GroupRecipeActionFormData => ({
  id: "",
  actionType: "link",
  title: "",
  url: "",
});

export function useGroupRecipeActionData() {
  const [data, setData] = useState<GroupRecipeActionFormData>(emptyActionData);

  const reset = useCallback(() => {
    setData(emptyActionData());
  }, []);

  return {
    data,
    setData,
    reset,
  };
}

export const useGroupRecipeActions = function (
  orderBy: string | null = "title",
  orderDirection: string | null = "asc",
) {
  const api = useUserApi();
  const items = useStore(groupRecipeActions);
  const isLoaded = useStore(loaded);

  const refreshGroupRecipeActions = useCallback(async () => {
    loading.set(true);
    const { data } = await api.groupRecipeActions.getAll(1, -1, { orderBy, orderDirection });
    groupRecipeActions.set(data?.items || []);
    loaded.set(!!data?.items);
    loading.set(false);
  }, [api, orderBy, orderDirection]);

  // null until the first load, like the Vue ref
  const recipeActions: GroupRecipeActionOut[] | null = isLoaded || items.length > 0 ? items : null;

  function parseRecipeActionUrl(url: string, recipe: Recipe, recipeScale: number): string {
    const recipeServings = (recipe.recipeServings || 1) * recipeScale;
    const recipeYieldQuantity = (recipe.recipeYieldQuantity || 1) * recipeScale;

    return url
      .replace("${url}", window.location.href)
      .replace("${id}", recipe.id || "")
      .replace("${slug}", recipe.slug || "")
      .replace("${servings}", recipeServings.toString())
      .replace("${yieldQuantity}", recipeYieldQuantity.toString())
      .replace("${yieldText}", recipe.recipeYield || "");
  };

  async function execute(action: GroupRecipeActionOut, recipe: Recipe, recipeScale: number): Promise<void | RequestResponse<unknown>> {
    const url = parseRecipeActionUrl(action.url, recipe, recipeScale);

    switch (action.actionType) {
      case "link":
        window.open(url, "_blank")?.focus();
        return;
      case "post":
        return await api.groupRecipeActions.triggerAction(action.id, recipe.slug || "", recipeScale);
      default:
        break;
    }
  };

  // Vue: `if (!groupRecipeActions.value && !loading.value) refreshGroupRecipeActions()` during setup
  useEffect(() => {
    if (!loaded.get() && !loading.get()) {
      void refreshGroupRecipeActions();
    }
  }, [refreshGroupRecipeActions]);

  // Vue passed `{ orderBy }` in the `initialized` position of useStoreActions, so the factory's own
  // default query params stayed empty; the same arguments are used here.
  const actions = useMemo(
    () => createStoreActions<GroupRecipeActionOut>(
      "group-recipe-actions",
      api.groupRecipeActions,
      groupRecipeActions,
      loading,
      initialized,
    ),
    [api],
  );

  return {
    actions,
    execute,
    recipeActions,
  };
};
