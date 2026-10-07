import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderRoutes } from "@/components/Domain/Recipe/RecipeCreate/test-utils";
import { stubI18n } from "@/test/utils";
import RecipeCreateDebugPage from "./debug";

const mocks = vi.hoisted(() => ({
  testCreateOneUrl: vi.fn(),
  group: { aiProviderSettings: { aiEnabled: false } },
}));

vi.mock("@/hooks/api", () => {
  const api = { recipes: { testCreateOneUrl: mocks.testCreateOneUrl } };
  return { useUserApi: () => api };
});

vi.mock("@/hooks/use-groups", () => ({
  useGroupSelf: () => ({ group: mocks.group, actions: {} }),
}));

// The JSON editor (vanilla-jsoneditor) needs a real browser; the stand-in shows its value and mode.
vi.mock("@/components/global/RecipeJsonEditor", () => ({
  RecipeJsonEditor: ({ value, mode }: { value: object; mode: string }) => (
    <pre data-testid="json-editor" data-mode={mode}>{JSON.stringify(value)}</pre>
  ),
}));

const { t } = stubI18n();

const routes = [{ path: "/g/:groupSlug/r/create/debug", element: <RecipeCreateDebugPage /> }];

describe("recipe debugger page", () => {
  beforeEach(() => {
    mocks.group.aiProviderSettings.aiEnabled = false;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("scrapes the URL and shows the result in a read-only editor that can switch to the tree view", async () => {
    mocks.testCreateOneUrl.mockResolvedValue({ data: { name: "Scraped" } });
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/debug");

    expect(screen.getByText(t("recipe.recipe-debugger"))).toBeInTheDocument();
    const debug = screen.getByRole("button", { name: t("recipe.debug") });
    expect(debug).toBeDisabled();
    expect(screen.queryByTestId("json-editor")).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: t("new-recipe.recipe-url") }), "https://example.com/pie");
    expect(debug).toBeEnabled();
    await waitFor(() => expect(router.state.location.search).toBe("?recipe_import_url=https%3A%2F%2Fexample.com%2Fpie"));
    await user.click(debug);

    expect(await screen.findByTestId("json-editor")).toHaveTextContent("{\"name\":\"Scraped\"}");
    expect(mocks.testCreateOneUrl).toHaveBeenCalledWith("https://example.com/pie", false);
    expect(screen.getByTestId("json-editor")).toHaveAttribute("data-mode", "text");

    await user.click(screen.getByRole("checkbox", { name: t("recipe.tree-view") }));
    expect(screen.getByTestId("json-editor")).toHaveAttribute("data-mode", "tree");
  });

  test("starts with the URL of the query and offers OpenAI only when AI is enabled", async () => {
    mocks.group.aiProviderSettings.aiEnabled = true;
    mocks.testCreateOneUrl.mockResolvedValue({ data: { name: "Scraped" } });
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/debug?recipe_import_url=https%3A%2F%2Fexample.com%2Fa");

    expect(screen.getByRole("textbox", { name: t("new-recipe.recipe-url") })).toHaveValue("https://example.com/a");
    await user.click(screen.getByRole("checkbox", { name: t("recipe.use-openai") }));
    await user.click(screen.getByRole("button", { name: t("recipe.debug") }));

    await waitFor(() => expect(mocks.testCreateOneUrl).toHaveBeenCalledWith("https://example.com/a", true));
  });

  test("hides the OpenAI option when AI is not enabled", () => {
    renderRoutes(routes, "/g/home/r/create/debug");
    expect(screen.queryByRole("checkbox", { name: t("recipe.use-openai") })).not.toBeInTheDocument();
  });
});
