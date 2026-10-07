import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { RecipeIngredients } from "./RecipeIngredients";
import type { RecipeIngredient } from "@/lib/api/types/recipe";
import { useLocales } from "@/hooks/use-locales";
import { renderWithProviders } from "@/test/utils";

vi.mock("@/hooks/use-locales");

// Vue stubbed these children (`stubs: { AppButtonCopy: true, RecipeIngredientListItem: true }`)
vi.mock("@/components/global/AppButtonCopy", () => ({ AppButtonCopy: () => null }));
vi.mock("./RecipeIngredientListItem", () => ({ RecipeIngredientListItem: () => null }));

const ingredients = {
  curryPaste: {
    referenceId: "ingredient-curry-paste",
    quantity: 1,
    food: { id: "food-1", name: "curry paste" },
  },
  coconutMilk: {
    referenceId: "ingredient-coconut-milk",
    quantity: 1,
    food: { id: "food-2", name: "coconut milk" },
  },
} satisfies Record<string, RecipeIngredient>;

function mountIngredients(value: RecipeIngredient[], storageKey = "recipe-ingredients:test-recipe:checked") {
  return renderWithProviders(<RecipeIngredients value={value} storageKey={storageKey} />);
}

// the Vue checkbox stub was a button with aria-pressed; the real checkbox reports `checked`
const checkboxes = () => screen.getAllByRole<HTMLInputElement>("checkbox");
const pressed = (checkbox: HTMLInputElement) => (checkbox.checked ? "true" : "false");

describe("RecipeIngredients", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(useLocales).mockReturnValue({
      locales: [{ value: "en-US", pluralFoodHandling: "always" }],
      locale: "en-US",
    } as unknown as ReturnType<typeof useLocales>);
  });

  test("restores checked ingredients from session storage by reference id", async () => {
    const firstWrapper = mountIngredients([ingredients.curryPaste, ingredients.coconutMilk]);
    fireEvent.click(checkboxes()[0]!);
    await Promise.resolve();

    expect(pressed(checkboxes()[0]!)).toBe("true");
    firstWrapper.unmount();

    mountIngredients([ingredients.coconutMilk, ingredients.curryPaste]);

    expect(pressed(checkboxes()[0]!)).toBe("false");
    expect(pressed(checkboxes()[1]!)).toBe("true");
  });
});
