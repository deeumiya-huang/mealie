import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AppInfo } from "@/lib/api/types/admin";
import type { ShoppingListSummary } from "@/lib/api/types/household";
import { setAppInfo } from "@/providers/app-info";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeDialogAddToShoppingList, type RecipeWithScale } from "./RecipeDialogAddToShoppingList";

const mocks = vi.hoisted(() => ({
  api: {
    shopping: { lists: { addRecipes: vi.fn() } },
    recipes: { getOne: vi.fn() },
  },
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => mocks.api,
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", groupSlug: "family", householdSlug: "home" } }),
}));

const { t } = stubI18n();

const recipe = {
  id: "r1",
  name: "Pancakes",
  slug: "pancakes",
  scale: 1,
  recipeIngredient: [
    { referenceId: "i1", quantity: 1, note: "milk", food: { id: "f1", name: "milk", householdsWithIngredientFood: [] } },
    { referenceId: "i2", quantity: 2, note: "eggs", food: { id: "f2", name: "eggs", householdsWithIngredientFood: ["home"] } },
  ],
} as unknown as RecipeWithScale;

const ownList = { id: "l1", name: "Groceries", userId: "u1" } as unknown as ShoppingListSummary;
const otherList = { id: "l2", name: "Party", userId: "u2" } as unknown as ShoppingListSummary;

describe("RecipeDialogAddToShoppingList", () => {
  beforeEach(() => {
    setAppInfo({ allowedIframeHosts: [] } as unknown as AppInfo);
    mocks.api.shopping.lists.addRecipes.mockReset();
    mocks.api.shopping.lists.addRecipes.mockResolvedValue({ error: null });
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  test("a single list of the user skips the list step and ticks what is not on hand", async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <RecipeDialogAddToShoppingList open onOpenChange={onOpenChange} recipes={[recipe]} shoppingLists={[ownList, otherList]} />,
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Groceries" })).toBeInTheDocument();

    const [milk, eggs] = await within(dialog).findAllByRole("checkbox");
    expect(milk).toBeChecked();
    expect(eggs).not.toBeChecked();

    await userEvent.click(within(dialog).getByRole("button", { name: t("recipe.add-to-list") }));

    await waitFor(() => expect(mocks.api.shopping.lists.addRecipes).toHaveBeenCalledTimes(1));
    const [listId, payload] = mocks.api.shopping.lists.addRecipes.mock.calls[0] as [string, Array<{ recipeId: string; recipeIngredients: unknown[] }>];
    expect(listId).toBe("l1");
    expect(payload).toHaveLength(1);
    expect(payload[0]?.recipeId).toBe("r1");
    expect(payload[0]?.recipeIngredients).toHaveLength(1);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  test("several lists are offered first and the check-all button ticks every ingredient", async () => {
    renderWithProviders(
      <RecipeDialogAddToShoppingList
        open
        recipes={[recipe]}
        shoppingLists={[ownList, { ...otherList, userId: "u1" }]}
      />,
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Party" })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Party" }));

    // the ingredient step replaces the list step
    await waitFor(() => expect(screen.getAllByRole("checkbox")).toHaveLength(2));
    expect(screen.getAllByRole("checkbox")[1]).not.toBeChecked();

    await userEvent.click(screen.getByRole("button", { name: t("shopping-list.check-all-items") }));
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeChecked();
    }

    await userEvent.click(screen.getByRole("button", { name: t("shopping-list.uncheck-all-items") }));
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).not.toBeChecked();
    }
  });

  test("shows a message when the user has no shopping lists", async () => {
    renderWithProviders(<RecipeDialogAddToShoppingList open recipes={[recipe]} shoppingLists={[otherList]} />);

    expect(await screen.findByText(t("shopping-list.no-shopping-lists-found"))).toBeInTheDocument();
  });
});
