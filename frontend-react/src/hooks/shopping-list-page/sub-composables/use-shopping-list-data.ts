// Port of composables/shopping-list-page/sub-composables/use-shopping-list-data.ts.
// `isOffline` is a plain boolean (re-rendered by `useOnline()`); the async refresh/poll code reads the latest
// online/idle flags through a small ref, because it keeps running across renders.
import { useEffect } from "react";
import { useIdle, useOnline } from "@/hooks/utils";
import type { ShoppingListOut } from "@/lib/api/types/household";
import { useQuietRef, type StateRef } from "../state-ref";
import { useShoppingListItemActions } from "./use-shopping-list-item-actions";

interface PollState {
  attempts: number;
  timer: ReturnType<typeof setInterval> | undefined;
}

/**
 * Composable for managing shopping list data fetching and polling
 */
export function useShoppingListData(
  listId: string,
  shoppingList: StateRef<ShoppingListOut | null>,
  loadingCounter: StateRef<number>,
  maxAttempts = 17280,
) {
  const isOffline = useOnline() === false;
  const { idle } = useIdle(5 * 60 * 1000); // 5 minutes
  const shoppingListItemActions = useShoppingListItemActions(listId);

  const latest = useQuietRef({ isOffline, idle });
  useEffect(() => {
    latest.set({ isOffline, idle });
  }, [latest, isOffline, idle]);

  // the Vue composable decremented the counter (which starts at 1) once, while it was being set up
  const initialised = useQuietRef(false);
  useEffect(() => {
    if (!initialised.value) {
      initialised.set(true);
      loadingCounter.set(loadingCounter.value - 1);
    }
  }, [initialised, loadingCounter]);

  // max poll time = pollFrequency * maxAttempts = 24 hours
  // we use a long max poll time since polling stops when the user is idle anyway
  const pollFrequency = 5000;
  const polling = useQuietRef<PollState>({ attempts: 0, timer: undefined });

  async function fetchShoppingList() {
    const data = await shoppingListItemActions.getList();
    return data;
  }

  async function refresh(updateListItemOrder: () => void) {
    loadingCounter.set(loadingCounter.value + 1);
    try {
      await shoppingListItemActions.process();
    }
    catch (error) {
      console.error(error);
    }

    let newListValue: ShoppingListOut | null = null;
    try {
      newListValue = await fetchShoppingList();
    }
    catch (error) {
      console.error(error);
    }

    loadingCounter.set(loadingCounter.value - 1);

    // only update the list with the new value if we're not loading, to prevent UI jitter
    if (loadingCounter.value) {
      return;
    }

    // Prevent overwriting local changes with stale backend data when offline
    if (latest.value.isOffline) {
      // Do not update shoppingList from backend when offline
      updateListItemOrder();
      return;
    }

    // if we're not connected to the network, this will be null, so we don't want to clear the list
    if (newListValue) {
      shoppingList.set(newListValue);
    }

    updateListItemOrder();
  }

  function setAttempts(attempts: number) {
    polling.set({ ...polling.value, attempts });
  }

  // constantly polls for changes
  async function pollForChanges(updateListItemOrder: () => void) {
    // pause polling if the user isn't active or we're busy
    if (latest.value.idle || loadingCounter.value) {
      return;
    }

    try {
      await refresh(updateListItemOrder);

      if (shoppingList.value) {
        setAttempts(0);
        return;
      }

      // if the refresh was unsuccessful, the shopping list will be null, so we increment the attempt counter
      setAttempts(polling.value.attempts + 1);
    }
    catch {
      setAttempts(polling.value.attempts + 1);
    }

    // if we hit too many errors, stop polling
    if (polling.value.attempts >= maxAttempts) {
      clearInterval(polling.value.timer);
    }
  }

  function startPolling(updateListItemOrder: () => void) {
    void pollForChanges(updateListItemOrder); // populate initial list

    const timer = setInterval(() => {
      void pollForChanges(updateListItemOrder);
    }, pollFrequency);
    polling.set({ ...polling.value, timer });
  }

  function stopPolling() {
    if (polling.value.timer) {
      clearInterval(polling.value.timer);
    }
  }

  return {
    isOffline,
    fetchShoppingList,
    refresh,
    startPolling,
    stopPolling,
    shoppingListItemActions,
  };
}
