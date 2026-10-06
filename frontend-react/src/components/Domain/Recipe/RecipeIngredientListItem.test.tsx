import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AppInfo } from "@/lib/api/types/admin";
import type { RecipeIngredient } from "@/lib/api/types/household";
import { setAppInfo } from "@/providers/app-info";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeIngredientListItem } from "./RecipeIngredientListItem";

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { groupSlug: "family" } }),
}));

const { t } = stubI18n();

const ingredient = {
  quantity: 2,
  unit: { id: "u1", name: "cup", pluralName: "cups", fraction: true },
  food: {
    id: "f1",
    name: "flour",
    pluralName: "flours",
    substitutions: [{ substituteFood: { id: "f2", name: "spelt", pluralName: "spelts" }, note: "a bit nuttier" }],
  },
  note: "sifted",
  referenceId: "r1",
  substitutions: [{ substituteFood: { id: "f3", name: "rye", pluralName: "ryes" }, note: null }],
} as unknown as RecipeIngredient;

describe("RecipeIngredientListItem", () => {
  beforeEach(() => {
    setAppInfo({ allowedIframeHosts: [] } as unknown as AppInfo);
  });

  afterEach(() => {
    cleanup();
  });

  test("shows quantity, unit, food and note", () => {
    renderWithProviders(<RecipeIngredientListItem ingredient={ingredient} />);

    expect(screen.getByText(/cups/)).toBeInTheDocument();
    expect(screen.getByText("flour")).toBeInTheDocument();
    expect(screen.getByText("sifted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("recipe.substitutions") })).not.toBeInTheDocument();
  });

  test("scales the quantity", () => {
    renderWithProviders(<RecipeIngredientListItem ingredient={ingredient} scale={2} />);

    expect(screen.getByText("4")).toBeInTheDocument();
  });

  test("the substitutions button opens both tiers of substitutions", async () => {
    renderWithProviders(<RecipeIngredientListItem ingredient={ingredient} showSubstitutions />);

    await userEvent.click(screen.getByRole("button", { name: t("recipe.substitutions") }));

    const menu = await screen.findByText(t("recipe.commonly-substituted-with"));
    expect(menu).toBeInTheDocument();
    const popover = menu.closest(".ingredient-substitutions") as HTMLElement;
    expect(within(popover).getByText("rye")).toBeInTheDocument();
    expect(within(popover).getByText("spelt")).toBeInTheDocument();
    expect(within(popover).getByText("a bit nuttier")).toBeInTheDocument();
  });

  test("an ingredient without substitutions has no button", () => {
    const plain = { ...ingredient, substitutions: [], food: { id: "f1", name: "flour", substitutions: [] } } as unknown as RecipeIngredient;
    renderWithProviders(<RecipeIngredientListItem ingredient={plain} showSubstitutions />);

    expect(screen.queryByRole("button", { name: t("recipe.substitutions") })).not.toBeInTheDocument();
  });
});
