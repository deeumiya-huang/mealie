import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { recipePageRoute, renderRoutes } from "@/components/Domain/Recipe/RecipeCreate/test-utils";
import { getStorageStore } from "@/hooks/utils/use-storage";
import { stubI18n } from "@/test/utils";
import RecipeCreateHtmlPage from "./html";

const mocks = vi.hoisted(() => ({
  createOneByHtmlOrJson: vi.fn(),
  refreshTags: vi.fn(),
  group: { aiProviderSettings: { aiEnabled: false } },
}));

vi.mock("@/hooks/api", () => {
  const api = { recipes: { createOneByHtmlOrJson: mocks.createOneByHtmlOrJson } };
  return { useUserApi: () => api };
});

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { groupSlug: "home" } }),
}));

vi.mock("@/hooks/use-groups", () => ({
  useGroupSelf: () => ({ group: mocks.group, actions: {} }),
}));

vi.mock("@/hooks/store/use-tag-store", () => ({
  useTagStore: () => ({ store: [], actions: { refresh: mocks.refreshTags } }),
}));

// The JSON editor (vanilla-jsoneditor) needs a real browser; the stand-in shows its value as text.
vi.mock("@/components/global/RecipeJsonEditor", () => ({
  RecipeJsonEditor: ({ value }: { value: object }) => <pre data-testid="json-editor">{JSON.stringify(value)}</pre>,
}));

const { t } = stubI18n();

const defaults = {
  importKeywordsAsTags: false,
  importCategories: false,
  stayInEditMode: false,
  parseRecipe: true,
  translateRecipe: false,
  createNewOrganizers: false,
};
const preferences = getStorageStore("local", "recipe-create-preferences", defaults, { mergeDefaults: true });

const routes = [
  { path: "/g/:groupSlug/r/create/html", element: <RecipeCreateHtmlPage /> },
  recipePageRoute,
];

describe("import recipe from HTML or JSON page", () => {
  beforeEach(() => {
    mocks.group.aiProviderSettings.aiEnabled = false;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    preferences.set(defaults);
  });

  test("creates the recipe from pasted data with the chosen import options", async () => {
    mocks.createOneByHtmlOrJson.mockResolvedValue({ response: { status: 201, data: "html-pie" }, data: "html-pie", error: null });
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/html");

    const create = screen.getByRole("button", { name: t("general.create") });
    expect(create).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: t("new-recipe.recipe-html-or-json") }), "<html></html>");
    await user.type(screen.getByRole("textbox", { name: t("new-recipe.recipe-url") }), "https://example.com/pie");
    await user.click(screen.getByRole("checkbox", { name: t("recipe.import-original-keywords-as-tags") }));
    await user.click(screen.getByRole("checkbox", { name: t("recipe.stay-in-edit-mode") }));
    expect(create).toBeEnabled();
    await user.click(create);

    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/html-pie"));
    expect(router.state.location.search).toBe("?edit=true&parse=true");
    expect(mocks.createOneByHtmlOrJson).toHaveBeenCalledWith(
      "<html></html>",
      true,
      false,
      "https://example.com/pie",
      expect.any(Function),
    );
    expect(mocks.refreshTags).toHaveBeenCalled();
  });

  test("shows the error card when the data cannot be imported", async () => {
    mocks.createOneByHtmlOrJson.mockResolvedValue({ response: null, data: null, error: new Error("bad") });
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/html");

    await user.type(screen.getByRole("textbox", { name: t("new-recipe.recipe-html-or-json") }), "garbage");
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    expect(await screen.findByText(t("new-recipe.html-or-json-error-details"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t("new-recipe.recipe-markup-specification") })).toHaveAttribute("href", "https://schema.org/Recipe");
    expect(router.state.location.pathname).toBe("/g/home/r/create/html");
  });

  test("an invalid source URL blocks the import", async () => {
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/html");

    await user.type(screen.getByRole("textbox", { name: t("new-recipe.recipe-html-or-json") }), "<html></html>");
    await user.type(screen.getByRole("textbox", { name: t("new-recipe.recipe-url") }), "nonsense");
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    expect(await screen.findByText(t("validators.invalid-url"))).toBeInTheDocument();
    expect(mocks.createOneByHtmlOrJson).not.toHaveBeenCalled();
  });

  test("the JSON editor switch converts the data and the AI link follows the group settings", async () => {
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/html");
    expect(screen.queryByRole("link", { name: t("recipe.import-with-ai") })).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: t("new-recipe.recipe-html-or-json") }), "[[1]");
    await user.click(screen.getByRole("switch", { name: t("recipe.json-editor") }));
    expect(screen.getByTestId("json-editor")).toHaveTextContent("[1]");

    cleanup();
    mocks.group.aiProviderSettings.aiEnabled = true;
    renderRoutes(routes, "/g/home/r/create/html");
    expect(screen.getByRole("link", { name: t("recipe.import-with-ai") })).toHaveAttribute("href", "/g/home/r/create/ai");
  });
});
