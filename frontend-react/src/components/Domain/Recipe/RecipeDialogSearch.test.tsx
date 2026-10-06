import { act, createRef } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "@/test/utils";
import type { RecipeSummary } from "@/lib/api/types/recipe";
import { RecipeDialogSearch, type RecipeDialogSearchHandle } from "./RecipeDialogSearch";

const routerPush = vi.fn();

const mocks = vi.hoisted(() => ({
  useRecipeSearch: vi.fn(),
}));

vi.mock("@/hooks/use-logged-in-state", () => ({
  useLoggedInState: () => ({
    isOwnGroup: true,
  }),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({
    user: { groupSlug: "family" },
  }),
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({}),
}));

vi.mock("@/hooks/api/api-client", () => ({
  usePublicExploreApi: () => ({
    explore: {},
  }),
}));

vi.mock("@/hooks/recipes/use-recipe-search", () => ({
  useRecipeSearch: mocks.useRecipeSearch,
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => routerPush,
  };
});

vi.mock("./RecipeCardMobile", () => ({
  RecipeCardMobile: ({ name, className }: { name: string; className?: string }) => (
    <button className={`recipe-card ${className ?? ""}`} type="button">{name}</button>
  ),
}));

const recipes = [
  {
    id: "1",
    name: "First Recipe",
    slug: "first-recipe",
    description: "",
    rating: 0,
  },
  {
    id: "2",
    name: "Second Recipe",
    slug: "second-recipe",
    description: "",
    rating: 0,
  },
];

function keydown(key: string) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
  });
}

function keyboardSelected() {
  return document.querySelectorAll(".keyboard-selected");
}

function recipeCards() {
  return document.querySelectorAll(".recipe-card");
}

function mountDialog(props: { onSelected?: (recipe: RecipeSummary) => void } = {}) {
  const ref = createRef<RecipeDialogSearchHandle>();
  const wrapper = renderWithProviders(<RecipeDialogSearch ref={ref} {...props} />);

  act(() => {
    ref.current?.open();
  });

  return wrapper;
}

describe("RecipeDialogSearch", () => {
  beforeEach(() => {
    routerPush.mockClear();
    mocks.useRecipeSearch.mockReturnValue({
      query: "",
      setQuery: vi.fn(),
      loading: false,
      data: recipes,
    });

    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("ArrowUp and ArrowDown clamp recipe selection", () => {
    mountDialog();

    keydown("ArrowDown");
    expect(keyboardSelected()).toHaveLength(1);
    expect(recipeCards()[0]?.classList).toContain("keyboard-selected");

    keydown("ArrowDown");
    keydown("ArrowDown");
    expect(keyboardSelected()).toHaveLength(1);
    expect(recipeCards()[1]?.classList).toContain("keyboard-selected");

    keydown("ArrowUp");
    expect(recipeCards()[0]?.classList).toContain("keyboard-selected");

    keydown("ArrowUp");
    keydown("ArrowUp");
    expect(keyboardSelected()).toHaveLength(0);
  });

  test("Enter navigates to the selected recipe", () => {
    mountDialog();

    keydown("ArrowDown");
    keydown("ArrowDown");
    keydown("Enter");

    expect(routerPush).toHaveBeenCalledWith("/g/family/r/second-recipe");
  });

  test("Enter selects the first recipe when no recipe is keyboard-selected", () => {
    mountDialog();

    keydown("Enter");

    expect(routerPush).toHaveBeenCalledWith("/g/family/r/first-recipe");
  });

  test("Enter emits selected instead of navigating when selected attr is provided", () => {
    const onSelected = vi.fn();
    mountDialog({ onSelected });

    keydown("Enter");

    expect(onSelected.mock.calls).toEqual([[recipes[0]]]);
    expect(routerPush).not.toHaveBeenCalled();
  });

  test("keyboard navigation is a no-op when there are no results", () => {
    mocks.useRecipeSearch.mockReturnValue({
      query: "",
      setQuery: vi.fn(),
      loading: false,
      data: [],
    });
    // Vue read `wrapper.emitted("selected")`; here the selected callback is the emit spy
    const onSelected = vi.fn();
    mountDialog({ onSelected });

    keydown("ArrowDown");
    keydown("ArrowUp");
    keydown("Enter");

    expect(keyboardSelected()).toHaveLength(0);
    expect(routerPush).not.toHaveBeenCalled();
    expect(onSelected).not.toHaveBeenCalled();
  });
});
