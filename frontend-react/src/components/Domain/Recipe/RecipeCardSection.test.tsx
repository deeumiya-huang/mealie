import { useState } from "react";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Recipe } from "@/lib/api/types/recipe";
import type { RecipeSearchQuery } from "@/lib/api/user/recipes/recipe";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeCardSection } from "./RecipeCardSection";

const mocks = vi.hoisted(() => ({
  fetchMore: vi.fn(),
  getRandom: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/hooks/recipes", () => ({
  useLazyRecipes: () => ({ fetchMore: mocks.fetchMore, getRandom: mocks.getRandom }),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", groupSlug: "family" } }),
}));

vi.mock("@/hooks/use-logged-in-state", () => ({
  useLoggedInState: () => ({ loggedIn: true, isOwnGroup: true }),
}));

vi.mock("./RecipeCard", () => ({
  RecipeCard: ({ name }: { name: string }) => <div data-testid="recipe-card">{name}</div>,
}));

vi.mock("./RecipeCardMobile", () => ({
  RecipeCardMobile: ({ name }: { name: string }) => <div data-testid="recipe-card-mobile">{name}</div>,
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

const { t } = stubI18n();

function viewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:(\d+)px/.exec(query);
    return {
      matches: min ? width >= Number(min[1]) : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
  });
}

function recipe(id: string, name: string): Recipe {
  return { id, name, slug: id, description: "", rating: 0, tags: [] } as unknown as Recipe;
}

function Harness({ query = null }: { query?: RecipeSearchQuery | null }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  return (
    <RecipeCardSection
      title="All"
      recipes={recipes}
      query={query}
      onReplaceRecipes={setRecipes}
      onAppendRecipes={more => setRecipes(current => [...current, ...more])}
    />
  );
}

describe("RecipeCardSection", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.fetchMore.mockReset();
    mocks.fetchMore.mockResolvedValue([recipe("a", "Apple pie"), recipe("b", "Banana bread")]);
    mocks.getRandom.mockReset();
    mocks.navigate.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("loads two pages up front and shows the cards", async () => {
    viewport(1920);
    renderWithProviders(<Harness />);

    expect(await screen.findAllByTestId("recipe-card")).toHaveLength(2);
    expect(screen.getByText("Apple pie")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
    // the first call is doubled: page 1, two pages worth
    expect(mocks.fetchMore.mock.calls[0]?.slice(0, 3)).toEqual([1, 64, "created_at"]);
  });

  test("small screens get the compact cards", async () => {
    viewport(400);
    renderWithProviders(<Harness />);

    expect(await screen.findAllByTestId("recipe-card-mobile")).toHaveLength(2);
  });

  test("the sort menu reorders through the API and remembers the choice", async () => {
    viewport(1920);
    renderWithProviders(<Harness />);
    await screen.findAllByTestId("recipe-card");

    await userEvent.click(screen.getByRole("button", { name: t("general.sort") }));
    await userEvent.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: t("general.sort-alphabetically") }));

    await waitFor(() => expect(mocks.fetchMore).toHaveBeenCalledTimes(2));
    expect(mocks.fetchMore.mock.calls[1]?.slice(0, 4)).toEqual([1, 32, "name", "asc"]);
    expect(JSON.parse(localStorage.getItem("recipe-section-preferences") ?? "{}")).toMatchObject({ orderBy: "name", orderDirection: "asc" });
  });

  test("the random button opens a random recipe", async () => {
    viewport(1920);
    mocks.getRandom.mockResolvedValue(recipe("lucky", "Lucky"));
    renderWithProviders(<Harness />);
    await screen.findAllByTestId("recipe-card");

    await userEvent.click(screen.getByRole("button", { name: t("general.random") }));

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/g/family/r/lucky"));
  });

  test("a different query reloads the recipes", async () => {
    viewport(1920);
    const { rerender } = renderWithProviders(<Harness query={{ search: "a" }} />);
    await screen.findAllByTestId("recipe-card");
    expect(mocks.fetchMore).toHaveBeenCalledTimes(1);

    mocks.fetchMore.mockResolvedValue([recipe("c", "Cherry cake")]);
    rerender(<Harness query={{ search: "b" }} />);

    expect(await screen.findByText("Cherry cake")).toBeInTheDocument();
    expect(mocks.fetchMore).toHaveBeenCalledTimes(2);
  });

  test("the view toggle switches to the compact cards", async () => {
    viewport(1920);
    renderWithProviders(<Harness />);
    await screen.findAllByTestId("recipe-card");

    await userEvent.click(screen.getByRole("button", { expanded: false, name: "" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: t("general.toggle-view") }));

    expect(await screen.findAllByTestId("recipe-card-mobile")).toHaveLength(2);
  });
});
