/* eslint-disable react-refresh/only-export-components -- a test helper, never hot-reloaded */
// Test helper for the recipe-create pages: renders routes in a data router (the pages use useBlocker / navigate()
// promises, which need one) inside the MUI theme and shows where the router ended up.
import { render } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { createMemoryRouter, RouterProvider, useLocation, type RouteObject } from "react-router";
import { buildTheme } from "@/providers/theme";

export function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

/** A page for the URL a created recipe navigates to. */
export const recipePageRoute: RouteObject = { path: "/g/:groupSlug/r/:slug", element: <LocationProbe /> };

export function renderRoutes(routes: RouteObject[], initialEntry: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  const result = render(
    <ThemeProvider theme={buildTheme(false)}>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
  return { router, ...result };
}
