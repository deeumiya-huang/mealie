import { createRef } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { RecipeDialogSearch } from "./RecipeDialogSearch";
import type { RecipeDialogSearchHandle } from "./RecipeDialogSearch";

const routerPush = vi.fn();

const mocks = vi.hoisted(() => ({
  useRecipeSearch: vi.fn(),
}));

vi.mock("~/hooks/use-logged-in-state", () => ({
  useLoggedInState: () => ({ isOwnGroup: true }),
}));

vi.mock("~/hooks/api", () => ({
  useUserApi: () => ({}),
}));

vi.mock("~/hooks/api/api-client", () => ({
  usePublicExploreApi: () => ({ explore: {} }),
}));

vi.mock("~/hooks/recipes/use-recipe-search", () => ({
  useRecipeSearch: mocks.useRecipeSearch,
}));

vi.mock("~/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { groupSlug: "family" } }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => routerPush,
  useParams: () => ({ groupSlug: "family" }),
  useLocation: () => ({ pathname: "/g/family", search: "" }),
}));

// Stands in for RecipeCardMobile, as the Vue test stubbed it
vi.mock("./RecipeCardMobile", () => ({
  RecipeCardMobile: ({ name, className }: { name: string; className?: string }) => (
    <button className={["recipe-card", className].filter(Boolean).join(" ")} type="button">{name}</button>
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

function mountDialog(props: { onSelected?: (recipe: unknown) => void } = {}) {
  const ref = createRef<RecipeDialogSearchHandle>();
  const view = render(<RecipeDialogSearch ref={ref} {...props} />);
  act(() => ref.current!.open());
  return view;
}

const cards = () => Array.from(document.querySelectorAll(".recipe-card"));
const selected = () => document.querySelectorAll(".keyboard-selected");

describe("RecipeDialogSearch", () => {
  beforeEach(() => {
    routerPush.mockClear();
    mocks.useRecipeSearch.mockReturnValue({
      query: "",
      setQuery: vi.fn(),
      data: recipes,
      setData: vi.fn(),
    });

    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("ArrowUp and ArrowDown clamp recipe selection", () => {
    mountDialog();

    keydown("ArrowDown");
    expect(selected()).toHaveLength(1);
    expect(cards()[0]!.classList).toContain("keyboard-selected");

    keydown("ArrowDown");
    keydown("ArrowDown");
    expect(selected()).toHaveLength(1);
    expect(cards()[1]!.classList).toContain("keyboard-selected");

    keydown("ArrowUp");
    expect(cards()[0]!.classList).toContain("keyboard-selected");

    keydown("ArrowUp");
    keydown("ArrowUp");
    expect(selected()).toHaveLength(0);
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
      data: [],
      setData: vi.fn(),
    });
    const onSelected = vi.fn();
    mountDialog();

    keydown("ArrowDown");
    keydown("ArrowUp");
    keydown("Enter");

    expect(selected()).toHaveLength(0);
    expect(routerPush).not.toHaveBeenCalled();
    expect(onSelected).not.toHaveBeenCalled();
  });
});
