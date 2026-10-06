import { advancedOnly, alwaysRevalidate, canManageOnly, canOrganizeOnly, guard, requireAuth } from "./guards";
import { page, type DomainRoutes } from "./lazy";

// Domain "group (/group/**)" (PROCESS.md §1.7): group/index, group/migrations, group/reports/[id], group/data
// (a Nuxt parent that renders <NuxtPage />) and its children index (redirect to foods), foods, units, labels,
// categories, tags, tools, recipes, recipe-actions. No Vue page sets a layout, so all of them use `default`.
// Middleware: group → ["auth", "can-manage-only"], migrations → ["auth", "advanced-only"],
// reports/[id] → ["auth"], data (and thus every child) → ["auth", "can-organize-only"].
export const groupRoutes: DomainRoutes = {
  default: [
    {
      path: "group",
      loader: guard(requireAuth, canManageOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/group/index")),
    },
    {
      path: "group/migrations",
      loader: guard(requireAuth, advancedOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/group/migrations")),
    },
    {
      path: "group/reports/:id",
      loader: guard(requireAuth),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/group/reports/[id]")),
    },
    {
      path: "group/data",
      loader: guard(requireAuth, canOrganizeOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/group/data")),
      children: [
        { index: true, ...page(() => import("@/pages/group/data/index")) },
        { path: "foods", ...page(() => import("@/pages/group/data/foods")) },
        { path: "units", ...page(() => import("@/pages/group/data/units")) },
        { path: "labels", ...page(() => import("@/pages/group/data/labels")) },
        { path: "categories", ...page(() => import("@/pages/group/data/categories")) },
        { path: "tags", ...page(() => import("@/pages/group/data/tags")) },
        { path: "tools", ...page(() => import("@/pages/group/data/tools")) },
        { path: "recipes", ...page(() => import("@/pages/group/data/recipes")) },
        { path: "recipe-actions", ...page(() => import("@/pages/group/data/recipe-actions")) },
      ],
    },
  ],
};
