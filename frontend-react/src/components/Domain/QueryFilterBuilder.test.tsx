import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { QueryFilterBuilder } from "./QueryFilterBuilder";
import type { FieldDefinition } from "@/hooks/use-query-filter-builder";
import type { QueryFilterJSON } from "@/lib/api/types/non-generated";
import { Organizer } from "@/lib/api/types/non-generated";
import { renderWithProviders } from "@/test/utils";

const tags = [
  { id: "t1", name: "Dinner", slug: "dinner" },
  { id: "t2", name: "Lunch", slug: "lunch" },
];

function emptyStore() {
  return { store: [] as unknown[], actions: { getAll: vi.fn().mockResolvedValue([]), createOne: vi.fn() } };
}

vi.mock("@/hooks/store", () => ({
  useCategoryStore: () => emptyStore(),
  useFoodStore: () => emptyStore(),
  useHouseholdStore: () => emptyStore(),
  useLabelStore: () => emptyStore(),
  useToolStore: () => emptyStore(),
  useTagStore: () => ({ store: tags, actions: { getAll: vi.fn().mockResolvedValue(tags), createOne: vi.fn() } }),
}));

vi.mock("@/hooks/store/use-user-store", () => ({
  useUserStore: () => emptyStore(),
}));

vi.mock("@/hooks/use-households", () => ({
  useHouseholdSelf: () => ({ household: { preferences: { firstDayOfWeek: 1 } }, actions: {} }),
}));

const fieldDefs: FieldDefinition[] = [
  { name: "name", label: "Name", type: "string" },
  { name: "servings", label: "Servings", type: "number" },
  { name: "tags.id", label: "Tags", type: Organizer.Tag },
];

describe("QueryFilterBuilder", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("starts with one row for the first field and cannot delete the last row", async () => {
    renderWithProviders(<QueryFilterBuilder fieldDefs={fieldDefs} />);

    // field name and relational operator
    expect(await screen.findAllByRole("combobox")).toHaveLength(2);
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: /Add Field/ })).toBeTruthy();
  });

  test("emits the filter string and JSON, debounced, once a value is entered", async () => {
    const onInput = vi.fn();
    const onInputJSON = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<QueryFilterBuilder fieldDefs={fieldDefs} onInput={onInput} onInputJSON={onInputJSON} />);

    const textbox = await screen.findByRole("textbox");
    await user.type(textbox, "soup");
    expect(onInput).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(onInput).toHaveBeenLastCalledWith("name = \"soup\"");
    const json = onInputJSON.mock.calls.at(-1)![0] as QueryFilterJSON;
    expect(json.parts).toHaveLength(1);
    expect(json.parts![0]).toMatchObject({ attributeName: "name", relationalOperator: "=", value: "soup" });
  });

  test("adds and removes rows", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<QueryFilterBuilder fieldDefs={fieldDefs} />);

    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: /Add Field/ }));
    expect(screen.getAllByRole("textbox")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    await waitFor(() => expect(screen.getAllByRole("textbox")).toHaveLength(1));
  });

  test("initializes the rows from an initial query filter", async () => {
    const initial: QueryFilterJSON = {
      parts: [
        { attributeName: "name", relationalOperator: "=", value: "pie" },
        { attributeName: "servings", logicalOperator: "OR", relationalOperator: ">=", value: "4" },
        { attributeName: "tags.id", logicalOperator: "AND", relationalOperator: "IN", value: ["t2"] },
      ],
    };
    renderWithProviders(<QueryFilterBuilder fieldDefs={fieldDefs} initialQueryFilter={initial} />);

    expect(await screen.findByDisplayValue("pie")).toBeTruthy();
    expect(screen.getByDisplayValue("4")).toBeTruthy();
    // the organizer is hydrated from the store and shown as a chip
    expect(await screen.findByText("Lunch")).toBeTruthy();
    expect(within(screen.getByText("Lunch").closest("div")!.parentElement!).getByText("Lunch")).toBeTruthy();
  });
});
