import type { ComponentType } from "react";
import { redirect } from "react-router";
import type { LoaderFunctionArgs, RouteObject } from "react-router";
import RouteErrorBoundary, { ErrorPage } from "~/layouts/error";
import * as mw from "./middleware";
import type { RouteMiddleware } from "./middleware";

type Layout = "default" | "admin" | "basic" | "blank";
type PageModule = { default: ComponentType };

/**
 * Page modules, laid out exactly like frontend/app/pages (Nuxt file-based routing), loaded lazily so
 * each page is its own chunk.
 */
const pageModules = import.meta.glob<PageModule>(["../pages/**/*.tsx", "!../pages/**/*.test.tsx"]);

export function pageFile(file: string): string {
  return `../pages/${file}.tsx`;
}

/** Runs middleware in order (like Nuxt) and turns the first redirect into a router redirect. */
function guard(middleware: RouteMiddleware[]) {
  return ({ request, params }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const to = { path: url.pathname, fullPath: url.pathname + url.search + url.hash, params };
    for (const run of middleware) {
      const target = run(to);
      if (target) {
        throw redirect(mw.toHref(target));
      }
    }
    return null;
  };
}

interface PageRoute {
  /** Route path, relative to the layout (Nuxt: derived from the file name). */
  path?: string;
  index?: boolean;
  /** File under src/pages, without extension (mirrors frontend/app/pages/*.vue). */
  file: string;
  middleware?: RouteMiddleware[];
  children?: PageRoute[];
}

function toRoute({ path, index, file, middleware, children }: PageRoute): RouteObject {
  const load = pageModules[pageFile(file)];
  if (!load) {
    throw new Error(`Missing page module ${file}`);
  }
  const shared = {
    loader: middleware?.length ? guard(middleware) : undefined,
    lazy: async () => ({ Component: (await load()).default }),
  };
  if (index) {
    return { index: true, ...shared };
  }
  return { path, ...shared, children: children?.map(toRoute) };
}

const { auth, adminOnly, advancedOnly, canManageHouseholdOnly, canManageOnly, canOrganizeOnly, groupOnly } = mw;

/** Every page, grouped by the layout its `definePageMeta` selected. */
export const PAGES: Record<Layout, PageRoute[]> = {
  default: [
    // admin.vue applied ["auth", "admin-only"] to every /admin page; those are repeated on each below
    { path: "admin", file: "admin", middleware: [auth, adminOnly] },
    { path: "g/:groupSlug", file: "g/[groupSlug]/index" },
    { path: "g/:groupSlug/cookbooks", file: "g/[groupSlug]/cookbooks/index", middleware: [auth, groupOnly] },
    { path: "g/:groupSlug/cookbooks/:slug", file: "g/[groupSlug]/cookbooks/[slug]" },
    { path: "g/:groupSlug/r/:slug", file: "g/[groupSlug]/r/[slug]/index" },
    {
      path: "g/:groupSlug/r/create",
      file: "g/[groupSlug]/r/create",
      middleware: [auth, groupOnly],
      children: [
        { index: true, file: "g/[groupSlug]/r/create/index" },
        { path: "ai", file: "g/[groupSlug]/r/create/ai" },
        { path: "bulk", file: "g/[groupSlug]/r/create/bulk" },
        { path: "debug", file: "g/[groupSlug]/r/create/debug" },
        { path: "html", file: "g/[groupSlug]/r/create/html" },
        { path: "image", file: "g/[groupSlug]/r/create/image" },
        { path: "new", file: "g/[groupSlug]/r/create/new" },
        { path: "url", file: "g/[groupSlug]/r/create/url" },
        { path: "zip", file: "g/[groupSlug]/r/create/zip" },
      ],
    },
    { path: "g/:groupSlug/recipes/categories", file: "g/[groupSlug]/recipes/categories/index", middleware: [auth, groupOnly] },
    { path: "g/:groupSlug/recipes/finder", file: "g/[groupSlug]/recipes/finder/index" },
    { path: "g/:groupSlug/recipes/tags", file: "g/[groupSlug]/recipes/tags/index", middleware: [auth, groupOnly] },
    { path: "g/:groupSlug/recipes/timeline", file: "g/[groupSlug]/recipes/timeline", middleware: [auth, groupOnly] },
    { path: "g/:groupSlug/recipes/tools", file: "g/[groupSlug]/recipes/tools/index", middleware: [auth, groupOnly] },
    {
      path: "group/data",
      file: "group/data",
      middleware: [auth, canOrganizeOnly],
      children: [
        { index: true, file: "group/data/index" },
        { path: "categories", file: "group/data/categories" },
        { path: "foods", file: "group/data/foods" },
        { path: "labels", file: "group/data/labels" },
        { path: "recipe-actions", file: "group/data/recipe-actions" },
        { path: "recipes", file: "group/data/recipes" },
        { path: "tags", file: "group/data/tags" },
        { path: "tools", file: "group/data/tools" },
        { path: "units", file: "group/data/units" },
      ],
    },
    { path: "group", file: "group/index", middleware: [auth, canManageOnly] },
    { path: "group/migrations", file: "group/migrations", middleware: [auth, advancedOnly] },
    { path: "group/reports/:id", file: "group/reports/[id]", middleware: [auth] },
    { path: "household", file: "household/index", middleware: [auth, canManageHouseholdOnly] },
    {
      path: "household/mealplan/planner",
      file: "household/mealplan/planner",
      middleware: [auth],
      children: [
        { path: "edit", file: "household/mealplan/planner/edit" },
        { path: "view", file: "household/mealplan/planner/view" },
      ],
    },
    { path: "household/mealplan/settings", file: "household/mealplan/settings", middleware: [auth] },
    { path: "household/members", file: "household/members", middleware: [auth] },
    { path: "household/notifiers", file: "household/notifiers", middleware: [auth, advancedOnly] },
    { path: "household/webhooks", file: "household/webhooks", middleware: [auth, advancedOnly] },
    { path: "shopping-lists", file: "shopping-lists/index", middleware: [auth] },
    { path: "shopping-lists/:id", file: "shopping-lists/[id]", middleware: [auth] },
    { path: "user/:id/favorites", file: "user/[id]/favorites", middleware: [auth] },
    { path: "user/profile", file: "user/profile/index", middleware: [auth] },
    { path: "user/profile/api-tokens", file: "user/profile/api-tokens", middleware: [auth, advancedOnly] },
    { path: "user/profile/edit", file: "user/profile/edit", middleware: [auth] },
  ],
  admin: [
    { path: "admin/backups", file: "admin/backups", middleware: [auth, adminOnly] },
    { path: "admin/debug/openai", file: "admin/debug/openai", middleware: [auth, adminOnly] },
    { path: "admin/debug/parser", file: "admin/debug/parser", middleware: [auth, adminOnly] },
    { path: "admin/maintenance", file: "admin/maintenance/index", middleware: [auth, adminOnly] },
    { path: "admin/manage/groups", file: "admin/manage/groups/index", middleware: [auth, adminOnly] },
    { path: "admin/manage/groups/:id", file: "admin/manage/groups/[id]", middleware: [auth, adminOnly] },
    { path: "admin/manage/households", file: "admin/manage/households/index", middleware: [auth, adminOnly] },
    { path: "admin/manage/households/:id", file: "admin/manage/households/[id]", middleware: [auth, adminOnly] },
    { path: "admin/manage/users", file: "admin/manage/users/index", middleware: [auth, adminOnly] },
    { path: "admin/manage/users/create", file: "admin/manage/users/create", middleware: [auth, adminOnly] },
    { path: "admin/manage/users/:id", file: "admin/manage/users/[id]", middleware: [auth, adminOnly] },
    { path: "admin/site-settings", file: "admin/site-settings", middleware: [auth, adminOnly] },
  ],
  basic: [
    { path: "forgot-password", file: "forgot-password" },
    { path: "reset-password", file: "reset-password" },
    { path: "g/:groupSlug/shared/r/:id", file: "g/[groupSlug]/shared/r/[id]" },
  ],
  blank: [
    { index: true, file: "index" },
    { path: "login", file: "login" },
    { path: "register", file: "register/index" },
    { path: "admin/setup", file: "admin/setup", middleware: [auth, adminOnly] },
  ],
};

const LAYOUTS: Record<Layout, () => Promise<{ default: ComponentType }>> = {
  default: () => import("~/layouts/default"),
  admin: () => import("~/layouts/admin"),
  basic: () => import("~/layouts/basic"),
  blank: () => import("~/layouts/blank"),
};

export function buildRoutes(): RouteObject[] {
  return [
    {
      path: "/",
      errorElement: <RouteErrorBoundary />,
      // Global middleware (pwa-share-target-redirect.global.ts)
      loader: guard([mw.pwaShareTargetRedirect]),
      shouldRevalidate: () => true,
      children: [
        ...(Object.keys(PAGES) as Layout[]).map(layout => ({
          lazy: async () => ({ Component: (await LAYOUTS[layout]()).default }),
          children: PAGES[layout].map(toRoute),
        })),
        { path: "*", element: <ErrorPage statusCode={404} /> },
      ],
    },
  ];
}
