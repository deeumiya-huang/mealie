import type { ReactNode } from "react";
import { createBrowserRouter, Outlet, type RouteObject } from "react-router";
import { adminRoutes } from "./admin";
import { authRoutes } from "./auth";
import { exploreRoutes } from "./explore";
import { groupRoutes } from "./group";
import { guard, initAuth, pwaShareTargetRedirect } from "./guards";
import { householdRoutes } from "./household";
import type { DomainRoutes } from "./lazy";
import { recipeCreateRoutes } from "./recipe-create";
import { recipePageRoutes } from "./recipe-page";
import { shoppingRoutes } from "./shopping";
import { userRoutes } from "./user";
import AdminLayout from "@/layouts/AdminLayout";
import BasicLayout from "@/layouts/BasicLayout";
import BlankLayout from "@/layouts/BlankLayout";
import DefaultLayout from "@/layouts/DefaultLayout";
import ErrorPage from "@/layouts/ErrorPage";

// plugins/init-auth.client.ts lives in guards.ts (every guarded loader awaits it); re-exported here.
export { initAuth };

const domains: DomainRoutes[] = [
  authRoutes,
  adminRoutes,
  groupRoutes,
  householdRoutes,
  shoppingRoutes,
  userRoutes,
  exploreRoutes,
  recipePageRoutes,
  recipeCreateRoutes,
];

/** A layout route with the pages of every domain using it; none when no page uses it yet (a childless
 * pathless route would match "/" by itself). */
function layout(id: string, element: ReactNode, name: keyof DomainRoutes): RouteObject[] {
  const children = domains.flatMap(domain => domain[name] ?? []);
  return children.length ? [{ id, element, children }] : [];
}

/**
 * The route tree (PROCESS.md §1.7): the root loader waits for auth (port of the auth plugin) and applies
 * the global `pwa-share-target-redirect` middleware; each layout is a pathless route whose children are
 * the pages using it. Unknown URLs and errors render the error page (Vue layouts/error.vue).
 */
export const routes: RouteObject[] = [
  {
    id: "root",
    path: "/",
    loader: guard(pwaShareTargetRedirect),
    shouldRevalidate: ({ nextUrl }) => nextUrl.pathname === "/r/create/url",
    HydrateFallback: () => null,
    element: <Outlet />,
    errorElement: <ErrorPage />,
    children: [
      ...layout("layout-default", <DefaultLayout />, "default"),
      ...layout("layout-admin", <AdminLayout />, "admin"),
      ...layout("layout-basic", <BasicLayout />, "basic"),
      ...layout("layout-blank", <BlankLayout />, "blank"),
      { path: "*", element: <ErrorPage /> },
    ],
  },
];

// Vite `base` (from SUB_PATH, see vite.config.ts) without its trailing slash, like Nuxt's router base.
export const routerBasename = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";

export function createRouter() {
  return createBrowserRouter(routes, { basename: routerBasename });
}
