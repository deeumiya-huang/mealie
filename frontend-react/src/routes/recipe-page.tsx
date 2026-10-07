import { page, type DomainRoutes } from "./lazy";

// Domain "recipe-page (/g/:groupSlug/r/:slug, shared recipes)" (PROCESS.md §1.7). Neither Vue page has middleware:
// a recipe is viewable logged out (the page picks the user or the public API itself) and a shared recipe needs no
// login. `r/[slug]` has no layout (→ default); `shared/r/[id]` uses layout "basic". The root loader has already waited
// for the auth session. `g/:groupSlug/r/create` (recipe-create) is a static segment, so it outranks `r/:slug`.
export const recipePageRoutes: DomainRoutes = {
  default: [
    {
      path: "g/:groupSlug/r/:slug",
      ...page(() => import("@/pages/g/[groupSlug]/r/[slug]/index")),
    },
  ],
  basic: [
    {
      path: "g/:groupSlug/shared/r/:id",
      ...page(() => import("@/pages/g/[groupSlug]/shared/r/[id]")),
    },
  ],
};
