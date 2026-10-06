import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeSelector } from "./RecipeSelector";

const mocks = vi.hoisted(() => ({
  fetchMore: vi.fn(),
}));

vi.mock("@/hooks/recipes", () => ({
  useLazyRecipes: () => ({ fetchMore: mocks.fetchMore }),
}));

vi.mock("@/hooks/store", () => ({
  useCategoryStore: () => ({ store: [] }),
  useTagStore: () => ({ store: [] }),
}));

vi.mock("./RecipeCardLineItem", () => ({
  RecipeCardLineItem: (props: { recipe: { name: string } }) => <button type="button">{props.recipe.name}</button>,
}));

const { t } = stubI18n();

describe("RecipeSelector", () => {
  beforeEach(() => {
    mocks.fetchMore.mockResolvedValue([
      { id: "r1", name: "Soup", slug: "soup" },
      { id: "r2", name: "Stew", slug: "stew" },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("loads the first (doubled) page with the query filter and lets the user pick a recipe", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<RecipeSelector queryFilter="(rating > 3)" onChange={onChange} />);

    await user.click(await screen.findByRole("button", { name: "Stew" }));

    expect(mocks.fetchMore).toHaveBeenCalledWith(1, 40, "name", "asc", null, { search: "", categories: [], tags: [] }, "(rating > 3)");
    expect(onChange).toHaveBeenCalledWith({ id: "r2", name: "Stew", slug: "stew" });
  });

  test("shows the selected recipe and clears it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<RecipeSelector value={{ id: "r1", name: "Soup", slug: "soup" }} onChange={onChange} />);

    expect(screen.getByText(t("general.selected"))).toBeTruthy();
    const chip = screen.getByText("Soup", { selector: ".MuiChip-label" });
    expect(chip).toBeTruthy();
    await user.click(chip.parentElement?.querySelector("svg.MuiChip-deleteIcon") as Element);
    expect(onChange).toHaveBeenCalledWith(null);
    await screen.findByRole("button", { name: "Stew" });
  });

  test("searches (debounced) and shows the no-results slot", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipeSelector noResults={<p>nothing here</p>} />);
    await screen.findByRole("button", { name: "Stew" });

    mocks.fetchMore.mockResolvedValue([]);
    await user.type(screen.getByPlaceholderText(t("search.search-placeholder")), "zzz");

    expect(await screen.findByText("nothing here")).toBeTruthy();
    await waitFor(() => expect(mocks.fetchMore).toHaveBeenLastCalledWith(1, 40, "name", "asc", null, { search: "zzz", categories: [], tags: [] }, null));
  });
});
