import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import Planner from "./planner";
import PlannerEdit from "./planner/edit";
import PlannerView from "./planner/view";

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  deleteOne: vi.fn(),
  updateOne: vi.fn(),
  createOne: vi.fn(),
  setRandom: vi.fn(),
  rulesGetAll: vi.fn(),
}));

vi.mock("@/hooks/api", () => {
  const api = {
    mealplans: {
      getAll: mocks.getAll,
      deleteOne: mocks.deleteOne,
      updateOne: mocks.updateOne,
      createOne: mocks.createOne,
      setRandom: mocks.setRandom,
    },
    mealplanRules: { getAll: mocks.rulesGetAll },
    shopping: { lists: { getAll: vi.fn().mockResolvedValue({ data: { items: [] } }) } },
  };
  return { useUserApi: () => api };
});

vi.mock("@/hooks/use-households", () => ({
  useHouseholdSelf: () => ({
    household: { preferences: { firstDayOfWeek: 0 } },
    actions: { refresh: vi.fn() },
  }),
}));

vi.mock("@/components/Domain/Recipe/RecipeCardMobile", () => ({
  RecipeCardMobile: (props: { name: string; contextMenu?: React.ReactNode }) => (
    <div data-testid="card">
      {props.name}
      {props.contextMenu}
    </div>
  ),
}));

vi.mock("@/components/Domain/Recipe/RecipeCardLineItem", () => ({
  RecipeCardLineItem: (props: { recipe: { name: string } }) => <div>{props.recipe.name}</div>,
}));

vi.mock("@/components/Domain/Mealplan/MealPlanDatePicker", () => ({
  MealPlanDatePicker: () => null,
}));

const { t } = stubI18n();

const entries = [
  { id: 1, date: "2026-08-17", entryType: "dinner", title: "Picnic", text: "bring a blanket", recipeId: null, groupId: "g", userId: "u", householdId: "h" },
  { id: 2, date: "2026-08-18", entryType: "lunch", title: "", text: "", recipeId: "r1", groupId: "g", userId: "u", householdId: "h", recipe: { id: "r1", name: "Soup", slug: "soup", tags: [] } },
];

function renderPlanner(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="household/mealplan/planner" element={<Planner />}>
        <Route path="view" element={<PlannerView />} />
        <Route path="edit" element={<PlannerEdit />} />
      </Route>
    </Routes>,
    { route },
  );
}

describe("meal planner", () => {
  beforeEach(() => {
    mocks.getAll.mockResolvedValue({ data: { items: entries } });
    mocks.rulesGetAll.mockResolvedValue({ data: { items: [] } });
    mocks.deleteOne.mockResolvedValue({ data: {} });
    mocks.updateOne.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("view lists each day of the range with its meals", async () => {
    renderPlanner("/household/mealplan/planner/view?start=2026-08-17&end=2026-08-18");

    expect(await screen.findByText("Picnic")).toBeTruthy();
    expect(await screen.findByText("Soup")).toBeTruthy();
    expect(screen.getByText(t("meal-plan.dinner"))).toBeTruthy();
    expect(screen.getByText(t("meal-plan.lunch"))).toBeTruthy();
    // the day actions are in a menu in the view
    expect(screen.queryAllByRole("button", { name: t("general.new") })).toHaveLength(0);
    expect(mocks.getAll).toHaveBeenCalledWith(1, -1, { start_date: "2026-08-17", end_date: "2026-08-18" });
  });

  test("the edit button switches to the editor, which can delete a meal", async () => {
    const user = userEvent.setup();
    renderPlanner("/household/mealplan/planner/view?start=2026-08-17&end=2026-08-18");
    await screen.findByText("Picnic");

    await user.click(screen.getByRole("button", { name: t("general.edit") }));

    // one "New" button per day in the editor
    expect(await screen.findAllByRole("button", { name: t("general.new") })).toHaveLength(2);
    expect(screen.getByRole("button", { name: t("general.view") })).toBeTruthy();
    expect(screen.getByRole("button", { name: t("meal-plan.randomize-recipe") })).toBeTruthy();

    const note = screen.getByText("Picnic").closest(".MuiCard-root") as HTMLElement;
    const buttons = within(note).getAllByRole("button");
    // drag handle, entry type chip, delete
    await user.click(buttons[buttons.length - 1] as HTMLElement);
    await waitFor(() => expect(mocks.deleteOne).toHaveBeenCalledWith(1));
  });

  test("the next-week button moves the range by its length", async () => {
    const user = userEvent.setup();
    renderPlanner("/household/mealplan/planner/view?start=2026-08-17&end=2026-08-18");
    await screen.findByText("Picnic");

    const [previous, next] = screen.getAllByRole("button").filter(button => !button.textContent && !button.getAttribute("aria-haspopup"));
    expect(previous).toBeTruthy();
    await user.click(next as HTMLElement);

    await waitFor(() => expect(mocks.getAll).toHaveBeenLastCalledWith(1, -1, { start_date: "2026-08-19", end_date: "2026-08-20" }));
  });
});
