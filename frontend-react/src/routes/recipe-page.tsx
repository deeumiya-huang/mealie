import type { DomainRoutes } from "./lazy";

// Domain "recipe-page (/g/:groupSlug/r/:slug, shared recipes)" (PROCESS.md §1.7). Routes are added by the step that ports the
// domain's pages; until then its URLs fall through to the 404 page.
export const recipePageRoutes: DomainRoutes = {};
