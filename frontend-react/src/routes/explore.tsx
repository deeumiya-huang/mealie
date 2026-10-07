import { alwaysRevalidate, guard, groupOnly, requireAuth } from "./guards";
import { page, type DomainRoutes } from "./lazy";

// Domain "explore (/g/:groupSlug, cookbooks, organizers, finder, timeline)" (PROCESS.md §1.7). All pages use layout
// `default`. The explorer (`g/:groupSlug`), a single cookbook and the recipe finder have no middleware (public);
// the others have middleware ["auth", "group-only"]. `g/:groupSlug/r/**` and `g/:groupSlug/shared/**` belong to the
// recipe-page / recipe-create domains.
export const exploreRoutes: DomainRoutes = {
  default: [
    {
      path: "g/:groupSlug",
      ...page(() => import("@/pages/g/[groupSlug]/index")),
    },
    {
      path: "g/:groupSlug/cookbooks",
      loader: guard(requireAuth, groupOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/g/[groupSlug]/cookbooks/index")),
    },
    {
      path: "g/:groupSlug/cookbooks/:slug",
      ...page(() => import("@/pages/g/[groupSlug]/cookbooks/[slug]")),
    },
    {
      path: "g/:groupSlug/recipes/categories",
      loader: guard(requireAuth, groupOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/g/[groupSlug]/recipes/categories/index")),
    },
    {
      path: "g/:groupSlug/recipes/tags",
      loader: guard(requireAuth, groupOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/g/[groupSlug]/recipes/tags/index")),
    },
    {
      path: "g/:groupSlug/recipes/tools",
      loader: guard(requireAuth, groupOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/g/[groupSlug]/recipes/tools/index")),
    },
    {
      path: "g/:groupSlug/recipes/finder",
      ...page(() => import("@/pages/g/[groupSlug]/recipes/finder/index")),
    },
    {
      path: "g/:groupSlug/recipes/timeline",
      loader: guard(requireAuth, groupOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/g/[groupSlug]/recipes/timeline")),
    },
  ],
};
