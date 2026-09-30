import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { RecipeIngredients } from "./RecipeIngredients";
import type { RecipeIngredient } from "~/lib/api/types/recipe";
import { useLocales } from "~/hooks/use-locales";

vi.mock("~/hooks/use-locales");
// Stubbed as in the Vue test
vi.mock("~/components/global/AppButtonCopy", () => ({ AppButtonCopy: () => null }));
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
  return render(<RecipeIngredients value={value} storageKey={storageKey} />);
}

const checkboxes = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLInputElement>("input[type=checkbox]"));

describe("RecipeIngredients", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(useLocales).mockReturnValue({
      locales: [{ value: "en-US", pluralFoodHandling: "always" }],
      locale: "en-US",
    } as unknown as ReturnType<typeof useLocales>);
  });

  test("restores checked ingredients from session storage by reference id", () => {
    const first = mountIngredients([ingredients.curryPaste, ingredients.coconutMilk]);
    fireEvent.click(checkboxes(first.container)[0]!);

    expect(checkboxes(first.container)[0]!.checked).toBe(true);
    first.unmount();

    const second = mountIngredients([ingredients.coconutMilk, ingredients.curryPaste]);

    expect(checkboxes(second.container)[0]!.checked).toBe(false);
    expect(checkboxes(second.container)[1]!.checked).toBe(true);
  });
});
