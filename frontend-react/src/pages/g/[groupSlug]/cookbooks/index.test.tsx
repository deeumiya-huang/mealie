import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ReadCookBook } from "@/lib/api/types/cookbook";
import { resetStorageStores } from "@/hooks/utils";
import { renderWithProviders, stubI18n } from "@/test/utils";
import CookbooksPage from "./index";

const mocks = vi.hoisted(() => ({
  store: [] as unknown[],
  createOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
  updateAll: vi.fn(),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", groupSlug: "family", householdId: "h1" } }),
}));

vi.mock("@/hooks/use-households", () => ({
  useHouseholdSelf: () => ({ household: { id: "h1", name: "Home" }, actions: {} }),
}));

vi.mock("@/hooks/store/use-cookbook-store", () => ({
  useCookbookStore: () => ({
    store: mocks.store,
    actions: { createOne: mocks.createOne, updateOne: mocks.updateOne, deleteOne: mocks.deleteOne },
    updateAll: mocks.updateAll,
  }),
}));

vi.mock("@/components/Domain/Cookbook/CookbookEditor", () => ({
  CookbookEditor: ({ value }: { value: ReadCookBook }) => <div>{`editor for ${value.name}`}</div>,
}));

const { t } = stubI18n();

function cookbook(id: string, name: string, householdId = "h1", position = 0): ReadCookBook {
  return { id, name, slug: id, position, groupId: "g1", householdId, queryFilterString: "tags.id IN [\"t1\"]" };
}

describe("cookbooks page", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageStores();
    mocks.store = [cookbook("b2", "Desserts", "h1", 1), cookbook("b1", "Dinners", "h1", 0), cookbook("b3", "Elsewhere", "h2")];
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("lists the cookbooks of the user's household in position order", () => {
    renderWithProviders(<CookbooksPage />);

    expect(screen.getByRole("heading", { name: t("cookbook.cookbooks") })).toBeTruthy();
    expect(screen.getByText("Dinners")).toBeTruthy();
    expect(screen.getByText("Desserts")).toBeTruthy();
    expect(screen.queryByText("Elsewhere")).toBeNull();
    const names = screen.getAllByText(/^(Dinners|Desserts)$/).map(node => node.textContent);
    expect(names).toEqual(["Dinners", "Desserts"]);
  });

  test("the hide-other-households preference is stored", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CookbooksPage />);

    await user.click(screen.getByRole("checkbox", { name: t("cookbook.hide-cookbooks-from-other-households") }));

    expect(JSON.parse(localStorage.getItem("cookbook-preferences") ?? "{}")).toEqual({ hideOtherHouseholds: true });
  });

  test("creating a cookbook creates it, then opens it for editing", async () => {
    const user = userEvent.setup();
    mocks.createOne.mockResolvedValue(cookbook("b9", "Home Cookbook 3"));
    renderWithProviders(<CookbooksPage />);

    await user.click(screen.getByRole("button", { name: t("general.create") }));

    expect(mocks.createOne).toHaveBeenCalledWith({ name: t("cookbook.household-cookbook-name", ["Home", "3"]) });
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("editor for Home Cookbook 3")).toBeTruthy();
  });

  test("deleting a cookbook asks for confirmation first", async () => {
    const user = userEvent.setup();
    mocks.deleteOne.mockResolvedValue({});
    renderWithProviders(<CookbooksPage />);

    await user.click(screen.getByText("Dinners"));
    await user.click(await screen.findByRole("button", { name: t("general.delete") }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Dinners")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    await waitFor(() => expect(mocks.deleteOne).toHaveBeenCalledWith("b1"));
    await waitFor(() => expect(screen.queryByText("Dinners")).toBeNull());
  });

  test("saving a cookbook updates it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CookbooksPage />);

    await user.click(screen.getByText("Desserts"));
    await user.click(await screen.findByRole("button", { name: t("general.save") }));

    expect(mocks.updateOne).toHaveBeenCalledWith(expect.objectContaining({ id: "b2", name: "Desserts" }));
  });
});
