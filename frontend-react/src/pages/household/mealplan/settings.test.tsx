import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import HouseholdMealplanSettingsPage from "./settings";

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  createOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock("@/hooks/api", () => {
  const api = { mealplanRules: mocks };
  return { useUserApi: () => api };
});

// the query filter builder is covered by its own tests: here it just reports a filter string
vi.mock("@/components/Domain/QueryFilterBuilder", () => ({
  QueryFilterBuilder: (props: { onInput?: (value: string | undefined) => void }) => (
    <button type="button" onClick={() => props.onInput?.("rating > 3")}>set filter</button>
  ),
}));

const { t } = stubI18n();

const rule = {
  id: "rule-1",
  groupId: "g",
  householdId: "h",
  day: "monday",
  entryType: "dinner",
  queryFilterString: "rating > 3",
};

describe("meal plan settings page", () => {
  beforeEach(() => {
    mocks.getAll.mockResolvedValue({ data: { items: [rule] } });
    mocks.createOne.mockResolvedValue({ data: rule });
    mocks.updateOne.mockResolvedValue({ data: rule });
    mocks.deleteOne.mockResolvedValue({ data: rule });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("lists the existing rules", async () => {
    renderWithProviders(<HouseholdMealplanSettingsPage />);

    expect(screen.getByRole("heading", { name: t("meal-plan.meal-plan-rules") })).toBeTruthy();
    expect(await screen.findByText(t("meal-plan.applies-on-days", ["monday"]))).toBeTruthy();
    expect(screen.getByText(t("meal-plan.for-type-meal-types", ["dinner"]))).toBeTruthy();
    expect(screen.getByText(t("meal-plan.recipe-rules"))).toBeTruthy();
  });

  test("creates a rule once it has a query filter", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HouseholdMealplanSettingsPage />);
    await screen.findByText(t("meal-plan.applies-on-days", ["monday"]));

    const [create] = screen.getAllByRole("button", { name: t("general.create") }) as HTMLButtonElement[];
    expect(create?.disabled).toBe(true);

    await user.click(screen.getAllByRole("button", { name: "set filter" })[0] as HTMLElement);
    expect(create?.disabled).toBe(false);
    await user.click(create as HTMLElement);

    await waitFor(() => expect(mocks.createOne).toHaveBeenCalledWith({
      entryType: "unset",
      day: "unset",
      queryFilterString: "rating > 3",
    }));
  });

  test("edits and deletes a rule", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HouseholdMealplanSettingsPage />);
    await screen.findByText(t("meal-plan.applies-on-days", ["monday"]));

    await user.click(screen.getByRole("button", { name: t("general.edit") }));
    await user.click(await screen.findByRole("button", { name: t("general.update") }));
    await waitFor(() => expect(mocks.updateOne).toHaveBeenCalledWith("rule-1", rule));

    await user.click(screen.getByRole("button", { name: t("general.delete") }));
    await waitFor(() => expect(mocks.deleteOne).toHaveBeenCalledWith("rule-1"));
    expect(within(document.body).getByText(t("meal-plan.new-rule"))).toBeTruthy();
  });
});
