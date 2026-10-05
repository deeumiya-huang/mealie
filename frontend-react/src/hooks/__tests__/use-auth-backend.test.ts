import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
// Reused rather than reimplemented: the production reader escapes the full set of regex
// metacharacters, and it has its own coverage in use-token-cookie.test.ts.
import { readTokenCookie } from "../use-token-cookie";
import type { AppInfo } from "@/lib/api/types/admin";

// Pulled in by use-auth-backend purely to wipe cached data on logout. They drag in most of the
// composable graph, none of which this file exercises.
vi.mock("@/hooks/store", () => ({ clearAllStores: vi.fn() }));
vi.mock("@/hooks/use-clear-composable-caches", () => ({ clearComposableCaches: vi.fn() }));

// The Vue test stubbed useNuxtApp().$axios and useRouter(); here the same mocks stand in for the
// shared axios instance and the module-level navigation helper.
type Fn = (...args: unknown[]) => unknown;
const mocks = vi.hoisted(() => ({
  axios: null as null | { get: Fn; post: Fn },
  router: null as null | { push: Fn },
}));
vi.mock("@/lib/http", () => ({
  http: {
    get: (...args: unknown[]) => mocks.axios!.get(...args),
    post: (...args: unknown[]) => mocks.axios!.post(...args),
  },
}));
vi.mock("@/lib/navigation", () => ({
  navigateTo: (...args: unknown[]) => mocks.router!.push(...args),
}));

const TOKEN_NAME = "mealie.access_token";

function encodeToken(payload: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `header.${body}.signature`;
}

/** A token that expires far enough out that no refresh is scheduled during the test. */
function validToken(): string {
  return encodeToken({ sub: "abc", rme: true, exp: Math.floor(Date.now() / 1000) + 86_400 });
}

function unauthorized() {
  return Object.assign(new Error("Unauthorized"), { response: { status: 401 } });
}

let axiosMock: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
let routerMock: { push: ReturnType<typeof vi.fn> };
let useAuthBackend: typeof import("../use-auth-backend").useAuthBackend;

/** Renders the hook; `auth.current` is the latest render, like the Vue composable's refs. */
function renderAuth() {
  const { result } = renderHook(() => useAuthBackend());
  return result;
}

beforeEach(async () => {
  document.cookie = `${TOKEN_NAME}=; max-age=0`;

  axiosMock = {
    get: vi.fn().mockResolvedValue({ data: { id: "user-1" } }),
    post: vi.fn(),
  };
  routerMock = { push: vi.fn() };

  mocks.axios = axiosMock as unknown as { get: Fn; post: Fn };
  mocks.router = routerMock as unknown as { push: Fn };

  // Module-level refresh state (the in-flight promise, the scheduled timer) would otherwise leak
  // between tests, which is exactly the state these tests are about.
  vi.resetModules();
  ({ useAuthBackend } = await import("../use-auth-backend"));
  const { setAppInfo } = await import("@/providers/app-info");
  setAppInfo({ production: false } as AppInfo);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refresh", () => {
  test("shares one request between concurrent callers", async () => {
    const auth = renderAuth();
    act(() => auth.current.setToken(validToken()));

    let release: (value: unknown) => void = () => {};
    axiosMock.post.mockReturnValue(new Promise(resolve => (release = resolve)));

    const inFlight = [auth.current.refresh(), auth.current.refresh(), auth.current.refresh()];
    release({ data: { access_token: validToken() } });
    await act(() => Promise.all(inFlight));

    // Three callers, one round trip — a page load can easily 401 several times at once, and each
    // retrying separately would stampede the endpoint and race over the cookie.
    expect(axiosMock.post).toHaveBeenCalledTimes(1);
    expect(axiosMock.post).toHaveBeenCalledWith("/api/auth/refresh", null, { suppressAlert: true });
  });

  test("allows a new request once the previous one settles", async () => {
    const auth = renderAuth();
    act(() => auth.current.setToken(validToken()));
    axiosMock.post.mockResolvedValue({ data: { access_token: validToken() } });

    await act(() => auth.current.refresh());
    await act(() => auth.current.refresh());

    expect(axiosMock.post).toHaveBeenCalledTimes(2);
  });

  test("releases the lock after a failure, so the session can still recover", async () => {
    const auth = renderAuth();
    act(() => auth.current.setToken(validToken()));
    axiosMock.post.mockRejectedValue(new Error("network down"));

    await expect(act(() => auth.current.refresh())).rejects.toThrow("network down");
    await expect(act(() => auth.current.refresh())).rejects.toThrow("network down");

    // A failed refresh must not wedge the lock, or the session can never recover
    expect(axiosMock.post).toHaveBeenCalledTimes(2);
  });

  test("adopts the new token", async () => {
    const auth = renderAuth();
    act(() => auth.current.setToken(validToken()));

    const replacement = encodeToken({ sub: "abc", rme: true, exp: Math.floor(Date.now() / 1000) + 172_800 });
    axiosMock.post.mockResolvedValue({ data: { access_token: replacement } });

    await act(() => auth.current.refresh());

    expect(auth.current.token).toBe(replacement);
  });

  test("does not reload the session, which would re-enter the interceptor", async () => {
    const auth = renderAuth();
    act(() => auth.current.setToken(validToken()));
    axiosMock.post.mockResolvedValue({ data: { access_token: validToken() } });

    await act(() => auth.current.refresh());

    // getSession() runs on the same intercepted instance. A 401 there sends the interceptor back
    // into refresh() carrying a fresh config, which the one-retry guard can't recognise, and the
    // cycle starts over. Reloading the user belongs to callers who actually want fresh data.
    expect(axiosMock.get).not.toHaveBeenCalled();
  });

  test("does nothing without a token", async () => {
    const auth = renderAuth();

    await act(() => auth.current.refresh());

    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  test("clears the session and redirects when the token is rejected", async () => {
    const auth = renderAuth();
    act(() => auth.current.setToken(validToken()));
    axiosMock.post.mockRejectedValue(unauthorized());

    await expect(act(() => auth.current.refresh())).rejects.toBeDefined();

    expect(auth.current.token).toBeNull();
    expect(routerMock.push).toHaveBeenCalledWith("/login");
  });

  test("keeps the session on a network failure", async () => {
    const auth = renderAuth();
    const token = validToken();
    act(() => auth.current.setToken(token));
    axiosMock.post.mockRejectedValue(new Error("network down"));

    await expect(act(() => auth.current.refresh())).rejects.toThrow();

    // Only auth errors end a session; a blip of connectivity must not log anyone out
    expect(auth.current.token).toBe(token);
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});

describe("signIn", () => {
  test("stores the token and loads the session", async () => {
    const auth = renderAuth();
    const token = validToken();
    axiosMock.post.mockResolvedValue({ data: { access_token: token } });

    await act(() => auth.current.signIn(new FormData()));

    expect(auth.current.token).toBe(token);
    expect(axiosMock.get).toHaveBeenCalledWith("/api/users/self");
    expect(auth.current.status).toBe("authenticated");
  });

  test("leaves the session unauthenticated when credentials are rejected", async () => {
    const auth = renderAuth();
    axiosMock.post.mockRejectedValue(unauthorized());

    await expect(act(() => auth.current.signIn(new FormData()))).rejects.toBeDefined();

    expect(auth.current.status).toBe("unauthenticated");
    expect(axiosMock.get).not.toHaveBeenCalled();
  });
});

describe("signOut", () => {
  test("clears the session even when the logout call fails", async () => {
    const auth = renderAuth();
    const token = validToken();
    // The server owns this cookie now, so seed it the way a login response would
    document.cookie = `${TOKEN_NAME}=${encodeURIComponent(token)}`;
    act(() => auth.current.setToken(token));
    // The token is often already dead by this point — expired, or invalidated by a password change
    axiosMock.post.mockRejectedValue(unauthorized());

    await act(() => auth.current.signOut());

    expect(auth.current.token).toBeNull();
    expect(readTokenCookie(TOKEN_NAME)).toBeNull();
    expect(routerMock.push).toHaveBeenCalledWith("/login");
  });

  test("honors a callback url", async () => {
    const auth = renderAuth();
    act(() => auth.current.setToken(validToken()));
    axiosMock.post.mockResolvedValue({ data: {} });

    await act(() => auth.current.signOut("/recipes"));

    expect(routerMock.push).toHaveBeenCalledWith("/recipes");
  });
});
