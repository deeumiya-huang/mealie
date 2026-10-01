import type { Ref } from "~/lib/observable";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ref } from "~/lib/observable";
import type { ShoppingListOut } from "~/lib/api/types/household";
import { createShoppingListData } from "../use-shopping-list-data";
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

// @vueuse/core's useOnline/useIdle in the Vue test; ~/lib/browser-state is their replacement.
vi.mock("~/lib/browser-state", () => ({
  onlineState: () => mockUseOnline(),
  idleState: (timeout: number) => mockUseIdle(timeout),
  localStorageRef: (_key: string, defaults: unknown) => ref(defaults),
}));
vi.mock("~/hooks/api", () => ({
  userApi: () => ({
    shopping: {
      lists: { getOne },
      items: { deleteMany, updateMany, createMany },
    },
  }),
}));

const mockUseOnline = vi.fn<() => Ref<boolean>>();
const mockUseIdle = vi.fn<(timeout: number) => { idle: Ref<boolean>; stop: () => void }>();

describe("use-shopping-list-data", () => {
  const isOnline = ref(true);
  const isIdle = ref(false);
  mockUseOnline.mockReturnValue(isOnline);
  mockUseIdle.mockReturnValue({ idle: isIdle, stop: vi.fn() });

  const list = { ...MOCK_SHOPPING_LIST, id: "1" };
  const shoppingList: Ref<ShoppingListOut | null> = ref(list);
  const loadingCounter = ref(0);
  const {
    isOffline,
    fetchShoppingList,
    refresh,
    startPolling,
    stopPolling,
    shoppingListItemActions,
  } = createShoppingListData(
    "list_id",
    shoppingList,
    loadingCounter,
    2,
  );

  beforeEach(() => {
    shoppingList.value = list;
    loadingCounter.value = 0;
    isOnline.value = true;
    isIdle.value = false;
    mockUpdate.mockClear();
    mockClearInterval.mockClear();
    consoleError.mockClear();
  });

  test("can determine if the user is online", () => {
    expect(isOffline.value).toBe(false);
    isOnline.value = false;
    expect(isOffline.value).toBe(true);
  });

  test("fetches shopping list", async () => {
    const list = await fetchShoppingList();
    expect(list).toBe(MOCK_SHOPPING_LIST);
  });

  describe("refreshes", () => {
    test("update when successful", async () => {
      await refresh(mockUpdate);
      expect(mockUpdate).toHaveBeenCalled();
      expect(shoppingList.value).toEqual(MOCK_SHOPPING_LIST);
    });
    test("update when offline", async () => {
      isOnline.value = false;
      await refresh(mockUpdate);
      expect(mockUpdate).toHaveBeenCalled();
      expect(shoppingList.value).toEqual(list);
    });
    test("does not overwrite the list when there's an error", async () => {
      getOne.mockThrowOnce(Error("💥Woe, exception be upon ye💥"));
      await refresh(mockUpdate);
      expect(mockUpdate).toHaveBeenCalled();
      expect(shoppingList.value).toEqual(list);
      expect(consoleError).toHaveBeenCalled();
    });
    test("logs an error if processing fails", async () => {
      getOne.mockThrowOnce(Error("💥Woe, exception be upon ye💥"));
      shoppingListItemActions.createItem(MOCK_ITEM);
      await refresh(mockUpdate);
      expect(mockUpdate).toHaveBeenCalled();
      expect(shoppingList.value).toEqual(MOCK_SHOPPING_LIST);
      expect(consoleError).toHaveBeenCalled();
    });
    test("only update the list with the new value if we're not loading, to prevent UI jitter", async () => {
      loadingCounter.value += 1;
      await refresh(mockUpdate);
      loadingCounter.value -= 1;
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
  describe("polling", () => {
    test("starts and stops", async () => {
      startPolling(mockUpdate);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockUpdate).toHaveBeenCalledTimes(2);
      stopPolling();
      expect(mockClearInterval).toHaveBeenCalledWith("TIMEOUT");
    });
    test("doesn't poll if idle", async () => {
      isIdle.value = true;
      startPolling(mockUpdate);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockUpdate).not.toHaveBeenCalled();
      stopPolling();
      expect(mockClearInterval).toHaveBeenCalledWith("TIMEOUT");
    });
    test("doesn't poll if something else is loading", async () => {
      loadingCounter.value = 1;
      startPolling(mockUpdate);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockUpdate).not.toHaveBeenCalled();
      stopPolling();
      expect(mockClearInterval).toHaveBeenCalledWith("TIMEOUT");
    });
    test("gives up after max attempts 1", async () => {
      getOne.mockThrow(Error("💥Woe, exception be upon ye💥"));
      mockUpdate.mockImplementationOnce(() => { shoppingList.value = null; });
      startPolling(mockUpdate);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockClearInterval).toHaveBeenCalledWith("TIMEOUT");
    });
    test("gives up after max attempts 2", async () => {
      getOne.mockThrow(Error("💥Woe, exception be upon ye💥"));
      mockUpdate.mockThrow(Error("💥Woe, exception be upon ye💥"));
      startPolling(mockUpdate);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockClearInterval).toHaveBeenCalledWith("TIMEOUT");
    });
    test("stopPolling doesn't explode if there isn't a timer running", () => {
      const { stopPolling } = createShoppingListData("list_id", shoppingList, loadingCounter);
      stopPolling();
      expect(true).toBe(true);
    });
  });
});
