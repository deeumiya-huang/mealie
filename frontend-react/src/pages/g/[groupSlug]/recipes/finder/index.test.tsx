import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { resetStorageStores } from "@/hooks/utils";
import { renderWithProviders, stubI18n } from "@/test/utils";
import RecipeFinderPage from "./index";

const mocks = vi.hoisted(() => ({
  isOwnGroup: true,
  getSuggestions: vi.fn(),
  foods: [
    { id: "f1", name: "Egg", pluralName: "Eggs" },
    { id: "f2", name: "Flour", pluralName: null },
  ],
  tools: [{ id: "t1", name: "Whisk" }],
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", groupSlug: "family" } }),
}));

vi.mock("@/hooks/use-logged-in-state", () => ({
  useLoggedInState: () => ({ loggedIn: mocks.isOwnGroup, isOwnGroup: mocks.isOwnGroup }),
}));

vi.mock("@/hooks/api", () => {
  const api = { recipes: { getSuggestions: mocks.getSuggestions } };
  return { useUserApi: () => api, usePublicExploreApi: () => ({ explore: api }) };
});

vi.mock("@/hooks/store", () => {
  const store = (items: unknown[]) => () => ({ store: items, actions: { getAll: vi.fn().mockResolvedValue(items), refresh: vi.fn() } });
  return {
    useFoodStore: store(mocks.foods),
    usePublicFoodStore: store(mocks.foods),
    useToolStore: store(mocks.tools),
    usePublicToolStore: store(mocks.tools),
  };
});

vi.mock("@/components/Domain/Recipe/RecipeCardMobile", () => ({
  RecipeCardMobile: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock("@/components/Domain/QueryFilterBuilder", () => ({
  QueryFilterBuilder: () => <div>query filter builder</div>,
}));

const { t } = stubI18n();

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/g/:groupSlug/recipes/finder" element={<RecipeFinderPage />} />
    </Routes>,
    { route: "/g/family/recipes/finder" },
  );
}

const suggestions = {
  items: [
    {
      recipe: { id: "r1", name: "Omelette", slug: "omelette", description: "", rating: 0 },
      missingFoods: [],
      missingTools: [],
      substitutedFoods: [],
    },
    {
      recipe: { id: "r2", name: "Crepes", slug: "crepes", description: "", rating: 0 },
      missingFoods: [{ id: "f2", name: "Flour", pluralName: null }],
      missingTools: [],
      substitutedFoods: [],
    },
  ],
};

describe("recipe finder page", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageStores();
    mocks.isOwnGroup = true;
    mocks.getSuggestions.mockResolvedValue({ data: suggestions });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("starts with an empty selection", async () => {
    renderPage();

    expect(await screen.findByText(t("recipe-finder.selected-ingredients"))).toBeTruthy();
    expect(screen.getByRole("heading", { name: t("recipe-finder.recipe-finder") })).toBeTruthy();
    expect(screen.getByText(t("recipe-finder.no-ingredients-selected"))).toBeTruthy();
    expect(screen.getByText(t("recipe-finder.no-recipes-found"))).toBeTruthy();
    expect(mocks.getSuggestions).not.toHaveBeenCalled();
    expect(document.title).toBe(t("recipe-finder.recipe-finder"));
  });

  test("restores the stored foods and suggests recipes for them", async () => {
    localStorage.setItem("recipe-finder-preferences", JSON.stringify({ foodIds: ["f1"] }));
    renderPage();

    expect(await screen.findByText(t("recipe-finder.ready-to-make"), undefined, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByText("Eggs")).toBeTruthy();
    expect(screen.getByText("Omelette")).toBeTruthy();
    expect(screen.getByText(t("recipe-finder.almost-ready-to-make"))).toBeTruthy();
    expect(screen.getByText("Crepes")).toBeTruthy();

    const [query, foodIds, toolIds] = mocks.getSuggestions.mock.calls[0];
    expect(query).toMatchObject({ limit: 20, maxMissingFoods: 20, maxMissingTools: 20, includeSubstitutions: true });
    expect(foodIds).toEqual(["f1"]);
    expect(toolIds).toEqual([]);
  });

  test("ticking a missing ingredient adds it to the selection and searches again", async () => {
    const user = userEvent.setup();
    localStorage.setItem("recipe-finder-preferences", JSON.stringify({ foodIds: ["f1"] }));
    renderPage();
    await screen.findByText("Crepes", undefined, { timeout: 3000 });

    await user.click(screen.getByRole("checkbox", { name: "Flour" }));

    await waitFor(() => expect(mocks.getSuggestions).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(mocks.getSuggestions.mock.calls[1][1]).toEqual(["f1", "f2"]);
    expect(JSON.parse(localStorage.getItem("recipe-finder-preferences") ?? "{}").foodIds).toEqual(["f1", "f2"]);
  });

  test("removing a selected ingredient clears it from the stored selection", async () => {
    const user = userEvent.setup();
    localStorage.setItem("recipe-finder-preferences", JSON.stringify({ foodIds: ["f1"] }));
    renderPage();
    await screen.findByText("Eggs");

    const chip = screen.getByText("Eggs").closest(".MuiChip-root") as HTMLElement;
    await user.click(within(chip).getByTestId("CancelIcon"));

    await waitFor(() => expect(screen.getByText(t("recipe-finder.no-ingredients-selected"))).toBeTruthy());
    expect(JSON.parse(localStorage.getItem("recipe-finder-preferences") ?? "{}").foodIds).toEqual([]);
  });

  test("settings are stored and the on-hand options are hidden outside the own group", async () => {
    const user = userEvent.setup();
    mocks.isOwnGroup = false;
    renderPage();

    await user.click(await screen.findByRole("button", { name: t("general.settings") }));

    expect(await screen.findByRole("checkbox", { name: t("recipe-finder.include-substitutions") })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: t("recipe-finder.include-ingredients-on-hand") })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: t("recipe-finder.include-tools-on-hand") })).toBeNull();

    await user.click(screen.getByRole("checkbox", { name: t("recipe-finder.include-substitutions") }));
    expect(JSON.parse(localStorage.getItem("recipe-finder-preferences") ?? "{}")).toMatchObject({ includeSubstitutions: false });
  });
});
