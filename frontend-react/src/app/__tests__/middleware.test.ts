import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({ loggedIn: false }));

vi.mock("~/hooks/use-mealie-auth", () => ({
  isLoggedIn: () => state.loggedIn,
  currentUser: () => null,
}));

// Ported from frontend/app/middleware/__tests__/auth.test.ts. The Nuxt middleware returned
// navigateTo(...); the React router's middleware returns the navigation target itself.
describe("auth middleware", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => vi.clearAllMocks());

  async function run(fullPath: string) {
    const { auth } = await import("../middleware");
    const url = new URL(fullPath, "http://localhost");
    return auth({ path: url.pathname, fullPath, params: {} });
  }

  test("sends a logged-out user to the login page and back afterwards", async () => {
    state.loggedIn = false;

    const result = await run("/shopping-lists/abc?foo=bar");

    expect(result).toEqual({ path: "/login", query: { redirect: "/shopping-lists/abc?foo=bar" } });
  });

  test("lets a logged-in user through", async () => {
    state.loggedIn = true;

    const result = await run("/shopping-lists/abc");

    expect(result).toBeUndefined();
  });
});
