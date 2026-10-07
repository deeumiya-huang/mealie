import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { LocationProbe, renderRoutes } from "@/components/Domain/Recipe/RecipeCreate/test-utils";
import { stubI18n } from "@/test/utils";
import RecipeCreatePage from "./create";

const mocks = vi.hoisted(() => ({
  user: { groupSlug: "home", advanced: false } as { groupSlug: string; advanced: boolean },
  group: { aiProviderSettings: { aiEnabled: false } } as { aiProviderSettings: { aiEnabled: boolean } },
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: mocks.user }),
}));

vi.mock("@/hooks/use-groups", () => ({
  useGroupSelf: () => ({ group: mocks.group, actions: {} }),
}));

const { t } = stubI18n();

const routes = [
  {
    path: "/g/:groupSlug/r/create",
    element: <RecipeCreatePage />,
    children: [{ path: ":importer", element: <LocationProbe /> }],
  },
];

async function openImporterMenu(user: ReturnType<typeof userEvent.setup>, current: string) {
  await user.click(screen.getByRole("button", { name: current }));
}

describe("recipe creation page", () => {
  beforeEach(() => {
    mocks.user.advanced = false;
    mocks.group.aiProviderSettings.aiEnabled = false;
  });

  afterEach(() => {
    cleanup();
  });

  test("shows the title, the description and the importer of the current URL", () => {
    renderRoutes(routes, "/g/home/r/create/new");

    expect(screen.getByRole("heading", { name: t("recipe.recipe-creation") })).toBeInTheDocument();
    expect(screen.getByText(t("recipe.select-one-of-the-various-ways-to-create-a-recipe"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("recipe.create-recipe") })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/g/home/r/create/new");
  });

  test("lists the importers without the AI importer when AI is not enabled", async () => {
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/url");

    await openImporterMenu(user, t("recipe.import-with-url"));

    for (const text of [
      t("recipe.import-with-url"),
      t("recipe.bulk-url-import"),
      t("recipe.import-from-html-or-json"),
      t("recipe.create-recipe"),
      t("recipe.import-with-zip"),
      t("recipe.debug-scraper"),
    ]) {
      expect(screen.getByRole("menuitem", { name: text })).toBeInTheDocument();
    }
    expect(screen.queryByRole("menuitem", { name: t("recipe.import-with-ai") })).not.toBeInTheDocument();
  });

  test("lists the AI importer when AI is enabled and navigates to a chosen importer keeping the query", async () => {
    mocks.group.aiProviderSettings.aiEnabled = true;
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/url?recipe_import_url=https%3A%2F%2Fexample.com");

    await openImporterMenu(user, t("recipe.import-with-url"));
    await user.click(screen.getByRole("menuitem", { name: t("recipe.import-with-ai") }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/create/ai"));
    expect(router.state.location.search).toBe("?recipe_import_url=https%3A%2F%2Fexample.com");
    expect(screen.getByRole("button", { name: t("recipe.import-with-ai") })).toBeInTheDocument();
  });

  test("links to the migrations page for users with advanced options only", () => {
    const { unmount } = renderRoutes(routes, "/g/home/r/create/url");
    expect(screen.queryByRole("link", { name: t("recipe.looking-for-migrations") })).not.toBeInTheDocument();
    unmount();

    mocks.user.advanced = true;
    renderRoutes(routes, "/g/home/r/create/url");
    expect(screen.getByRole("link", { name: t("recipe.looking-for-migrations") })).toHaveAttribute("href", "/group/migrations");
  });
});
