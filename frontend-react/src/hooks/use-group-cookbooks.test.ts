import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { clearAsyncDataCache } from "@/hooks/utils";
import { useCookbook, useCookbookData } from "./use-group-cookbooks";

const mocks = vi.hoisted(() => ({
  userGetOne: vi.fn(),
  exploreGetOne: vi.fn(),
  exploreSlug: vi.fn(),
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({ cookbooks: { getOne: mocks.userGetOne } }),
  usePublicExploreApi: (slug: string) => {
    mocks.exploreSlug(slug);
    return { explore: { cookbooks: { getOne: mocks.exploreGetOne } } };
  },
}));

describe("use-group-cookbooks", () => {
  afterEach(() => {
    clearAsyncDataCache();
    vi.clearAllMocks();
  });

  test("getOne reads through the user API without a group slug", async () => {
    mocks.userGetOne.mockResolvedValue({ data: { id: "b1", name: "Mine" } });
    const { result } = renderHook(() => useCookbook());

    expect(await result.current.getOne("b1")).toEqual({ id: "b1", name: "Mine" });
    expect(mocks.userGetOne).toHaveBeenCalledWith("b1");
    expect(mocks.exploreGetOne).not.toHaveBeenCalled();
  });

  test("passing the group slug switches to the public explore API", async () => {
    mocks.exploreGetOne.mockResolvedValue({ data: { id: "b2", name: "Public" } });
    const { result } = renderHook(() => useCookbook("family"));

    expect(await result.current.getOne("weeknights")).toEqual({ id: "b2", name: "Public" });
    expect(mocks.exploreSlug).toHaveBeenCalledWith("family");
    expect(mocks.userGetOne).not.toHaveBeenCalled();
  });

  test("useCookbookData loads the cookbook for a component", async () => {
    mocks.exploreGetOne.mockResolvedValue({ data: { id: "b2", name: "Public" } });
    const { result } = renderHook(() => useCookbookData("family", "weeknights"));

    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.data).toEqual({ id: "b2", name: "Public" }));
  });
});
