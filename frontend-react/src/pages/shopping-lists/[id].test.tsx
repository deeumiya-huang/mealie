import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AppInfo } from "@/lib/api/types/admin";
import type { ShoppingListOut } from "@/lib/api/types/household";
import { setAppInfo } from "@/providers/app-info";
import { renderWithProviders, stubI18n } from "@/test/utils";
import ShoppingListPage from "./[id]";

const mocks = vi.hoisted(() => ({
  getOne: vi.fn(),
  updateMany: vi.fn(),
  createMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({
    shopping: {
      lists: { getOne: mocks.getOne },
      items: { updateMany: mocks.updateMany, createMany: mocks.createMany, deleteMany: mocks.deleteMany },
    },
  }),
}));

vi.mock("@/hooks/store", () => {
  const emptyStore = () => ({ store: [], actions: { createOne: vi.fn(), updateOne: vi.fn() } });
  return {
    useLabelStore: emptyStore,
    useUnitStore: emptyStore,
    useFoodStore: emptyStore,
    useFoodData: () => ({ data: { name: "" }, reset: vi.fn() }),
    useUnitData: () => ({ data: { name: "" }, reset: vi.fn() }),
  };
});

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", groupSlug: "home" } }),
}));

const { t } = stubI18n();

function buildList(): ShoppingListOut {
  const base = { shoppingListId: "list-1", groupId: "g", householdId: "h", createdAt: "2024-01-01T00:00:00", updatedAt: "2024-01-01T00:00:00" };
  return {
    id: "list-1",
    name: "Weekly Groceries",
    groupId: "g",
    householdId: "h",
    userId: "u1",
    labelSettings: [],
    recipeReferences: [],
    listItems: [
      { ...base, id: "item-1", note: "Whole wheat bread", display: "Whole wheat bread", quantity: 1, checked: false, position: 0 },
      { ...base, id: "item-2", note: "Oat milk", display: "Oat milk", quantity: 1, checked: true, position: 1 },
    ],
  } as ShoppingListOut;
}

// jsdom has no matchMedia; `useDisplay` reads it, and without it every query is false (= xs)
function stubViewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:(\d+)px/.exec(query);
    return {
      matches: min ? width >= Number(min[1]) : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
  });
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="shopping-lists/:id" element={<ShoppingListPage />} />
    </Routes>,
    { route: "/shopping-lists/list-1" },
  );
}

describe("shopping list page", () => {
  beforeEach(() => {
    setAppInfo({ allowedIframeHosts: [] } as unknown as AppInfo);
    mocks.getOne.mockResolvedValue({ data: buildList() });
    mocks.updateMany.mockResolvedValue({ data: {} });
    mocks.createMany.mockResolvedValue({ data: {} });
    mocks.deleteMany.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("shows the list name, its items and the checked items section", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Weekly Groceries" })).toBeTruthy();
    expect(screen.getByText("Whole wheat bread")).toBeTruthy();
    expect(screen.getByText("Oat milk")).toBeTruthy();
    expect(screen.getByText(t("shopping-list.items-checked-count", 1))).toBeTruthy();
    expect(screen.getByRole("link", { name: t("shopping-list.all-lists") }).getAttribute("href")).toBe("/shopping-lists?disableRedirect=true");
  });

  test("opens the item editor from the add-item field", async () => {
    stubViewport(1280);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Weekly Groceries" });

    await user.click(screen.getByRole("combobox", { name: t("shopping-list.add-item") }));

    expect(await screen.findByRole("textbox", { name: t("shopping-list.note") })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: t("shopping-list.food") })).toBeTruthy();
  });

  test("expands the add-item drawer on small screens", async () => {
    stubViewport(400);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Weekly Groceries" });

    expect(screen.getByRole("combobox", { name: t("shopping-list.add-item") })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: t("shopping-list.note") })).toBeNull();

    // the overlay over the collapsed field receives the click
    const field = screen.getByRole("combobox", { name: t("shopping-list.add-item") });
    const overlay = field.closest("div.MuiAutocomplete-root")!.parentElement!.lastElementChild!;
    await user.click(overlay);

    expect(await screen.findByRole("textbox", { name: t("shopping-list.note") })).toBeTruthy();
    expect(screen.getByRole("button", { name: t("general.save") })).toBeTruthy();
  });

  test("checking an item moves it into the checked items", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Weekly Groceries" });

    // the unchecked items come first: the only visible checkbox belongs to the bread (the checked section is collapsed)
    const [checkbox] = screen.getAllByRole("checkbox");
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    await user.click(checkbox!);

    await waitFor(() => expect(screen.getByText(t("shopping-list.items-checked-count", 2))).toBeTruthy());
  });
});
