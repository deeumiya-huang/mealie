import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import type { IngredientFood } from "@/lib/api/types/recipe";
import { RecipeDataAliasManagerDialog } from "./RecipeDataAliasManagerDialog";

const { t } = stubI18n();

function mountDialog(data: IngredientFood) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  renderWithProviders(
    <RecipeDataAliasManagerDialog data={data} open onSubmit={onSubmit} onCancel={onCancel} />,
  );

  return { onSubmit, onCancel };
}

async function setInputValue(value: string) {
  const dialog = await screen.findByRole("dialog");
  const input = within(dialog).getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, value);
  return dialog;
}

describe("RecipeDataAliasManagerDialog", () => {
  afterEach(() => {
    cleanup();
  });

  test("cancel discards alias edits", async () => {
    const data = {
      id: "1",
      name: "abalone",
      aliases: [{ name: "alias-original" }],
    } as IngredientFood;
    const { onSubmit, onCancel } = mountDialog(data);

    const dialog = await setInputValue("alias-cancelled");
    await userEvent.click(within(dialog).getByRole("button", { name: t("general.cancel") }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(data.aliases).toEqual([{ name: "alias-original" }]);
  });

  test("confirm emits the edited aliases", async () => {
    const data = {
      id: "1",
      name: "abalone",
      aliases: [{ name: "alias-original" }],
    } as IngredientFood;
    const { onSubmit } = mountDialog(data);

    const dialog = await setInputValue("alias-renamed");
    await userEvent.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    expect(onSubmit.mock.calls).toEqual([[[{ name: "alias-renamed" }]]]);
  });
});
