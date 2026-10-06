import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AppInfo } from "@/lib/api/types/admin";
import type { Recipe } from "@/lib/api/types/recipe";
import { setAppInfo } from "@/providers/app-info";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeDialogPrintPreferences } from "./RecipeDialogPrintPreferences";

vi.mock("@/hooks/api", () => ({
  useStaticRoutes: () => ({ recipeImage: () => "/image.webp" }),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { groupSlug: "family" } }),
}));

const { t } = stubI18n();

const recipe = {
  id: "r1",
  slug: "pancakes",
  name: "Pancakes",
  description: "Fluffy pancakes",
  image: "abc",
  recipeServings: 4,
  recipeIngredient: [
    { referenceId: "i1", title: "Batter", quantity: 2, note: "eggs", food: { id: "f1", name: "egg", pluralName: "eggs" } },
    { referenceId: "i2", quantity: 1, note: "milk", food: { id: "f2", name: "milk" } },
  ],
  recipeInstructions: [
    { id: "s1", title: "Mix", text: "Mix everything", ingredientReferences: [{ referenceId: "i1" }] },
    { id: "s2", text: "Fry", ingredientReferences: [] },
  ],
  notes: [{ title: "Tip", text: "Use a hot pan" }],
  nutrition: { calories: "200" },
} as unknown as Recipe;

describe("RecipeDialogPrintPreferences", () => {
  beforeEach(() => {
    localStorage.clear();
    setAppInfo({ allowedIframeHosts: [] } as unknown as AppInfo);
  });

  afterEach(() => {
    cleanup();
  });

  test("previews the recipe the way the default preferences print it", async () => {
    renderWithProviders(<RecipeDialogPrintPreferences open recipe={recipe} />);
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText("Pancakes")).toBeInTheDocument();
    expect(within(dialog).getByText("Fluffy pancakes")).toBeInTheDocument();
    expect(within(dialog).getByText("Batter")).toBeInTheDocument();
    expect(within(dialog).getByText("Mix everything")).toBeInTheDocument();
    expect(within(dialog).getByText("Use a hot pan")).toBeInTheDocument();
    // off by default
    expect(within(dialog).queryByText("200 kcal")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", "/image.webp");
  });

  test("the switches change what is printed and are remembered", async () => {
    renderWithProviders(<RecipeDialogPrintPreferences open recipe={recipe} />);
    const dialog = await screen.findByRole("dialog");

    await userEvent.click(within(dialog).getByRole("switch", { name: t("recipe.description") }));
    expect(within(dialog).queryByText("Fluffy pancakes")).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("switch", { name: t("recipe.notes") }));
    expect(within(dialog).queryByText("Use a hot pan")).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("switch", { name: t("recipe.nutrition") }));
    expect(within(dialog).getByText(t("recipe.nutrition"), { selector: "div" })).toBeInTheDocument();

    expect(JSON.parse(localStorage.getItem("recipe-print-preferences") ?? "{}")).toMatchObject({
      showDescription: false,
      showNotes: false,
      showNutrition: true,
    });
  });

  test("the image can be hidden", async () => {
    renderWithProviders(<RecipeDialogPrintPreferences open recipe={recipe} />);
    const dialog = await screen.findByRole("dialog");

    const buttons = within(dialog).getAllByRole("button").filter(button => button.getAttribute("aria-pressed") !== null);
    expect(buttons).toHaveLength(3);
    await userEvent.click(buttons[2] as HTMLElement);

    expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
  });
});
