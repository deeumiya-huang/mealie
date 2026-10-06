// Port of composables/shopping-list-page/sub-composables/use-shopping-list-item-actions.ts.
// The offline queue is a plain mutable object (the Vue `reactive` queue) that is written through to the
// `shopping-list-queue` local storage entry after every change, like the deep watcher did. `isOnline` is read at
// call time from the latest render's `useOnline()`.
import { useEffect, useState } from "react";
import { useUserApi } from "@/hooks/api";
import { useOnline } from "@/hooks/utils";
import { getStorageStore } from "@/hooks/utils/use-storage";
import type { ShoppingListItemOut, ShoppingListOut } from "@/lib/api/types/household";
import type { RequestResponse } from "@/lib/api/types/non-generated";
import { useQuietRef } from "../state-ref";

const localStorageKey = "shopping-list-queue";
const queueTimeout = 5 * 60 * 1000; // 5 minutes

type ItemQueueType = "create" | "update" | "delete";

export interface ShoppingListQueue {
  create: ShoppingListItemOut[];
  update: ShoppingListItemOut[];
  delete: ShoppingListItemOut[];

  lastUpdate: number;
}

interface Storage {
  [key: string]: ShoppingListQueue;
}

type ItemsApi = ReturnType<typeof useUserApi>["shopping"];

function isValidQueueObject(obj: unknown): obj is ShoppingListQueue {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const hasRequiredProps = "create" in obj && "update" in obj && "delete" in obj && "lastUpdate" in obj;
  if (!hasRequiredProps) {
    return false;
  }

  const queue = obj as ShoppingListQueue;
  const arraysValid = Array.isArray(queue.create) && Array.isArray(queue.update) && Array.isArray(queue.delete);

  const lastUpdateValid = typeof queue.lastUpdate === "number" && !isNaN(new Date(queue.lastUpdate).getTime());

  return arraysValid && lastUpdateValid;
}

function createEmptyQueue(): ShoppingListQueue {
  const newQueue = { create: [], update: [], delete: [], lastUpdate: Date.now() };
  return newQueue;
}

function removeFromQueue(itemQueue: ShoppingListItemOut[], item: ShoppingListItemOut): boolean {
  const index = itemQueue.findIndex(i => i.id === item.id);
  if (index === -1) {
    return false;
  }

  itemQueue.splice(index, 1);
  return true;
}

function mergeListItemsByLatest(
  list1: ShoppingListItemOut[],
  list2: ShoppingListItemOut[],
) {
  const mergedList = [...list1];
  list2.forEach((list2Item) => {
    const conflictingItem = mergedList.find(item => item.id === list2Item.id);
    if (conflictingItem
      && list2Item.updatedAt && conflictingItem.updatedAt
      && list2Item.updatedAt > conflictingItem.updatedAt) {
      mergedList.splice(mergedList.indexOf(conflictingItem), 1, list2Item);
    }
    else if (!conflictingItem) {
      mergedList.push(list2Item);
    }
  });
  return mergedList;
}

function createItemActions(shoppingListId: string, shopping: ItemsApi, isOnline: () => boolean) {
  const storage = getStorageStore<Storage>("local", localStorageKey, {} as Storage);

  function getQueue(): ShoppingListQueue {
    try {
      const fetchedQueue = storage.get()[shoppingListId];
      if (!isValidQueueObject(fetchedQueue)) {
        console.log("Invalid queue object in local storage; resetting queue.");
        return createEmptyQueue();
      }
      else {
        return fetchedQueue;
      }
    }
    catch (error) {
      console.log("Error validating queue object in local storage; resetting queue.", error);
      return createEmptyQueue();
    }
  }

  const queue: ShoppingListQueue = { ...getQueue() };
  const queueEmpty = () => !queue.create.length && !queue.update.length && !queue.delete.length;
  if (queueEmpty()) {
    queue.lastUpdate = Date.now();
  }

  // the deep `watch(queue)` of the Vue version: write the queue through to local storage
  function persist() {
    storage.set(current => ({ ...current, [shoppingListId]: { ...queue } }));
  }

  async function getList() {
    const response = await shopping.lists.getOne(shoppingListId);
    if (response.data) {
      // Merge pending local changes (both online and offline)
      const createAndUpdateQueues = mergeListItemsByLatest(queue.update, queue.create);
      const deleteQueueIds = new Set(queue.delete.map(item => item.id));

      const filteredLocalChanges = createAndUpdateQueues.filter(item => !deleteQueueIds.has(item.id));
      let mergedItems = mergeListItemsByLatest(response.data.listItems ?? [], filteredLocalChanges);
      mergedItems = mergedItems.filter(item => !deleteQueueIds.has(item.id));

      response.data.listItems = mergedItems;
    }
    return response.data;
  }

  function createItem(item: ShoppingListItemOut) {
    removeFromQueue(queue.create, item);
    removeFromQueue(queue.update, item);
    removeFromQueue(queue.delete, item);

    queue.create.push(item);
    persist();
  }

  function updateItem(item: ShoppingListItemOut) {
    const removedFromCreate = removeFromQueue(queue.create, item);
    removeFromQueue(queue.update, item);
    removeFromQueue(queue.delete, item);

    if (removedFromCreate) {
      // This item hasn't been created yet, so keep it in create queue with updated data
      queue.create.push(item);
    }
    else {
      queue.update.push(item);
    }
    persist();
  }

  function deleteItem(item: ShoppingListItemOut) {
    const removedFromCreate = removeFromQueue(queue.create, item);
    if (removedFromCreate) {
      // This item hasn't been created yet, so we don't need to delete it
      persist();
      return;
    }

    removeFromQueue(queue.update, item);
    removeFromQueue(queue.delete, item);
    queue.delete.push(item);
    persist();
  }

  function getQueueItems(itemQueueType: ItemQueueType) {
    return queue[itemQueueType];
  }

  function clearQueueItems(itemQueueType: ItemQueueType | "all", itemIds: string[] | null = null) {
    if (itemQueueType === "create" || itemQueueType === "all") {
      queue.create = itemIds ? queue.create.filter(item => !itemIds.includes(item.id)) : [];
    }
    if (itemQueueType === "update" || itemQueueType === "all") {
      queue.update = itemIds ? queue.update.filter(item => !itemIds.includes(item.id)) : [];
    }
    if (itemQueueType === "delete" || itemQueueType === "all") {
      queue.delete = itemIds ? queue.delete.filter(item => !itemIds.includes(item.id)) : [];
    }
    if (queueEmpty()) {
      queue.lastUpdate = Date.now();
    }
    persist();
  }

  function checkUpdateState(list: ShoppingListOut) {
    const cutoffDate = new Date(queue.lastUpdate + queueTimeout).toISOString();
    if (list.updatedAt && list.updatedAt > cutoffDate) {
      // If the queue is too far behind the shopping list to reliably do updates, we clear the queue
      console.log("Out of sync with server; clearing queue");
      clearQueueItems("all");
    }
  }

  /**
   * Processes the queue items and returns whether the processing was successful.
   */
  async function processQueueItems(
    action: (items: ShoppingListItemOut[]) => Promise<RequestResponse<unknown>>,
    itemQueueType: ItemQueueType,
  ): Promise<boolean> {
    let queueItems: ShoppingListItemOut[];
    try {
      queueItems = getQueueItems(itemQueueType);
      if (!queueItems.length) {
        return true;
      }
    }
    catch (error) {
      console.log(`Error fetching queue items of type ${itemQueueType}:`, error);
      clearQueueItems(itemQueueType);
      return false;
    }

    try {
      const itemsToProcess = [...queueItems];
      const itemIdsToProcess = itemsToProcess.map(item => item.id);

      await action(itemsToProcess)
        .then(() => {
          if (isOnline()) {
            clearQueueItems(itemQueueType, itemIdsToProcess);
          }
        });
    }
    catch (error) {
      console.log(`Error processing queue items of type ${itemQueueType}:`, error);
      clearQueueItems(itemQueueType);
      return false;
    }

    return true;
  }

  async function process() {
    if (queueEmpty()) {
      queue.lastUpdate = Date.now();
      persist();
      return;
    }

    const data = await getList();
    if (!data) {
      return;
    }
    checkUpdateState(data);

    // We send each bulk request one at a time, since the backend may merge items
    // "failures" here refers to an actual error, rather than failing to reach the backend
    let failures = 0;
    if (!(await processQueueItems(items => shopping.items.deleteMany(items), "delete"))) failures++;
    if (!(await processQueueItems(items => shopping.items.updateMany(items), "update"))) failures++;
    if (!(await processQueueItems(items => shopping.items.createMany(items), "create"))) failures++;

    // If we're online, or the queue is empty, the queue is fully processed, so we're up to date
    // Otherwise, if all three queue processes failed, we've already reset the queue, so we need to reset the date
    if (isOnline() || queueEmpty() || failures === 3) {
      queue.lastUpdate = Date.now();
      persist();
    }
  }

  return {
    getList,
    createItem,
    updateItem,
    deleteItem,
    process,
    persist,

    __testing__: {
      queue,
      clearQueueItems,
      createEmptyQueue,
    },
  };
}

export function useShoppingListItemActions(shoppingListId: string) {
  const { shopping } = useUserApi();
  const isOnline = useOnline();
  const latestOnline = useQuietRef(isOnline);
  useEffect(() => {
    latestOnline.set(isOnline);
  }, [latestOnline, isOnline]);

  // built once per list: the queue object has to stay the same object for the lifetime of the page
  const [actions] = useState(() => createItemActions(shoppingListId, shopping, () => latestOnline.value));
  useEffect(() => {
    actions.persist();
  }, [actions]);

  return actions;
}
