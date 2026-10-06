import { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { RecipeOrganizerSelector, type RecipeOrganizerItem } from "./RecipeOrganizerSelector";
import { Organizer } from "@/lib/api/types/non-generated";
import { renderWithProviders } from "@/test/utils";

const mocks = vi.hoisted(() => ({
  createOne: vi.fn(),
  tags: [
    { id: "t1", name: "Dinner", slug: "dinner" },
    { id: "t2", name: "Lunch", slug: "lunch" },
    { id: "t3", name: "Late Dinner", slug: "late-dinner" },
  ],
}));

vi.mock("@/hooks/store", () => ({
  useCategoryStore: () => ({ store: [], actions: { createOne: vi.fn() } }),
  useFoodStore: () => ({ store: [], actions: { createOne: vi.fn() } }),
  useHouseholdStore: () => ({ store: [], actions: {} }),
  useLabelStore: () => ({ store: [], actions: { createOne: vi.fn() } }),
  useToolStore: () => ({ store: [], actions: { createOne: vi.fn() } }),
  useTagStore: () => ({ store: mocks.tags, actions: { createOne: mocks.createOne } }),
}));

vi.mock("@/hooks/store/use-user-store", () => ({
  useUserStore: () => ({ store: [{ id: "u1", username: "admin", fullName: "Change Me" }], actions: {} }),
}));

function Harness({ initial, type = Organizer.Tag, showAdd = true }: { initial?: RecipeOrganizerItem[]; type?: Organizer; showAdd?: boolean }) {
  const [value, setValue] = useState<RecipeOrganizerItem[] | undefined>(initial);
  return (
    <>
      <RecipeOrganizerSelector selectorType={type} value={value} onChange={setValue} showAdd={showAdd} />
      <output data-testid="selected">{(value ?? []).map(item => ("name" in item ? item.name : item.fullName)).join("|")}</output>
    </>
  );
}

describe("RecipeOrganizerSelector", () => {
  beforeEach(() => {
    mocks.createOne.mockReset();
  });

  test("is labelled for its organizer type and lists the store items", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    const input = screen.getByRole("combobox", { name: "Tags" });
    await user.click(input);
    expect(await screen.findByRole("option", { name: "Dinner" })).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  test("picks items as chips and removes them again", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.click(screen.getByRole("combobox", { name: "Tags" }));
    await user.click(await screen.findByRole("option", { name: "Lunch" }));
    expect(screen.getByTestId("selected").textContent).toBe("Lunch");

    await user.click(screen.getByTestId("CancelIcon"));
    await waitFor(() => expect(screen.getByTestId("selected").textContent).toBe(""));
  });

  test("filters while typing", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.type(screen.getByRole("combobox", { name: "Tags" }), "dinn");
    const options = await screen.findAllByRole("option");
    expect(options.map(option => option.textContent)).toEqual(["Dinner", "Late Dinner"]);
  });

  test("Enter creates a new item when nothing matches", async () => {
    mocks.createOne.mockResolvedValue({ id: "t9", name: "Brunch", slug: "brunch" });
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.type(screen.getByRole("combobox", { name: "Tags" }), "Brunch{Enter}");
    await waitFor(() => expect(mocks.createOne).toHaveBeenCalledWith({ name: "Brunch" }));
    await waitFor(() => expect(screen.getByTestId("selected").textContent).toBe("Brunch"));
  });

  test("does not offer to create when showAdd is false", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness showAdd={false} />);

    await user.type(screen.getByRole("combobox", { name: "Tags" }), "zzz");
    expect(await screen.findByText("No results found")).toBeTruthy();
    expect(mocks.createOne).not.toHaveBeenCalled();
  });

  test("shows the full name of users", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness type={Organizer.User} />);

    await user.click(screen.getByRole("combobox", { name: "Users" }));
    await user.click(await screen.findByRole("option", { name: "Change Me" }));
    expect(screen.getByTestId("selected").textContent).toBe("Change Me");
  });
});
