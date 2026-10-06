import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { resetStorageStores } from "@/hooks/utils/use-storage";
import { renderWithProviders, stubI18n } from "@/test/utils";
import ShoppingListsPage from "./index";

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  createOne: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({
    shopping: { lists: { getAll: mocks.getAll, createOne: mocks.createOne, deleteOne: mocks.deleteOne } },
    households: { fetchMembers: vi.fn().mockResolvedValue({ data: { items: [] } }) },
  }),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1" } }),
}));

const { t } = stubI18n();

const lists = [
  { id: "list-1", name: "Weekly Groceries", userId: "u1" },
  { id: "list-2", name: "Party Supplies", userId: "u1" },
  { id: "list-3", name: "Someone Else's List", userId: "u2" },
];

function renderPage(route = "/shopping-lists") {
  return renderWithProviders(
    <Routes>
      <Route path="shopping-lists" element={<ShoppingListsPage />} />
      <Route path="shopping-lists/:id" element={<div>list page</div>} />
    </Routes>,
    { route },
  );
}

describe("shopping lists page", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageStores();
    mocks.getAll.mockResolvedValue({ data: { items: lists } });
    mocks.createOne.mockResolvedValue({ data: { id: "list-4" } });
    mocks.deleteOne.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("lists the lists of the current user as links", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: t("shopping-list.shopping-lists") })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Weekly Groceries" }).getAttribute("href")).toBe("/shopping-lists/list-1");
    expect(screen.getByRole("link", { name: "Party Supplies" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Someone Else's List" })).toBeNull();
  });

  test("shows the lists of everyone with show all", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: t("shopping-list.shopping-lists") });

    await user.click(screen.getByRole("checkbox", { name: t("general.show-all") }));

    expect(screen.getByRole("link", { name: "Someone Else's List" })).toBeTruthy();
  });

  test("redirects to the only list", async () => {
    mocks.getAll.mockResolvedValue({ data: { items: [lists[0]] } });
    renderPage();

    expect(await screen.findByText("list page")).toBeTruthy();
  });

  test("does not redirect when disableRedirect is set", async () => {
    mocks.getAll.mockResolvedValue({ data: { items: [lists[0]] } });
    renderPage("/shopping-lists?disableRedirect=true");

    expect(await screen.findByRole("link", { name: "Weekly Groceries" })).toBeTruthy();
  });

  test("creates a list from the dialog", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: t("shopping-list.shopping-lists") });

    await user.click(screen.getByRole("button", { name: t("general.create") }));
    await user.type(await screen.findByRole("textbox", { name: t("shopping-list.new-list") }), "  New one ");
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    await waitFor(() => expect(mocks.createOne).toHaveBeenCalledWith({ name: "New one" }));
  });
});
