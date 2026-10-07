import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { recipePageRoute, renderRoutes } from "@/components/Domain/Recipe/RecipeCreate/test-utils";
import { stubI18n } from "@/test/utils";
import RecipeCreateNewPage from "./new";

const mocks = vi.hoisted(() => ({
  createOne: vi.fn(),
}));

vi.mock("@/hooks/api", () => {
  const api = { recipes: { createOne: mocks.createOne } };
  return { useUserApi: () => api };
});

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { groupSlug: "home" } }),
}));

const { t } = stubI18n();

const routes = [
  { path: "/g/:groupSlug/r/create/new", element: <RecipeCreateNewPage /> },
  recipePageRoute,
];

describe("create recipe by name page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("creates a recipe by name and opens it in edit mode", async () => {
    mocks.createOne.mockResolvedValue({ response: { status: 201, data: "pasta-bake" }, data: "pasta-bake", error: null });
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/new");

    expect(screen.getByText(t("recipe.create-recipe"))).toBeInTheDocument();
    expect(screen.getByText(t("recipe.new-recipe-names-must-be-unique"))).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: t("recipe.recipe-name") }), "Pasta Bake");
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/pasta-bake"));
    expect(router.state.location.search).toBe("?edit=true");
    expect(mocks.createOne).toHaveBeenCalledWith({ name: "Pasta Bake" });
  });

  test("creates the recipe when Enter is pressed in the name field", async () => {
    mocks.createOne.mockResolvedValue({ response: { status: 201, data: "soup" }, data: "soup", error: null });
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/new");

    await user.type(screen.getByRole("textbox", { name: t("recipe.recipe-name") }), "Soup{Enter}");

    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/soup"));
  });

  test("keeps the create button disabled while the name is blank and stays on the page when creating fails", async () => {
    mocks.createOne.mockResolvedValue({ response: { status: 400 }, data: null, error: new Error("duplicate") });
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/new");

    const create = screen.getByRole("button", { name: t("general.create") });
    expect(create).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: t("recipe.recipe-name") }), "   ");
    expect(create).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: t("recipe.recipe-name") }), "x");
    await user.click(create);

    await waitFor(() => expect(mocks.createOne).toHaveBeenCalled());
    expect(router.state.location.pathname).toBe("/g/home/r/create/new");
  });
});
