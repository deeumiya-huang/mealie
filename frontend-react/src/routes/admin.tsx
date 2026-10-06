import type { RouteObject } from "react-router";
import { adminOnly, alwaysRevalidate, guard, requireAuth } from "./guards";
import { page, type DomainRoutes } from "./lazy";

// Domain "admin (/admin/**)" (PROCESS.md §1.7). pages/admin.vue is a Nuxt parent whose middleware
// ["auth", "admin-only"] applies to every /admin/** page and which renders only <NuxtPage />.
//
// Route shape: the pages live in three layout groups (Vue `definePageMeta.layout`): `admin` for the
// management/settings pages, `blank` for /admin/setup and `default` for /admin itself (the parent has
// no index child in Nuxt, so it renders with an empty outlet). A layout group is a pathless route of
// its own, so each group gets its own `admin` parent route (loader guard + <Outlet />) holding its
// children with relative paths; the three parents never match the same URL, so exactly one runs.
// Child paths such as "manage/users/create" and "manage/users/:id" are ranked by React Router
// (static segment wins), and the parent's guard is re-run on every navigation inside /admin.
function adminParent(children?: RouteObject[]): RouteObject {
  return {
    path: "admin",
    loader: guard(requireAuth, adminOnly),
    shouldRevalidate: alwaysRevalidate,
    ...page(() => import("@/pages/admin")),
    ...(children ? { children } : {}),
  };
}

export const adminRoutes: DomainRoutes = {
  default: [adminParent()],
  admin: [
    adminParent([
      { path: "backups", ...page(() => import("@/pages/admin/backups")) },
      { path: "debug/openai", ...page(() => import("@/pages/admin/debug/openai")) },
      { path: "debug/parser", ...page(() => import("@/pages/admin/debug/parser")) },
      { path: "maintenance", ...page(() => import("@/pages/admin/maintenance/index")) },
      { path: "manage/groups", ...page(() => import("@/pages/admin/manage/groups/index")) },
      { path: "manage/groups/:id", ...page(() => import("@/pages/admin/manage/groups/[id]")) },
      { path: "manage/households", ...page(() => import("@/pages/admin/manage/households/index")) },
      { path: "manage/households/:id", ...page(() => import("@/pages/admin/manage/households/[id]")) },
      { path: "manage/users", ...page(() => import("@/pages/admin/manage/users/index")) },
      { path: "manage/users/create", ...page(() => import("@/pages/admin/manage/users/create")) },
      { path: "manage/users/:id", ...page(() => import("@/pages/admin/manage/users/[id]")) },
      { path: "site-settings", ...page(() => import("@/pages/admin/site-settings")) },
    ]),
  ],
  blank: [
    // admin/setup.vue has middleware ["admin-only"] of its own on top of the parent's; the parent's
    // guard (auth + admin-only) already covers it.
    adminParent([
      { path: "setup", ...page(() => import("@/pages/admin/setup")) },
    ]),
  ],
};
