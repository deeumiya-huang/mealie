import { cleanup, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AppInfo } from "@/lib/api/types/admin";
import { setAppInfo } from "@/providers/app-info";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeCard } from "./RecipeCard";
import { RecipeCardMobile } from "./RecipeCardMobile";

const mocks = vi.hoisted(() => ({
  isOwnGroup: true,
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({ users: { addFavorite: vi.fn(), removeFavorite: vi.fn() } }),
  useStaticRoutes: () => ({
    recipeImage: () => "/image.webp",
    recipeSmallImage: () => "/small.webp",
    recipeTinyImage: () => "/tiny.webp",
  }),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", groupSlug: "family" } }),
}));

vi.mock("@/hooks/use-logged-in-state", () => ({
  useLoggedInState: () => ({ loggedIn: mocks.isOwnGroup, isOwnGroup: mocks.isOwnGroup }),
}));

vi.mock("@/hooks/use-users", () => ({
  useUserSelfRatings: () => ({ userRatings: [], refreshUserRatings: vi.fn() }),
}));

const { t } = stubI18n();

const tags = [{ id: "t1", name: "dinner", slug: "dinner" }];

describe("RecipeCard", () => {
  beforeEach(() => {
    mocks.isOwnGroup = true;
    setAppInfo({ allowedIframeHosts: [] } as unknown as AppInfo);
  });

  afterEach(() => {
    cleanup();
  });

  test("is a link to the recipe with its name, tags and favourite button", () => {
    renderWithProviders(
      <RecipeCard name="Pancakes" slug="pancakes" recipeId="r1" description="Fluffy" image="abc" tags={tags} rating={3} />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/g/family/r/pancakes");
    expect(link).toHaveTextContent("Pancakes");
    expect(screen.getByText("dinner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("recipe.add-to-favorites") })).toBeInTheDocument();
  });

  test("the description shows over the image on hover", async () => {
    renderWithProviders(<RecipeCard name="Pancakes" slug="pancakes" recipeId="r1" description="Fluffy" image="abc" />);

    expect(screen.queryByText("Fluffy")).not.toBeInTheDocument();
    await userEvent.hover(screen.getByRole("link"));
    expect(await screen.findByText("Fluffy")).toBeInTheDocument();
    await userEvent.unhover(screen.getByRole("link"));
  });

  test("a recipe without id is not a link and has no footer actions", () => {
    renderWithProviders(<RecipeCard name="Draft" slug="" recipeId="" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("recipe.add-to-favorites") })).not.toBeInTheDocument();
  });

  test("clicking the card itself reports the click", () => {
    const onClick = vi.fn();
    renderWithProviders(<RecipeCard name="Pancakes" slug="pancakes" recipeId="r1" onClick={onClick} />);

    fireEvent.click(screen.getByRole("link"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("RecipeCardMobile", () => {
  beforeEach(() => {
    mocks.isOwnGroup = true;
    setAppInfo({ allowedIframeHosts: [] } as unknown as AppInfo);
  });

  afterEach(() => {
    cleanup();
  });

  test("links to the recipe and shows name and description", () => {
    renderWithProviders(<RecipeCardMobile name="Pancakes" slug="pancakes" recipeId="r1" description="Fluffy" tags={tags} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/g/family/r/pancakes");
    expect(screen.getByText("Pancakes")).toBeInTheDocument();
    expect(screen.getByText("Fluffy")).toBeInTheDocument();
  });

  test("with onSelected a click selects instead of linking", async () => {
    const onSelected = vi.fn();
    renderWithProviders(<RecipeCardMobile name="Pancakes" slug="pancakes" recipeId="r1" description="" onSelected={onSelected} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Pancakes"));
    expect(onSelected).toHaveBeenCalledTimes(1);
  });

  test("outside the user's own group there are no favourites or menu", () => {
    mocks.isOwnGroup = false;
    renderWithProviders(<RecipeCardMobile name="Pancakes" slug="pancakes" recipeId="r1" description="" />);

    expect(screen.queryByRole("button", { name: t("recipe.add-to-favorites") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { expanded: false })).not.toBeInTheDocument();
  });
});
