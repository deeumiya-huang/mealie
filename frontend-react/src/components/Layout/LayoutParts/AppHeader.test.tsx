import { cleanup, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { AppHeader } from "./AppHeader";

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({
    user: null,
    loggedIn: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/recipes/use-recipe-search", () => ({
  useRecipeSearch: () => ({
    query: "",
    setQuery: vi.fn(),
    loading: false,
    data: [],
  }),
}));

const { t } = stubI18n();

// jsdom has no matchMedia; `useDisplay` reads it, and without it every query is false (= xs)
function stubViewport(width: number) {
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

describe("AppHeader recipe search", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("the search field opens the recipe search dialog", async () => {
    stubViewport(1280);
    renderWithProviders(<AppHeader />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("search.search") })).not.toBeInTheDocument();

    await userEvent.click(screen.getByPlaceholderText(t("search.search-hint")));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(t("search.search"))).toBeInTheDocument();
  });

  test("the search button opens the recipe search dialog on xs screens", async () => {
    stubViewport(400);
    renderWithProviders(<AppHeader />);

    expect(screen.queryByPlaceholderText(t("search.search-hint"))).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: t("search.search") }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  test("the / key opens the recipe search dialog unless an input has focus", async () => {
    stubViewport(1280);
    renderWithProviders(
      <>
        <AppHeader />
        <input aria-label="other input" />
      </>,
    );

    const input = screen.getByLabelText("other input");
    input.focus();
    fireEvent.keyDown(input, { key: "/" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    input.blur();
    fireEvent.keyDown(document.body, { key: "/" });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  test("the menu=false header still opens the search with the / key", async () => {
    stubViewport(1280);
    renderWithProviders(<AppHeader menu={false} />);

    expect(screen.queryByPlaceholderText(t("search.search-hint"))).not.toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: "/" });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
