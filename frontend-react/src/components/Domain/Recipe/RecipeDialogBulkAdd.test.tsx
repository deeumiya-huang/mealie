import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeDialogBulkAdd } from "./RecipeDialogBulkAdd";

const { t } = stubI18n();

async function openDialog(onBulkData = vi.fn()) {
  renderWithProviders(<RecipeDialogBulkAdd onBulkData={onBulkData} />);
  await userEvent.click(screen.getByRole("button", { name: t("new-recipe.bulk-add") }));
  const dialog = await screen.findByRole("dialog");
  const textbox = within(dialog).getByRole("textbox");
  return { dialog, textbox, onBulkData };
}

describe("RecipeDialogBulkAdd", () => {
  afterEach(() => {
    cleanup();
  });

  test("the add button is disabled until there is a non-empty line", async () => {
    const { dialog, textbox } = await openDialog();
    const add = within(dialog).getByRole("button", { name: t("general.add") });

    expect(add).toBeDisabled();
    await userEvent.type(textbox, "   ");
    expect(add).toBeDisabled();
    await userEvent.type(textbox, "flour");
    expect(add).toBeEnabled();
  });

  test("submitting reports the non-empty lines", async () => {
    const { dialog, textbox, onBulkData } = await openDialog();

    await userEvent.type(textbox, "1 cup flour\n\n  2 eggs  \n");
    await userEvent.click(within(dialog).getByRole("button", { name: t("general.add") }));

    expect(onBulkData).toHaveBeenCalledWith(["1 cup flour", "  2 eggs  "]);
  });

  test("the helpers trim whitespace, drop the first character and split numbered lines", async () => {
    const { dialog, textbox } = await openDialog();
    const run = within(dialog).getAllByRole("button", { name: t("general.run") });

    await userEvent.type(textbox, "  - flour  \n  - eggs");
    await userEvent.click(run[0] as HTMLElement);
    expect(textbox).toHaveValue("- flour\n- eggs");

    await userEvent.click(run[1] as HTMLElement);
    expect(textbox).toHaveValue(" flour\n eggs");

    await userEvent.clear(textbox);
    await userEvent.type(textbox, "1. mix 2. bake");
    await userEvent.click(run[2] as HTMLElement);
    expect(textbox).toHaveValue("mix \nbake");
  });
});
