import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useOnline } from "@/hooks/utils";
import { getStorageStore } from "@/hooks/utils/use-storage";
import { useShoppingListItemActions, type ShoppingListQueue } from "../use-shopping-list-item-actions";
import type { ShoppingListItemOut } from "@/lib/api/types/household";
import { MOCK_ITEM, MOCK_SHOPPING_LIST } from "./mocks";

const getOne = vi.fn().mockResolvedValue({ data: MOCK_SHOPPING_LIST });

const deleteMany = vi.fn().mockImplementation(async () => { });
const updateMany = vi.fn().mockImplementation(async () => { });
const createMany = vi.fn().mockImplementation(async () => { });

vi.mock("@/hooks/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/utils")>();
  return { ...actual, useOnline: vi.fn() };
});
// `isOnline` is what the mocked `useOnline()` returns; re-render after changing it
const isOnline = { value: true };
vi.mocked(useOnline).mockImplementation(() => isOnline.value);
// the queues of every list live in this local storage entry (VueUse `useStorage` mock in the Vue test)
const storedValue = getStorageStore<{ [key: string]: ShoppingListQueue }>("local", "shopping-list-queue", {});

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({
    shopping: {
      lists: { getOne },
      items: { deleteMany, updateMany, createMany },
    },
  }),
}));

describe("useShoppingListItemActions", () => {
  // testing-library unmounts rendered hooks after every test, so the hook is rendered again before each one
  let actions: ReturnType<typeof useShoppingListItemActions>;
  let rerender: () => void;
  const getList = () => actions.getList();
  const createItem = (item: ShoppingListItemOut) => actions.createItem(item);
  const deleteItem = (item: ShoppingListItemOut) => actions.deleteItem(item);
  const updateItem = (item: ShoppingListItemOut) => actions.updateItem(item);
  const process = () => actions.process();
  const queue = {
    get create() { return actions.__testing__.queue.create; },
    get update() { return actions.__testing__.queue.update; },
    get delete() { return actions.__testing__.queue.delete; },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    isOnline.value = true;
    storedValue.set({});
    const rendered = renderHook(() => useShoppingListItemActions("list_id"));
    actions = rendered.result.current;
    rerender = rendered.rerender;
    actions.__testing__.clearQueueItems("all");
  });

  test("getList returns a shopping list", async () => {
    const list = await getList();
    expect(list).toBe(MOCK_SHOPPING_LIST);
  });
  test("create item creates an item", () => {
    createItem(MOCK_ITEM);
    expect(queue.create.includes(MOCK_ITEM));
  });
  describe("updateItem", () => {
    test("update item updates an item", () => {
      updateItem(MOCK_ITEM);
      expect(queue.update).include(MOCK_ITEM);
    });
    test("ignores a newly created item", () => {
      const updatedItem = { ...MOCK_ITEM, quantity: 2000 };
      createItem(MOCK_ITEM);
      updateItem(updatedItem);
      expect(queue.update).not.include(MOCK_ITEM);
      expect(queue.create).not.include(MOCK_ITEM);
      expect(queue.create).include(updatedItem);
    });
  });
  describe("deleteItem", () => {
    test("delete item deletes an item", () => {
      deleteItem(MOCK_ITEM);
      expect(queue.delete).include(MOCK_ITEM);
    });
    test("undoes a newly created item", () => {
      createItem(MOCK_ITEM);
      deleteItem(MOCK_ITEM);
      expect(queue.delete).not.include(MOCK_ITEM);
      expect(queue.create).not.include(MOCK_ITEM);
    });
  });
  describe("process processes the queue", () => {
    test("normally", async () => {
      const updatedItem = { ...MOCK_ITEM, id: "update" };
      const createdItem = { ...MOCK_ITEM, id: "create" };
      const deletedItem = { ...MOCK_ITEM, id: "delete" };

      updateItem(updatedItem);
      createItem(createdItem);
      deleteItem(deletedItem);

      await process();
      expect(queue.update).not.include(updatedItem);
      expect(queue.create).not.include(createdItem);
      expect(queue.delete).not.include(deletedItem);
    });
    test("clears the queue if there was an error merging", async () => {
      updateMany.mockThrowOnce("💥 Woe, exception be upon ye 💥");
      createMany.mockThrowOnce("💥 Woe, exception be upon ye 💥");
      deleteMany.mockThrowOnce("💥 Woe, exception be upon ye 💥");

      const updatedItem = { ...MOCK_ITEM, id: "update" };
      const createdItem = { ...MOCK_ITEM, id: "create" };
      const deletedItem = { ...MOCK_ITEM, id: "delete" };

      updateItem(updatedItem);
      createItem(createdItem);
      deleteItem(deletedItem);

      await process();
      expect(queue.update).not.include(updatedItem);
      expect(queue.create).not.include(createdItem);
      expect(queue.delete).not.include(deletedItem);
    });
    test("doesn't clear the queue if offline", async () => {
      isOnline.value = false;
      rerender();

      const updatedItem = { ...MOCK_ITEM, id: "update" };
      const createdItem = { ...MOCK_ITEM, id: "create" };
      const deletedItem = { ...MOCK_ITEM, id: "delete" };

      updateItem(updatedItem);
      createItem(createdItem);
      deleteItem(deletedItem);

      await process();
      expect(queue.update).include(updatedItem);
      expect(queue.create).include(createdItem);
      expect(queue.delete).include(deletedItem);
    });
    test("doesn't do anything if the queue is empty", async () => {
      await process();
      expect(updateMany).not.toHaveBeenCalled();
      expect(createMany).not.toHaveBeenCalled();
      expect(deleteMany).not.toHaveBeenCalled();
    });
    test("doesn't do anything if we can't find the list", async () => {
      getOne.mockResolvedValue({ data: undefined });
      const updatedItem = { ...MOCK_ITEM, id: "update" };
      const createdItem = { ...MOCK_ITEM, id: "create" };
      const deletedItem = { ...MOCK_ITEM, id: "delete" };

      updateItem(updatedItem);
      createItem(createdItem);
      deleteItem(deletedItem);

      await process();
      expect(updateMany).not.toHaveBeenCalled();
      expect(createMany).not.toHaveBeenCalled();
      expect(deleteMany).not.toHaveBeenCalled();
    });
  });
  describe("getQueue", () => {
    test("fetches from local storage if available", () => {
      const { result } = renderHook(() => useShoppingListItemActions("list_id"));
      const { queue, createEmptyQueue } = result.current.__testing__;
      expect(queue).not.toEqual(createEmptyQueue);
    });
  });
});
