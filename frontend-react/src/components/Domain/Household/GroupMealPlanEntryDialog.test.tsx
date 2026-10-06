import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import type { ReadPlanEntry } from "@/lib/api/types/meal-plan";
import { GroupMealPlanEntryDialog } from "./GroupMealPlanEntryDialog";

const mocks = vi.hoisted(() => ({
  rulesGetAll: vi.fn(),
  selectorProps: vi.fn(),
}));

vi.mock("@/hooks/api", () => {
  const api = { mealplanRules: { getAll: mocks.rulesGetAll } };
  return { useUserApi: () => api };
});

vi.mock("@/components/Domain/Mealplan/MealPlanDatePicker", () => ({
  MealPlanDatePicker: () => null,
}));

vi.mock("@/components/Domain/Recipe/RecipeSelector", () => ({
  RecipeSelector: (props: { queryFilter: string | null; onChange: (recipe: { id: string; name: string }) => void }) => {
    mocks.selectorProps(props);
    return <button type="button" onClick={() => props.onChange({ id: "r1", name: "Soup" })}>pick soup</button>;
  },
}));

const { t } = stubI18n();

function Harness({ entry = null, onCreate, onUpdate }: {
  entry?: ReadPlanEntry | null;
  onCreate?: (payload: unknown) => void;
  onUpdate?: (payload: unknown) => void;
}) {
  const [open, setOpen] = useState(true);
  return <GroupMealPlanEntryDialog open={open} onOpenChange={setOpen} entry={entry} date={new Date(2026, 7, 19)} onCreate={onCreate} onUpdate={onUpdate} />;
}

describe("GroupMealPlanEntryDialog", () => {
  beforeEach(() => {
    mocks.rulesGetAll.mockResolvedValue({
      data: { items: [{ id: "rule", groupId: "g", householdId: "h", day: "unset", entryType: "unset", queryFilterString: "rating > 3" }] },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("creates a note entry for the given day", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    renderWithProviders(<Harness onCreate={onCreate} />);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(t("meal-plan.create-a-new-meal-plan"))).toBeTruthy();
    const submit = within(dialog).getByRole("button", { name: t("general.create") }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    await user.click(within(dialog).getByRole("button", { name: t("meal-plan.note") }));
    await user.type(within(dialog).getByRole("textbox", { name: t("meal-plan.meal-title") }), "Picnic");
    await user.type(within(dialog).getByRole("textbox", { name: t("meal-plan.meal-note") }), "blanket");
    await user.click(submit);

    expect(onCreate).toHaveBeenCalledWith({
      date: "2026-08-19",
      entryType: "dinner",
      title: "Picnic",
      text: "blanket",
      recipeId: null,
    });
  });

  test("creates a recipe entry and applies the matching rules to the recipe search", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    renderWithProviders(<Harness onCreate={onCreate} />);

    const dialog = await screen.findByRole("dialog");
    await user.click(await within(dialog).findByRole("button", { name: "pick soup" }));
    await user.click(within(dialog).getByRole("button", { name: t("general.create") }));

    expect(onCreate).toHaveBeenCalledWith({ date: "2026-08-19", entryType: "dinner", title: "", text: "", recipeId: "r1" });
    // the household's rule filter reached the selector once the rules had loaded
    expect(mocks.selectorProps).toHaveBeenCalledWith(expect.objectContaining({ queryFilter: "(rating > 3)" }));
  });

  test("updates an existing entry", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const entry: ReadPlanEntry = {
      id: 5,
      date: "2026-08-20",
      entryType: "lunch",
      title: "Leftovers",
      text: "",
      recipeId: null,
      groupId: "g",
      userId: "u",
      householdId: "h",
    };
    renderWithProviders(<Harness entry={entry} onUpdate={onUpdate} />);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(t("meal-plan.update-this-meal-plan"))).toBeTruthy();
    expect((within(dialog).getByRole("textbox", { name: t("meal-plan.meal-title") }) as HTMLInputElement).value).toBe("Leftovers");
    await user.click(within(dialog).getByRole("button", { name: t("general.update") }));

    expect(onUpdate).toHaveBeenCalledWith({
      date: "2026-08-20",
      entryType: "lunch",
      title: "Leftovers",
      text: "",
      recipeId: null,
      id: 5,
      groupId: "g",
      userId: "u",
    });
  });
});
