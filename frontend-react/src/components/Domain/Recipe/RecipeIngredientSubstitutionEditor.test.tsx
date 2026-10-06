import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { IngredientFood } from "@/lib/api/types/recipe";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeIngredientSubstitutionEditor } from "./RecipeIngredientSubstitutionEditor";

const { t } = stubI18n();

const foods = [
  { id: "f1", name: "Butter" },
  { id: "f2", name: "Margarine" },
] as IngredientFood[];

describe("RecipeIngredientSubstitutionEditor", () => {
  afterEach(() => {
    cleanup();
  });

  test("shows a row per substitution and reports add, delete, note and food edits", async () => {
    const onAdd = vi.fn();
    const onDelete = vi.fn();
    const onChange = vi.fn();
    const onFoodChanged = vi.fn();
    renderWithProviders(
      <RecipeIngredientSubstitutionEditor
        substitutions={[{ substituteFoodId: "f1", note: "salted" }]}
        foods={foods}
        onAdd={onAdd}
        onDelete={onDelete}
        onChange={onChange}
        onFoodChanged={onFoodChanged}
        renderAfterRow={(_row, index) => <span>{`after row ${index}`}</span>}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveValue("Butter");
    expect(screen.getByPlaceholderText(t("recipe.note"))).toHaveValue("salted");
    expect(screen.getByText("after row 0")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(t("recipe.note")), "!");
    expect(onChange).toHaveBeenLastCalledWith(0, { note: "salted!" });

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Margarine" }));
    expect(onChange).toHaveBeenLastCalledWith(0, { substituteFoodId: "f2" });
    expect(onFoodChanged).toHaveBeenCalledWith(0);

    await userEvent.click(screen.getByRole("button", { name: t("general.delete") }));
    expect(onDelete).toHaveBeenCalledWith(0);

    await userEvent.click(screen.getByRole("button", { name: t("general.add") }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
