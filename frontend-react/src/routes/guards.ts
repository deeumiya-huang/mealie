import { redirect, type LoaderFunctionArgs, type ShouldRevalidateFunction } from "react-router";
import { authBackend } from "@/hooks/use-auth-backend";

/**
 * Ports of middleware/*.ts as loader helpers (PROCESS.md §1.7). A guard throws a `redirect` like a
 * Nuxt middleware returning `navigateTo(...)`; the "…-only" middlewares, which redirect home, also
 * apply on a hard load (decision D4). Guards run after the auth plugin port (`initAuth`) finished,
 * so they see the real session.
 *
 *   { path: "admin", loader: guard(requireAuth, adminOnly), shouldRevalidate: alwaysRevalidate, … }
 */
export type GuardArgs = Pick<LoaderFunctionArgs, "request" | "params">;
export type Guard = (args: GuardArgs) => void;

let authReady: Promise<void> | null = null;

/**
 * Port of plugins/init-auth.client.ts: hydrate the token from the cookie and load the session once,
 * before any route renders, so guards see the real session.
 */
export function initAuth(): Promise<void> {
  authReady ??= (async () => {
    // Must come first: it hydrates the token from the cookie, which getSession checks before it
    // will bother asking the server who we are.
    authBackend.initTokenRefresh();
    await authBackend.getSession();
  })();
  return authReady;
}

/** Forget the one-time auth init (tests). */
export function resetInitAuth() {
  authReady = null;
}

// Vite `base` (from SUB_PATH, see vite.config.ts) without its trailing slash, like Nuxt's router base.
export const routerBasename = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";

/**
 * The app path of a URL pathname: a data router's `request.url` (and `shouldRevalidate` URLs) include the
 * basename, Nuxt's `to.path` does not. Redirects built from it get the basename added back by the router.
 */
export function appPathname(pathname: string, basename = routerBasename) {
  if (basename === "/") {
    return pathname;
  }
  if (pathname === basename) {
    return "/";
  }
  return pathname.startsWith(`${basename}/`) ? pathname.slice(basename.length) : pathname;
}

/** Nuxt `to.fullPath`: path (without the basename), query and hash. */
export function fullPath(request: Request, basename = routerBasename) {
  const url = new URL(request.url);
  return `${appPathname(url.pathname, basename)}${url.search}${url.hash}`;
}

/** The PWA share target path (`manifest.webmanifest` `share_target.action`, without the base). */
export const SHARE_TARGET_PATH = "/r/create/url";

const user = () => authBackend.getState().user;

/** middleware/auth.ts: not logged in → `/login?redirect=<fullPath>`, then back here once they are. */
export const requireAuth: Guard = ({ request }) => {
  if (authBackend.getState().status !== "authenticated") {
    throw redirect(`/login?${new URLSearchParams({ redirect: fullPath(request) }).toString()}`);
  }
};

/** middleware/admin-only.ts */
export const adminOnly: Guard = () => {
  // If the user is not an admin redirect to the home page
  if (!user()?.admin) {
    throw redirect("/");
  }
};

/** middleware/advanced-only.ts */
export const advancedOnly: Guard = () => {
  // If the user is not allowed to access advanced features redirect to the home page
  if (!user()?.advanced) {
    console.warn("User is not allowed to access advanced features");
    throw redirect("/");
  }
};

/** middleware/can-manage-household-only.ts */
export const canManageHouseholdOnly: Guard = () => {
  // If the user is not allowed to manage group settings redirect to the home page
  if (!user()?.canManageHousehold) {
    throw redirect("/");
  }
};

/** middleware/can-manage-only.ts */
export const canManageOnly: Guard = () => {
  // If the user is not allowed to manage group settings redirect to the home page
  if (!user()?.canManage) {
    console.warn("User is not allowed to manage group settings");
    throw redirect("/");
  }
};

/** middleware/can-organize-only.ts */
export const canOrganizeOnly: Guard = () => {
  // If the user is not allowed to organize data redirect to the home page
  if (!user()?.canOrganize) {
    console.warn("User is not allowed to organize data");
    throw redirect("/");
  }
};

/** middleware/group-only.ts — only for routes that have a groupSlug parameter (e.g. /g/:groupSlug/...). */
export const groupOnly: Guard = ({ params }) => {
  if (params.groupSlug !== user()?.groupSlug) {
    throw redirect("/");
  }
};

/** middleware/pwa-share-target-redirect.global.ts (runs in the root loader, i.e. on every route). */
export const pwaShareTargetRedirect: Guard = ({ request }) => {
  if (appPathname(new URL(request.url).pathname) === SHARE_TARGET_PATH) {
    const groupSlug = user()?.groupSlug;
    if (!groupSlug) {
      // Preserve the full path (including recipe_import_url query param) so the
      // login page can redirect back here after successful authentication.
      const target = encodeURIComponent(fullPath(request));
      throw redirect(`/login?redirect=${target}`, 302);
    }
    throw redirect(`/g/${groupSlug}${fullPath(request)}`, 302);
  }
};

/** A route loader that waits for auth init, then applies the guards in order (Vue `middleware: [...]`). */
export function guard(...guards: Guard[]) {
  return async (args: LoaderFunctionArgs) => {
    await initAuth();
    for (const check of guards) {
      check(args);
    }
    return null;
  };
}

/** Nuxt runs route middleware on every navigation; React Router re-runs a loader only when told to. */
export const alwaysRevalidate: ShouldRevalidateFunction = () => true;
