import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { RecipeDataAliasManagerDialog } from "./RecipeDataAliasManagerDialog";
import type { GenericAlias } from "./RecipeDataAliasManagerDialog";
import type { IngredientFood } from "~/lib/api/types/recipe";
import { renderWithProviders } from "~/tests/utils";

// Same stubs as the Vue test: the dialog renders its content plus submit/cancel buttons
vi.mock("~/components/global/BaseDialog", () => ({
  BaseDialog: ({ children, customCardAction, onSubmit, onCancel }: { children?: ReactNode; customCardAction?: ReactNode; onSubmit?: () => void; onCancel?: () => void }) => (
    <div>
      {children}
      {customCardAction}
      <button className="dialog-submit" type="button" onClick={() => onSubmit?.()} />
      <button className="dialog-cancel" type="button" onClick={() => onCancel?.()} />
    </div>
  ),
}));
vi.mock("~/components/global/BaseButtonGroup", () => ({ BaseButtonGroup: () => <div /> }));
vi.mock("~/components/global/form", () => ({
  TextInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input value={value} onChange={e => onChange(e.target.value)} />
  ),
}));

function mountDialog(data: IngredientFood) {
  const emitted = { submit: [] as GenericAlias[][], cancel: 0 };
  const { container } = renderWithProviders(
    <RecipeDataAliasManagerDialog
      data={data}
      open
      onSubmit={aliases => emitted.submit.push(aliases)}
      onCancel={() => emitted.cancel++}
    />,
  );
  return { container, emitted };
}

describe("RecipeDataAliasManagerDialog", () => {
  afterEach(() => {
    cleanup();
  });

  test("cancel discards alias edits", () => {
    const data = {
      id: "1",
      name: "abalone",
      aliases: [{ name: "alias-original" }],
    } as IngredientFood;
    const { container, emitted } = mountDialog(data);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "alias-cancelled" } });
    fireEvent.click(container.querySelector(".dialog-cancel")!);

    expect(emitted.cancel).toBe(1);
    expect(emitted.submit).toHaveLength(0);
    expect(data.aliases).toEqual([{ name: "alias-original" }]);
  });

  test("confirm emits the edited aliases", () => {
    const data = {
      id: "1",
      name: "abalone",
      aliases: [{ name: "alias-original" }],
    } as IngredientFood;
    const { container, emitted } = mountDialog(data);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "alias-renamed" } });
    fireEvent.click(container.querySelector(".dialog-submit")!);

    expect(emitted.submit).toEqual([[{ name: "alias-renamed" }]]);
  });
});
