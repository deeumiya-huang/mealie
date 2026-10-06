import { redirect } from "react-router";
import { advancedOnly, alwaysRevalidate, canManageHouseholdOnly, guard, requireAuth, type Guard } from "./guards";
import { page, type DomainRoutes } from "./lazy";

// Domain "household (/household/**)" (PROCESS.md §1.7). All pages use layout `default` (none of the Vue pages sets a
// layout). Guards = the Vue `middleware` arrays; pages/household/mealplan/planner.vue is a Nuxt parent (middleware
// ["auth"], renders only <NuxtPage /> plus its own controls), so its guard applies to /edit and /view, and the bare
// /household/mealplan/planner URL ends on /view like the page's own redirect did (the query string is kept).
const redirectToPlannerView: Guard = ({ request }) => {
  const { search } = new URL(request.url);
  throw redirect(`/household/mealplan/planner/view${search}`);
};

export const householdRoutes: DomainRoutes = {
  default: [
    {
      path: "household",
      loader: guard(requireAuth, canManageHouseholdOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/household/index")),
    },
    {
      path: "household/members",
      loader: guard(requireAuth),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/household/members")),
    },
    {
      path: "household/notifiers",
      loader: guard(requireAuth, advancedOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/household/notifiers")),
    },
    {
      path: "household/webhooks",
      loader: guard(requireAuth, advancedOnly),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/household/webhooks")),
    },
    {
      path: "household/mealplan/settings",
      loader: guard(requireAuth),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/household/mealplan/settings")),
    },
    {
      path: "household/mealplan/planner",
      loader: guard(requireAuth),
      shouldRevalidate: alwaysRevalidate,
      ...page(() => import("@/pages/household/mealplan/planner")),
      children: [
        { index: true, loader: guard(requireAuth, redirectToPlannerView), shouldRevalidate: alwaysRevalidate },
        { path: "edit", ...page(() => import("@/pages/household/mealplan/planner/edit")) },
        { path: "view", ...page(() => import("@/pages/household/mealplan/planner/view")) },
      ],
    },
  ],
};
