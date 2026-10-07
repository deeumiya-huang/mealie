import { cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LocationProbe, renderRoutes } from "@/components/Domain/Recipe/RecipeCreate/test-utils";
import RecipeCreateImagePage from "./image";
import RecipeCreateIndexPage from "./index";

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { groupSlug: "home" } }),
}));

const routes = [
  { path: "/g/:groupSlug/r/create", element: <RecipeCreateIndexPage /> },
  { path: "/g/:groupSlug/r/create/image", element: <RecipeCreateImagePage /> },
  { path: "/g/:groupSlug/r/create/url", element: <LocationProbe /> },
  { path: "/g/:groupSlug/r/create/ai", element: <LocationProbe /> },
];

describe("create page redirects", () => {
  afterEach(() => {
    cleanup();
  });

  test("the index redirects to the URL importer, replacing the history entry", async () => {
    const { router } = renderRoutes(routes, "/g/home/r/create");

    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/create/url"));
    expect(router.state.historyAction).toBe("REPLACE");
  });

  test("the legacy image importer URL redirects to the AI importer", async () => {
    const { router } = renderRoutes(routes, "/g/home/r/create/image");

    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/create/ai"));
    expect(router.state.historyAction).toBe("REPLACE");
  });
});
