import type { ComponentType } from "react";
import type { RouteObject } from "react-router";

/**
 * A route's page component, loaded on first visit (Nuxt splits every page into its own chunk too).
 *
 *   { path: "login", ...page(() => import("@/pages/login")) }
 */
export function page(load: () => Promise<{ default: ComponentType }>): Pick<RouteObject, "lazy"> {
  return {
    lazy: async () => ({ Component: (await load()).default }),
  };
}

/** Routes of one domain, grouped by the layout they render in (Vue `definePageMeta({ layout })`). */
export interface DomainRoutes {
  default?: RouteObject[];
  admin?: RouteObject[];
  basic?: RouteObject[];
  blank?: RouteObject[];
}
