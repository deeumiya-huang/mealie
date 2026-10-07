import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { clearRecipeExplorerSearchState } from "@/hooks/use-recipe-explorer-search";
import { resetStorageStores } from "@/hooks/utils";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeExplorerPage } from "./RecipeExplorerPage";

const mocks = vi.hoisted(() => ({
  isOwnGroup: true,
  section: vi.fn(),
  categories: [{ id: "c1", name: "Dinner", slug: "dinner" }],
  tags: [{ id: "t1", name: "Quick", slug: "quick" }],
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", groupSlug: "family", householdId: "h1" }, loggedIn: mocks.isOwnGroup }),
}));

vi.mock("@/hooks/use-logged-in-state", () => ({
  useLoggedInState: () => ({ loggedIn: mocks.isOwnGroup, isOwnGroup: mocks.isOwnGroup }),
}));

vi.mock("@/hooks/recipes", () => ({
  useLazyRecipes: () => ({ recipes: [], appendRecipes: vi.fn(), replaceRecipes: vi.fn() }),
}));

vi.mock("@/hooks/store", () => {
  const store = (items: unknown[]) => () => ({ store: items, actions: { refresh: vi.fn(), getAll: vi.fn() } });
  return {
    useCategoryStore: store(mocks.categories),
    usePublicCategoryStore: store(mocks.categories),
    useTagStore: store(mocks.tags),
    usePublicTagStore: store(mocks.tags),
    useToolStore: store([]),
    usePublicToolStore: store([]),
    useFoodStore: store([]),
    usePublicFoodStore: store([]),
    useHouseholdStore: store([]),
    usePublicHouseholdStore: store([]),
  };
});

vi.mock("@/components/Domain/Recipe/RecipeCardSection", () => ({
  RecipeCardSection: (props: { title: string; query: Record<string, unknown> }) => {
    mocks.section(props);
    return <h2>{props.title}</h2>;
  },
}));

const { t } = stubI18n();

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="search">{location.search}</div>;
}

function renderPage(route = "/g/family") {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/g/:groupSlug" element={<RecipeExplorerPage />} />
      </Routes>
      <LocationDisplay />
    </>,
    { route },
  );
}

function lastQuery() {
  const calls = mocks.section.mock.calls;
  return calls[calls.length - 1][0].query as Record<string, unknown>;
}

describe("RecipeExplorerPage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetStorageStores();
    // the search box drops the shared state a tick after it unmounts; start every test fresh
    clearRecipeExplorerSearchState("family");
    mocks.isOwnGroup = true;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("shows the recipes once the search is ready", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: t("general.recipes") })).toBeTruthy();
    expect(screen.getByPlaceholderText(t("search.search-placeholder"))).toBeTruthy();
    expect(lastQuery().search).toBe("");
    expect(lastQuery().orderBy).toBe("created_at");
  });

  test("typing in the search box narrows the recipe query and the URL", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: t("general.recipes") });

    await user.type(screen.getByPlaceholderText(t("search.search-placeholder")), "salad");

    await waitFor(() => expect(lastQuery().search).toBe("salad"), { timeout: 3000 });
    await waitFor(() => expect(screen.getByTestId("search").textContent).toBe("?search=salad"));
  });

  test("restores the filters from the URL", async () => {
    renderPage("/g/family?search=soup&categories=c1&requireAllCategories=true");

    await screen.findByRole("heading", { name: t("general.recipes") });
    await waitFor(() => expect(lastQuery().categories).toEqual(["c1"]));
    expect(lastQuery().search).toBe("soup");
    expect(lastQuery().requireAllCategories).toBe(true);
    expect(screen.getByPlaceholderText(t("search.search-placeholder"))).toHaveValue("soup");
  });

  test("reset clears the search", async () => {
    const user = userEvent.setup();
    renderPage("/g/family?search=soup");
    await screen.findByRole("heading", { name: t("general.recipes") });

    // the settings button is the icon button after the sort menu
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[buttons.length - 1]);
    await user.click(await screen.findByRole("button", { name: t("general.reset") }));

    await waitFor(() => expect(lastQuery().search).toBe(""), { timeout: 3000 });
    expect(screen.getByPlaceholderText(t("search.search-placeholder"))).toHaveValue("");
  });

  test("auto search off shows a search button that applies the query", async () => {
    const user = userEvent.setup();
    renderPage("/g/family?auto=false");
    await screen.findByRole("heading", { name: t("general.recipes") });

    await user.type(screen.getByPlaceholderText(t("search.search-placeholder")), "pie");
    // nothing is searched until the button is pressed
    await new Promise(resolve => setTimeout(resolve, 700));
    expect(lastQuery().search).toBe("");

    await user.click(screen.getByRole("button", { name: t("search.search") }));
    await waitFor(() => expect(lastQuery().search).toBe("pie"));
  });
});
