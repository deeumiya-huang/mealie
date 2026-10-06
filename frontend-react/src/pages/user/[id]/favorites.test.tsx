import { cleanup, screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import UserFavoritesPage from "./favorites";

const mocks = vi.hoisted(() => ({
  section: vi.fn(),
  isOwnGroup: true,
}));

vi.mock("@/components/Domain/Recipe/RecipeCardSection", () => ({
  RecipeCardSection: (props: { title: string; query: { queryFilter: string } }) => {
    mocks.section(props);
    return <h2>{props.title}</h2>;
  },
}));

vi.mock("@/hooks/recipes", () => ({
  useLazyRecipes: () => ({ recipes: [], appendRecipes: vi.fn(), replaceRecipes: vi.fn() }),
}));

vi.mock("@/hooks/use-logged-in-state", () => ({
  useLoggedInState: () => ({ loggedIn: true, isOwnGroup: mocks.isOwnGroup }),
}));

const { t } = stubI18n();

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/user/:id/favorites" element={<UserFavoritesPage />} />
    </Routes>,
    { route: "/user/abc-123/favorites" },
  );
}

describe("user favorites page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.isOwnGroup = true;
  });

  test("shows the recipes favorited by the user in the route", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: t("user.user-favorites") })).toBeTruthy();
    expect(mocks.section.mock.calls[0][0].query).toEqual({ queryFilter: "favoritedBy.id = \"abc-123\"" });
    expect(document.title).toBe(t("general.favorites"));
  });

  test("shows nothing outside of the own group", () => {
    mocks.isOwnGroup = false;
    renderPage();

    expect(screen.queryByRole("heading", { name: t("user.user-favorites") })).toBeNull();
  });
});
