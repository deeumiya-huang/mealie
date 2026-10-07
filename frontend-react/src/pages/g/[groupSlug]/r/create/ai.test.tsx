import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { recipePageRoute, renderRoutes } from "@/components/Domain/Recipe/RecipeCreate/test-utils";
import { getStorageStore } from "@/hooks/utils/use-storage";
import { stubI18n } from "@/test/utils";
import RecipeCreateAiPage from "./ai";

const mocks = vi.hoisted(() => ({
  createOneWithAI: vi.fn(),
  refreshTags: vi.fn(),
  group: { aiProviderSettings: { aiEnabled: true, imageProviderEnabled: false, audioProviderEnabled: false } },
}));

vi.mock("@/hooks/api", () => {
  const api = { recipes: { createOneWithAI: mocks.createOneWithAI } };
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
  { path: "/g/:groupSlug/r/create/ai", element: <RecipeCreateAiPage /> },
  { path: "/g/:groupSlug/r/create/url", element: <div>url importer</div> },
  recipePageRoute,
];

describe("import recipe with AI page", () => {
  beforeEach(() => {
    mocks.group.aiProviderSettings.aiEnabled = true;
    mocks.group.aiProviderSettings.imageProviderEnabled = false;
    mocks.group.aiProviderSettings.audioProviderEnabled = false;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    preferences.set(defaults);
  });

  test("asks for an AI provider when AI is not enabled", () => {
    mocks.group.aiProviderSettings.aiEnabled = false;
    renderRoutes(routes, "/g/home/r/create/ai");

    expect(screen.getByText(t("recipe.import-with-ai-provider-required"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("general.create") })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: t("recipe.import-with-ai-content") })).not.toBeInTheDocument();
  });

  test("needs a source before the recipe can be created", async () => {
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/ai");

    const create = screen.getByRole("button", { name: t("general.create") });
    expect(create).toBeDisabled();
    expect(screen.getByRole("link", { name: t("recipe.import-with-ai-use-url-import") })).toHaveAttribute("href", "/g/home/r/create/url");
    expect(screen.getByText(t("recipe.import-with-ai-image-provider-required"))).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: t("recipe.import-with-ai-content") }), "2 eggs");
    expect(create).toBeEnabled();
  });

  test("creates the recipe from the content and opens it", async () => {
    mocks.createOneWithAI.mockResolvedValue({ response: null, data: "omelette", error: null });
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/ai");

    await user.type(screen.getByRole("textbox", { name: t("recipe.import-with-ai-content") }), "2 eggs");
    await user.click(screen.getByRole("checkbox", { name: t("recipe.should-translate-description") }));
    await user.click(screen.getByRole("checkbox", { name: t("recipe.create-new-organizers") }));
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/omelette"));
    expect(router.state.location.search).toBe("?parse=true");
    expect(mocks.createOneWithAI).toHaveBeenCalledWith(
      { content: "2 eggs", url: null, images: [], translateLanguage: "en-US", createNewOrganizers: true },
      expect.any(Function),
    );
    expect(mocks.refreshTags).toHaveBeenCalled();
  });

  test("a URL alone is a source, and an invalid one blocks the submit", async () => {
    mocks.createOneWithAI.mockResolvedValue({ response: null, data: "pie", error: null });
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/ai");

    await user.type(screen.getByRole("textbox", { name: t("new-recipe.recipe-url") }), "nonsense");
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    expect(await screen.findByText(t("validators.invalid-url"))).toBeInTheDocument();
    expect(mocks.createOneWithAI).not.toHaveBeenCalled();
  });

  test("shows the error message of a failed import", async () => {
    mocks.createOneWithAI.mockResolvedValue({ response: null, data: null, error: new Error("provider unavailable") });
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/ai");

    await user.type(screen.getByRole("textbox", { name: t("recipe.import-with-ai-content") }), "2 eggs");
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    expect(await screen.findByText("provider unavailable")).toBeInTheDocument();
    expect(screen.getByText(t("new-recipe.error-title"))).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/g/home/r/create/ai");
  });

  test("falls back to the generic error text without an error message", async () => {
    mocks.createOneWithAI.mockResolvedValue({ response: null, data: null, error: null });
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/ai");

    await user.type(screen.getByRole("textbox", { name: t("recipe.import-with-ai-content") }), "2 eggs");
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    expect(await screen.findByText(t("recipe.import-with-ai-error-details"))).toBeInTheDocument();
  });

  test("the JSON editor switch converts the content both ways", async () => {
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/ai");

    await user.type(screen.getByRole("textbox", { name: t("recipe.import-with-ai-content") }), "plain text");
    await user.click(screen.getByRole("switch", { name: t("recipe.json-editor") }));
    expect(screen.getByTestId("json-editor")).toHaveTextContent("{\"data\":\"plain text\"}");

    await user.click(screen.getByRole("switch", { name: t("recipe.json-editor") }));
    expect(screen.getByRole("textbox", { name: t("recipe.import-with-ai-content") })).toHaveValue("{\"data\":\"plain text\"}");
  });

  test("offers the image upload and the video hint when those providers are enabled", () => {
    mocks.group.aiProviderSettings.imageProviderEnabled = true;
    mocks.group.aiProviderSettings.audioProviderEnabled = true;
    renderRoutes(routes, "/g/home/r/create/ai");

    expect(screen.getByRole("button", { name: t("recipe.upload-images") })).toBeInTheDocument();
    expect(screen.getByText(t("recipe.import-with-ai-video-description"))).toBeInTheDocument();
    expect(screen.queryByText(t("recipe.import-with-ai-image-provider-required"))).not.toBeInTheDocument();
  });
});
