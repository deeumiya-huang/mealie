import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { LocationProbe, recipePageRoute, renderRoutes } from "@/components/Domain/Recipe/RecipeCreate/test-utils";
import { stubI18n } from "@/test/utils";
import RecipeCreateUrlPage from "./url";

const mocks = vi.hoisted(() => ({
  createOneByUrl: vi.fn(),
  refreshTags: vi.fn(),
  group: { aiProviderSettings: { aiEnabled: false, audioProviderEnabled: false } },
}));

vi.mock("@/hooks/api", () => {
  const api = { recipes: { createOneByUrl: mocks.createOneByUrl } };
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

const { t } = stubI18n();

const routes = [
  { path: "/g/:groupSlug/r/create/url", element: <RecipeCreateUrlPage /> },
  { path: "/g/:groupSlug/r/create/bulk", element: <LocationProbe /> },
  recipePageRoute,
];

describe("scrape recipe by URL page", () => {
  beforeEach(() => {
    mocks.group.aiProviderSettings.aiEnabled = false;
    mocks.group.aiProviderSettings.audioProviderEnabled = false;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("pre-fills the URL from the share query and creates the recipe", async () => {
    mocks.createOneByUrl.mockResolvedValue({ response: { status: 201, data: "pie" }, data: "pie", error: null });
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/url?recipe_import_url=https%3A%2F%2Fexample.com%2Fpie");

    expect(screen.getByRole("textbox", { name: t("new-recipe.recipe-url") })).toHaveValue("https://example.com/pie");
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/pie"));
    expect(mocks.createOneByUrl).toHaveBeenCalledWith("https://example.com/pie", false, false, expect.any(Function));
    // the ingredients are parsed after import by default, and the page is left without re-importing on "back"
    expect(router.state.location.search).toBe("?parse=true");
    await router.navigate(-1);
    expect(router.state.location.pathname).toBe("/g/home/r/create/url");
    expect(router.state.location.search).toBe("");
  });

  test("uses the shared text as the URL when it is a valid http(s) URL only", () => {
    renderRoutes(routes, "/g/home/r/create/url?recipe_import_text=not%20a%20url");
    expect(screen.getByRole("textbox", { name: t("new-recipe.recipe-url") })).toHaveValue("");
    expect(screen.getByRole("button", { name: t("general.create") })).toBeDisabled();
    cleanup();

    renderRoutes(routes, "/g/home/r/create/url?recipe_import_text=https%3A%2F%2Fexample.com%2Ftext");
    expect(screen.getByRole("textbox", { name: t("new-recipe.recipe-url") })).toHaveValue("https://example.com/text");
  });

  test("writes the typed URL to the query and enables the create button", async () => {
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/url");

    const create = screen.getByRole("button", { name: t("general.create") });
    expect(create).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: t("new-recipe.recipe-url") }), "https://example.com/a");

    expect(create).toBeEnabled();
    await waitFor(() => expect(router.state.location.search).toBe("?recipe_import_url=https%3A%2F%2Fexample.com%2Fa"));
  });

  test("shows the error card with the other importers when the import fails", async () => {
    mocks.group.aiProviderSettings.aiEnabled = true;
    mocks.createOneByUrl.mockResolvedValue({ response: null, data: null, error: new Error("failed") });
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/url?recipe_import_url=https%3A%2F%2Fexample.com%2Fbroken");

    expect(screen.queryByText(t("new-recipe.error-title"))).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    expect(await screen.findByText(t("new-recipe.error-title"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t("recipe.scrape-recipe-try-importing-raw-html-instead") })).toHaveAttribute("href", "/g/home/r/create/html");
    expect(screen.getAllByRole("link", { name: t("recipe.import-with-ai") })).toHaveLength(2);
    expect(screen.getByRole("link", { name: t("new-recipe.github-issues") })).toHaveAttribute("href", "https://github.com/mealie-recipes/mealie/issues");
  });

  test("links to the bulk importer and drops the import query when leaving the page", async () => {
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/url?recipe_import_url=https%3A%2F%2Fexample.com%2Fa");

    await user.click(screen.getByRole("link", { name: t("recipe.scrape-recipe-suggest-bulk-importer") }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/create/bulk"));
    await router.navigate(-1);
    expect(router.state.location.pathname).toBe("/g/home/r/create/url");
    expect(router.state.location.search).toBe("");
  });

  test("shows the AI importer link and the transcription hint only for groups with those providers", () => {
    renderRoutes(routes, "/g/home/r/create/url");
    expect(screen.queryByRole("link", { name: t("recipe.import-with-ai") })).not.toBeInTheDocument();
    expect(screen.queryByText(t("recipe.scrape-recipe-description-transcription"))).not.toBeInTheDocument();
    cleanup();

    mocks.group.aiProviderSettings.aiEnabled = true;
    mocks.group.aiProviderSettings.audioProviderEnabled = true;
    renderRoutes(routes, "/g/home/r/create/url");
    expect(screen.getByRole("link", { name: t("recipe.import-with-ai") })).toHaveAttribute("href", "/g/home/r/create/ai");
    expect(screen.getByText(t("recipe.scrape-recipe-description-transcription"))).toBeInTheDocument();
  });
});
