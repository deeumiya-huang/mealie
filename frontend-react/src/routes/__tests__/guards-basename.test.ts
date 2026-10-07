import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Under SUB_PATH (Vite `base`), the data router's request URLs include the basename; Nuxt's `to.fullPath`
// does not. Guards must build redirects without it (the router adds it back), or login lands on /mealie/mealie/….
describe("guards under a SUB_PATH basename", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("BASE_URL", "/mealie/");
  });

  afterEach(() => vi.unstubAllEnvs());

  async function load(status: "authenticated" | "unauthenticated", groupSlug?: string) {
    const { authStore } = await import("@/hooks/use-auth-backend");
    authStore.set(state => ({
      ...state,
      status,
      user: groupSlug ? ({ ...state.user, groupSlug } as typeof state.user) : null,
    }));
    return import("../guards");
  }

  function location(run: () => void) {
    try {
      run();
      return undefined;
    }
    catch (thrown) {
      return (thrown as Response).headers.get("Location");
    }
  }

  test("strips the basename from app paths", async () => {
    const { appPathname, routerBasename } = await load("unauthenticated");

    expect(routerBasename).toBe("/mealie");
    expect(appPathname("/mealie/g/home")).toBe("/g/home");
    expect(appPathname("/mealie")).toBe("/");
    expect(appPathname("/mealiex/g")).toBe("/mealiex/g");
    expect(appPathname("/g/home", "/")).toBe("/g/home");
  });

  test("login redirect keeps the path without the basename", async () => {
    const { requireAuth } = await load("unauthenticated");
    const request = new Request("http://localhost/mealie/shopping-lists/abc?foo=bar");

    const target = location(() => requireAuth({ request, params: {} }));

    expect(target).toBe(`/login?${new URLSearchParams({ redirect: "/shopping-lists/abc?foo=bar" }).toString()}`);
  });

  test("share target redirects into the user's group under the basename", async () => {
    const { pwaShareTargetRedirect } = await load("authenticated", "home");
    const request = new Request("http://localhost/mealie/r/create/url?recipe_import_url=x");

    const target = location(() => pwaShareTargetRedirect({ request, params: {} }));

    expect(target).toBe("/g/home/r/create/url?recipe_import_url=x");
  });

  test("share target asks a logged-out user to log in first", async () => {
    const { pwaShareTargetRedirect } = await load("unauthenticated");
    const request = new Request("http://localhost/mealie/r/create/url?recipe_import_url=x");

    const target = location(() => pwaShareTargetRedirect({ request, params: {} }));

    expect(target).toBe(`/login?redirect=${encodeURIComponent("/r/create/url?recipe_import_url=x")}`);
  });
});
