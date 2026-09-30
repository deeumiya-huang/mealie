import { useEffect, useState } from "react";
import { createStoreActions } from "./partials/use-actions-factory";
import { userApi } from "~/hooks/api";
import { createStore, registerCacheReset, useStore } from "~/lib/store";
import type { GroupRecipeActionOut, GroupRecipeActionType } from "~/lib/api/types/household";
import type { RequestResponse } from "~/lib/api/types/non-generated";
import type { Recipe } from "~/lib/api/types/recipe";

const groupRecipeActionsStore = createStore<GroupRecipeActionOut[] | null>(null);
const loadingStore = createStore(false);
const initializedStore = createStore(false);

export function resetGroupRecipeActions() {
  groupRecipeActionsStore.set(null);
  loadingStore.set(false);
  initializedStore.set(false);
}
registerCacheReset(resetGroupRecipeActions);

export function useGroupRecipeActionData() {
  const empty = { id: "", actionType: "link" as GroupRecipeActionType, title: "", url: "" };
  const [data, setData] = useState(empty);
  return { data, setData, reset: () => setData(empty) };
}

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
}

export async function executeRecipeAction(action: GroupRecipeActionOut, recipe: Recipe, recipeScale: number): Promise<void | RequestResponse<unknown>> {
  const url = parseRecipeActionUrl(action.url, recipe, recipeScale);
  switch (action.actionType) {
    case "link":
      window.open(url, "_blank")?.focus();
      return;
    case "post":
      return await userApi().groupRecipeActions.triggerAction(action.id, recipe.slug || "", recipeScale);
    default:
      break;
  }
}

export const useGroupRecipeActions = function (
  orderBy: string | null = "title",
  orderDirection: string | null = "asc",
) {
  const recipeActions = useStore(groupRecipeActionsStore);

  async function refreshGroupRecipeActions() {
    loadingStore.set(true);
    const { data } = await userApi().groupRecipeActions.getAll(1, -1, { orderBy, orderDirection });
    groupRecipeActionsStore.set(data?.items || null);
    loadingStore.set(false);
  }

  useEffect(() => {
    if (!groupRecipeActionsStore.get() && !loadingStore.get()) {
      void refreshGroupRecipeActions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once
  }, []);

  // The Vue composable passed `{ orderBy }` where the `initialized` ref belongs; here it is the
  // default query params, which is what it was meant to be.
  const actions = createStoreActions<GroupRecipeActionOut>(
    "group-recipe-actions",
    () => userApi().groupRecipeActions,
    groupRecipeActionsStore as unknown as ReturnType<typeof createStore<GroupRecipeActionOut[]>>,
    loadingStore,
    initializedStore,
    { orderBy },
  );

  return { actions, execute: executeRecipeAction, recipeActions };
};
