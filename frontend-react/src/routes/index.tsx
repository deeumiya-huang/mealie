import { createBrowserRouter, Outlet, type RouteObject } from "react-router";
import { authBackend } from "@/hooks/use-auth-backend";

let authReady: Promise<void> | null = null;

/**
 * Port of plugins/init-auth.client.ts: hydrate the token from the cookie and load the session once,
 * before any route renders, so guards see the real session.
 */
export function initAuth(): Promise<void> {
  authReady ??= (async () => {
    // Must come first: it hydrates the token from the cookie, which getSession checks before it
    // will bother asking the server who we are.
    authBackend.initTokenRefresh();
    await authBackend.getSession();
  })();
  return authReady;
}

// Root of the route tree. Layout groups and domain route files are added in P3-07 (§1.7);
// a route is registered only once its page is ported.
export const routes: RouteObject[] = [
  {
    id: "root",
    path: "/",
    loader: async () => {
      await initAuth();
      return null;
    },
    shouldRevalidate: () => false,
    HydrateFallback: () => null,
    element: <Outlet />,
    children: [],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
