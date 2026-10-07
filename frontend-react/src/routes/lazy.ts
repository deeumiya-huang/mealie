import { createElement, type ComponentType } from "react";
import { useParams, type RouteObject } from "react-router";

/**
 * A route's page component, loaded on first visit (Nuxt splits every page into its own chunk too).
 * Like Nuxt's default `<NuxtPage>` key (the route path with its params filled in), the page is keyed by
 * its params, so a param-only navigation (`/shopping-lists/a` → `/shopping-lists/b`) mounts a fresh page;
 * React Router would otherwise reuse the instance and hooks bound to the first id would keep it.
 *
 *   { path: "login", ...page(() => import("@/pages/login")) }
 */
export function page(load: () => Promise<{ default: ComponentType }>): Pick<RouteObject, "lazy"> {
  return {
    lazy: async () => {
      const Page = (await load()).default;
      function KeyedPage() {
        const params = useParams();
        return createElement(Page, { key: JSON.stringify(params) });
      }
      KeyedPage.displayName = `KeyedPage(${Page.displayName ?? Page.name})`;
      return { Component: KeyedPage };
    },
  };
}

/** Routes of one domain, grouped by the layout they render in (Vue `definePageMeta({ layout })`). */
export interface DomainRoutes {
  default?: RouteObject[];
  admin?: RouteObject[];
  basic?: RouteObject[];
  blank?: RouteObject[];
}
