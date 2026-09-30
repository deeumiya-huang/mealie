import { currentUser, isLoggedIn } from "~/hooks/use-mealie-auth";

/**
 * Route middleware, ported from frontend/app/middleware. Each takes the target route and returns
 * where to redirect instead, or undefined to let the navigation through. The router turns these into
 * loader redirects (see ./routes.tsx).
 */
export interface RouteTarget {
  path: string;
  fullPath: string;
  params: Record<string, string | undefined>;
}

export type NavigationTarget = string | { path: string; query?: Record<string, string> };

export type RouteMiddleware = (to: RouteTarget) => NavigationTarget | undefined;

/** Not logged in: go to the login page, then back here once logged in. */
export const auth: RouteMiddleware = (to) => {
  if (!isLoggedIn()) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
};

export const adminOnly: RouteMiddleware = () => {
  // If the user is not an admin redirect to the home page
  if (!currentUser()?.admin) {
    return "/";
  }
};

export const advancedOnly: RouteMiddleware = () => {
  // If the user is not allowed to access advanced features redirect to the home page
  if (!currentUser()?.advanced) {
    console.warn("User is not allowed to access advanced features");
    return "/";
  }
};

export const canManageHouseholdOnly: RouteMiddleware = () => {
  // If the user is not allowed to manage household settings redirect to the home page
  if (!currentUser()?.canManageHousehold) {
    return "/";
  }
};

export const canManageOnly: RouteMiddleware = () => {
  // If the user is not allowed to manage group settings redirect to the home page
  if (!currentUser()?.canManage) {
    console.warn("User is not allowed to manage group settings");
    return "/";
  }
};

export const canOrganizeOnly: RouteMiddleware = () => {
  // If the user is not allowed to organize data redirect to the home page
  if (!currentUser()?.canOrganize) {
    console.warn("User is not allowed to organize data");
    return "/";
  }
};

export const groupOnly: RouteMiddleware = (to) => {
  // this can only be used for routes that have a groupSlug parameter (e.g. /g/:groupSlug/...)
  if (to.params.groupSlug !== currentUser()?.groupSlug) {
    return "/";
  }
};

/** Global: the PWA share target posts to /r/create/url, which needs the user's group slug. */
export const pwaShareTargetRedirect: RouteMiddleware = (to) => {
  if (to.path === "/r/create/url") {
    const groupSlug = currentUser()?.groupSlug;
    if (!groupSlug) {
      // Preserve the full path (including recipe_import_url query param) so the
      // login page can redirect back here after successful authentication.
      const redirect = encodeURIComponent(to.fullPath);
      return `/login?redirect=${redirect}`;
    }
    return `/g/${groupSlug}${to.fullPath}`;
  }
};

export function toHref(target: NavigationTarget): string {
  if (typeof target === "string") return target;
  const query = target.query ? `?${new URLSearchParams(target.query).toString()}` : "";
  return `${target.path}${query}`;
}
