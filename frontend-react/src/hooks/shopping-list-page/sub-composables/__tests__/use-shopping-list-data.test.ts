import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useIdle, useOnline } from "@/hooks/utils";
import type { ShoppingListOut } from "@/lib/api/types/household";
import { createStateRef } from "../../state-ref";
import { useShoppingListData } from "../use-shopping-list-data";
import { MOCK_ITEM, MOCK_SHOPPING_LIST } from "./mocks";

const mockUpdate = vi.fn();
const getOne = vi.fn().mockResolvedValue({ data: MOCK_SHOPPING_LIST });
const deleteMany = vi.fn();
const updateMany = vi.fn();
const createMany = vi.fn();
const consoleError = vi.spyOn(console, "error");
vi.spyOn(window, "setInterval").mockImplementation((fn) => {
  new Promise(resolve => setTimeout(resolve, 1)).then(() => fn());
  return "TIMEOUT" as unknown as ReturnType<typeof setInterval>;
});
const mockClearInterval = vi.spyOn(window, "clearInterval");

vi.mock("@/hooks/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/utils")>();
  return { ...actual, useOnline: vi.fn(), useIdle: vi.fn() };
});
vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({
    shopping: {
      lists: { getOne },
      items: { deleteMany, updateMany, createMany },
    },
  }),
}));

const mockUseOnline = vi.mocked(useOnline);
const mockUseIdle = vi.mocked(useIdle);

describe("use-shopping-list-data", () => {
  // what the mocked `useOnline()` / `useIdle()` return; re-render after changing them
  const isOnline = { value: true };
  const isIdle = { value: false };
  mockUseOnline.mockImplementation(() => isOnline.value);
  mockUseIdle.mockImplementation(() => ({ idle: isIdle.value, lastActive: 0 }));

  const list = { ...MOCK_SHOPPING_LIST, id: "1" };
  const shoppingList = createStateRef<ShoppingListOut | null>(list);
  const loadingCounter = createStateRef(0);

  // testing-library unmounts rendered hooks after every test, so the hook is rendered again before each one
  let hook: ReturnType<typeof renderHook<ReturnType<typeof useShoppingListData>, unknown>>;
  const data = () => hook.result.current;

  beforeEach(() => {
    shoppingList.value = list;
    loadingCounter.value = 0;
    isOnline.value = true;
    isIdle.value = false;
    mockUpdate.mockClear();
    mockClearInterval.mockClear();
    consoleError.mockClear();
    hook = renderHook(() => useShoppingListData("list_id", shoppingList, loadingCounter, 2));
    // the hook decrements the counter once when it is set up
    loadingCounter.value = 0;
  });

  test("can determine if the user is online", () => {
    expect(data().isOffline).toBe(false);
    isOnline.value = false;
    hook.rerender();
    expect(data().isOffline).toBe(true);
  });

  test("fetches shopping list", async () => {
    const list = await data().fetchShoppingList();
    expect(list).toBe(MOCK_SHOPPING_LIST);
  });

  describe("refreshes", () => {
    test("update when successful", async () => {
      await data().refresh(mockUpdate);
      expect(mockUpdate).toHaveBeenCalled();
      expect(shoppingList.value).toEqual(MOCK_SHOPPING_LIST);
    });
    test("update when offline", async () => {
      isOnline.value = false;
      hook.rerender();
      await data().refresh(mockUpdate);
      expect(mockUpdate).toHaveBeenCalled();
      expect(shoppingList.value).toEqual(list);
    });
    test("does not overwrite the list when there's an error", async () => {
      getOne.mockThrowOnce(Error("💥Woe, exception be upon ye💥"));
      await data().refresh(mockUpdate);
      expect(mockUpdate).toHaveBeenCalled();
      expect(shoppingList.value).toEqual(list);
      expect(consoleError).toHaveBeenCalled();
    });
    test("logs an error if processing fails", async () => {
      getOne.mockThrowOnce(Error("💥Woe, exception be upon ye💥"));
      data().shoppingListItemActions.createItem(MOCK_ITEM);
      await data().refresh(mockUpdate);
      expect(mockUpdate).toHaveBeenCalled();
      expect(shoppingList.value).toEqual(MOCK_SHOPPING_LIST);
      expect(consoleError).toHaveBeenCalled();
    });
    test("only update the list with the new value if we're not loading, to prevent UI jitter", async () => {
      loadingCounter.value += 1;
      await data().refresh(mockUpdate);
      loadingCounter.value -= 1;
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
  describe("polling", () => {
    test("starts and stops", async () => {
      data().startPolling(mockUpdate);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockUpdate).toHaveBeenCalledTimes(2);
      data().stopPolling();
      expect(mockClearInterval).toHaveBeenCalledWith("TIMEOUT");
    });
    test("doesn't poll if idle", async () => {
      isIdle.value = true;
      hook.rerender();
      data().startPolling(mockUpdate);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockUpdate).not.toHaveBeenCalled();
      data().stopPolling();
      expect(mockClearInterval).toHaveBeenCalledWith("TIMEOUT");
    });
    test("doesn't poll if something else is loading", async () => {
      loadingCounter.value = 1;
      data().startPolling(mockUpdate);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockUpdate).not.toHaveBeenCalled();
      data().stopPolling();
      expect(mockClearInterval).toHaveBeenCalledWith("TIMEOUT");
    });
    test("gives up after max attempts 1", async () => {
      getOne.mockThrow(Error("💥Woe, exception be upon ye💥"));
      mockUpdate.mockImplementationOnce(() => { shoppingList.value = null; });
      data().startPolling(mockUpdate);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockClearInterval).toHaveBeenCalledWith("TIMEOUT");
    });
    test("gives up after max attempts 2", async () => {
      getOne.mockThrow(Error("💥Woe, exception be upon ye💥"));
      mockUpdate.mockThrow(Error("💥Woe, exception be upon ye💥"));
      data().startPolling(mockUpdate);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockClearInterval).toHaveBeenCalledWith("TIMEOUT");
    });
    test("stopPolling doesn't explode if there isn't a timer running", () => {
      const { result } = renderHook(() => useShoppingListData("list_id", shoppingList, loadingCounter));
      result.current.stopPolling();
      expect(true).toBe(true);
    });
  });
});
