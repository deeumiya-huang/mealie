import { describe, expect, test, vi } from "vitest";
import { createStoreActions } from "../use-actions-factory";
import type { BoundT } from "../types";
import type { BaseCRUDAPI } from "@/lib/api/base/base-clients";
import { createStore } from "@/lib/store";

describe("createStoreActions (useStoreActions)", () => {
  const mockApi = {
    getAll: vi.fn(),
    createOne: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
  } as unknown as BaseCRUDAPI<unknown, BoundT, unknown>;

  const mockStore = createStore<BoundT[]>([]);
  const mockLoading = createStore(false);
  const mockInitialized = createStore(false);

  test("deleteMany calls deleteOne for each ID and refreshes once", async () => {
    const actions = createStoreActions("test-store", mockApi, mockStore, mockLoading, mockInitialized);

    mockApi.deleteOne = vi.fn().mockResolvedValue({ response: { data: {} } });
    mockApi.getAll = vi.fn().mockResolvedValue({ data: { items: [] } });

    const ids = ["1", "2", "3"];
    await actions.deleteMany(ids);

    expect(mockApi.deleteOne).toHaveBeenCalledTimes(3);
    expect(mockApi.deleteOne).toHaveBeenCalledWith("1");
    expect(mockApi.deleteOne).toHaveBeenCalledWith("2");
    expect(mockApi.deleteOne).toHaveBeenCalledWith("3");

    expect(mockApi.getAll).toHaveBeenCalledTimes(1);
  });

  test("deleteMany handles empty array", async () => {
    const actions = createStoreActions("test-store", mockApi, mockStore, mockLoading, mockInitialized);

    mockApi.deleteOne = vi.fn();
    mockApi.getAll = vi.fn().mockResolvedValue({ data: { items: [] } });

    await actions.deleteMany([]);

    expect(mockApi.deleteOne).not.toHaveBeenCalled();
    expect(mockApi.getAll).toHaveBeenCalledTimes(1);
  });

  test("deleteMany sets loading state", async () => {
    const actions = createStoreActions("test-store", mockApi, mockStore, mockLoading, mockInitialized);

    mockApi.deleteOne = vi.fn().mockResolvedValue({});
    mockApi.getAll = vi.fn().mockResolvedValue({ data: { items: [] } });

    const promise = actions.deleteMany(["1"]);
    expect(mockLoading.get()).toBe(true);

    await promise;
    expect(mockLoading.get()).toBe(false);
  });

  test("refresh sets initialized to true even when store returns empty results", async () => {
    const localInitialized = createStore(false);
    const actions = createStoreActions("test-store", mockApi, mockStore, mockLoading, localInitialized);

    mockApi.getAll = vi.fn().mockResolvedValue({ data: { items: [] } });

    expect(localInitialized.get()).toBe(false);
    await actions.refresh();
    expect(localInitialized.get()).toBe(true);
  });

  test("refresh sets initialized to true when store returns items", async () => {
    const localInitialized = createStore(false);
    const actions = createStoreActions("test-store", mockApi, mockStore, mockLoading, localInitialized);

    mockApi.getAll = vi.fn().mockResolvedValue({ data: { items: [{ id: "1", name: "item" }] } });

    await actions.refresh();
    expect(localInitialized.get()).toBe(true);
  });
});
