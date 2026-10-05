import type { DomainRoutes } from "./lazy";

// Domain "shopping (/shopping-lists/**)" (PROCESS.md §1.7). Routes are added by the step that ports the
// domain's pages; until then its URLs fall through to the 404 page.
export const shoppingRoutes: DomainRoutes = {};
