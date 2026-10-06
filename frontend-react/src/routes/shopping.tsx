import { alwaysRevalidate, guard, requireAuth } from "./guards";
import { page, type DomainRoutes } from "./lazy";

// Domain "shopping (/shopping-lists/**)" (PROCESS.md §1.7): shopping-lists, shopping-lists/[id].
// Layout `default` for both (neither Vue page sets a layout); both have middleware ["auth"].
export const shoppingRoutes: DomainRoutes = {
  default: [
    {
      path: "shopping-lists",
      loader: guard(requireAuth),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/shopping-lists/index")),
    },
    {
      path: "shopping-lists/:id",
      loader: guard(requireAuth),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/shopping-lists/[id]")),
    },
  ],
};
