import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const navigateTo = vi.hoisted(() => vi.fn((to: unknown) => to));

vi.mock("@/lib/navigation", () => ({ navigateTo, setNavigate: vi.fn() }));

// Guards redirect by throwing React Router's `redirect` (Nuxt middleware returned `navigateTo`): spy on both.
const redirectSpy = vi.hoisted(() => vi.fn());
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, redirect: (...args: Parameters<typeof actual.redirect>) => {
    redirectSpy(...args);
    return actual.redirect(...args);
  } };
});

// The Vue test stubbed `useMealieAuth` with a `loggedIn` ref; here the auth store gets the status.
let loggedIn = false;
function setLoggedIn(value: boolean) {
  loggedIn = value;
}

describe("auth middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    navigateTo.mockClear();
    redirectSpy.mockClear();
  });

  afterEach(() => vi.unstubAllGlobals());

  /** Runs the guard; a thrown redirect becomes `{ path, query }` (what the Nuxt middleware returned). */
  async function run(fullPath: string) {
    const { authStore } = await import("@/hooks/use-auth-backend");
    authStore.set(state => ({ ...state, status: loggedIn ? "authenticated" : "unauthenticated" }));
    const { requireAuth } = await import("../guards");
    try {
      requireAuth({ request: new Request(`http://localhost${fullPath}`), params: {} });
      return undefined;
    }
    catch (thrown) {
      const location = new URL((thrown as Response).headers.get("Location")!, "http://localhost");
      return { path: location.pathname, query: Object.fromEntries(location.searchParams) };
    }
  }

  test("sends a logged-out user to the login page and back afterwards", async () => {
    setLoggedIn(false);

    const result = await run("/shopping-lists/abc?foo=bar");

    expect(result).toEqual({ path: "/login", query: { redirect: "/shopping-lists/abc?foo=bar" } });
  });

  test("lets a logged-in user through", async () => {
    setLoggedIn(true);

    const result = await run("/shopping-lists/abc");

    expect(result).toBeUndefined();
    expect(navigateTo).not.toHaveBeenCalled();
    expect(redirectSpy).not.toHaveBeenCalled();
  });
});
