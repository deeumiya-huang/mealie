import { alwaysRevalidate, groupOnly, guard, requireAuth } from "./guards";
import { page, type DomainRoutes } from "./lazy";

// Domain "recipe-create (/g/:groupSlug/r/create/**)" (PROCESS.md §1.7): create (a Nuxt parent rendering <NuxtPage />
// under the shared "Recipe Creation" header) and its children index (redirect to url), url, ai, bulk, html, zip, new,
// debug and image (redirect to ai). No Vue page sets a layout, so all of them use `default`.
// create.vue has middleware ["auth", "group-only"], which applies to every child as in Nuxt.
export const recipeCreateRoutes: DomainRoutes = {
  default: [
    {
      path: "g/:groupSlug/r/create",
      loader: guard(requireAuth, groupOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/g/[groupSlug]/r/create")),
      children: [
        { index: true, ...page(() => import("@/pages/g/[groupSlug]/r/create/index")) },
        { path: "url", ...page(() => import("@/pages/g/[groupSlug]/r/create/url")) },
        { path: "ai", ...page(() => import("@/pages/g/[groupSlug]/r/create/ai")) },
        { path: "bulk", ...page(() => import("@/pages/g/[groupSlug]/r/create/bulk")) },
        { path: "html", ...page(() => import("@/pages/g/[groupSlug]/r/create/html")) },
        { path: "zip", ...page(() => import("@/pages/g/[groupSlug]/r/create/zip")) },
        { path: "new", ...page(() => import("@/pages/g/[groupSlug]/r/create/new")) },
        { path: "debug", ...page(() => import("@/pages/g/[groupSlug]/r/create/debug")) },
        { path: "image", ...page(() => import("@/pages/g/[groupSlug]/r/create/image")) },
      ],
    },
  ],
};
