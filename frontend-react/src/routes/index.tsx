import { createBrowserRouter, Outlet, type RouteObject } from "react-router";

// Root of the route tree. Layout groups and domain route files are added in P3-07 (§1.7);
// a route is registered only once its page is ported.
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Outlet />,
    children: [],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
