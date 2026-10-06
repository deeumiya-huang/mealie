import { advancedOnly, alwaysRevalidate, guard, requireAuth } from "./guards";
import { page, type DomainRoutes } from "./lazy";

// Domain "user (/user/**)" (PROCESS.md §1.7): profile, profile/edit, profile/api-tokens, [id]/favorites.
// Layout `default` for all four (none of the Vue pages sets a layout).
export const userRoutes: DomainRoutes = {
  default: [
    {
      path: "user/profile",
      loader: guard(requireAuth),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/user/profile/index")),
    },
    {
      path: "user/profile/edit",
      loader: guard(requireAuth),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/user/profile/edit")),
    },
    {
      path: "user/profile/api-tokens",
      loader: guard(requireAuth, advancedOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/user/profile/api-tokens")),
    },
    {
      path: "user/:id/favorites",
      loader: guard(requireAuth),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/user/[id]/favorites")),
    },
  ],
};
