import type { AxiosInstance, AxiosRequestConfig } from "axios";
import type { UserOut } from "~/lib/api/types/user";
import { createStore, resetAllCaches, useStore } from "~/lib/store";
import type { Store } from "~/lib/store";
import { clearTokenCookie, getTokenExpiry, nextRefreshDelay, readTokenCookie } from "~/hooks/use-token-cookie";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthSnapshot {
  user: UserOut | null;
  status: AuthStatus;
  /**
   * The in-memory token. The cookie persists it; this is the source of truth for the running tab
   * because writes are visible synchronously, which cross-tab cookie sync can't guarantee.
   */
  token: string | null;
}

type HttpClient = Pick<AxiosInstance, "get" | "post">;

export interface AuthBackendDeps {
  http: () => HttpClient;
  navigate: (to: string) => void | Promise<void>;
  tokenName: string;
}

export interface AuthBackend {
  getUser: () => UserOut | null;
  getStatus: () => AuthStatus;
  getToken: () => string | null;
  store: Store<AuthSnapshot>;
  signIn: (credentials: FormData) => Promise<void>;
  signOut: (callbackUrl?: string) => Promise<void>;
  refresh: () => Promise<void>;
  getSession: () => Promise<void>;
  setToken: (token: string | null) => void;
  /** Hydrates the token from the cookie and starts the refresh loop. Called once, at bootstrap. */
  initTokenRefresh: () => void;
  resetAuth: () => void;
}

/** Retry a refresh that failed for reasons other than auth (offline, server hiccup). */
const REFRESH_RETRY_DELAY_MS = 60_000;
/** Cap those retries, so a persistent server error doesn't become a poll for the life of the tab. */
const MAX_REFRESH_RETRIES = 5;
/** Tabs tell each other about sign-outs and refreshes (Nuxt's useCookie did this for the Vue app). */
const AUTH_CHANNEL = "mealie-auth";

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

/**
 * Port of the Vue `useAuthBackend` composable.
 *
 * All state is module-level in the Vue app; here it lives in one store per backend instance. The app
 * uses the singleton wired in ~/app/services.ts; tests build isolated instances with mocks.
 */
export function createAuthBackend(deps: AuthBackendDeps): AuthBackend {
  const state = createStore<AuthSnapshot>({ user: null, status: "loading", token: null });

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let refreshInFlight: Promise<void> | null = null;
  let refreshRetries = 0;
  let channel: BroadcastChannel | null = null;

  function resetAuth() {
    state.patch({ user: null, status: "unauthenticated" });
  }

  function clearScheduledRefresh() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  /**
   * Queues the next refresh from the token's own expiry.
   *
   * Recomputing from the remaining time (rather than a fixed interval) means this self-corrects
   * after the machine sleeps or the tab is backgrounded and the timer fires late.
   */
  function scheduleTokenRefresh(token: string | null) {
    clearScheduledRefresh();
    if (!token) {
      return;
    }

    const expiresAt = getTokenExpiry(token);
    if (expiresAt === null) {
      return;
    }

    const delay = nextRefreshDelay(expiresAt - Date.now());
    if (delay === null) {
      return;
    }

    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void refreshQuietly();
    }, delay);
  }

  function broadcast() {
    try {
      channel?.postMessage("token-changed");
    }
    catch {
      // Channel closed, nothing to tell.
    }
  }

  function setToken(token: string | null) {
    if (!token) {
      state.patch({ token: null });
      clearScheduledRefresh();
      clearTokenCookie(deps.tokenName);
      broadcast();
      return;
    }

    // Only the in-memory copy is set here. The cookie arrives on the response's Set-Cookie header —
    // writing it again from script would re-apply Safari's seven-day cap to a cookie the server just
    // set correctly, which is the bug this whole arrangement exists to avoid.
    state.patch({ token });
    scheduleTokenRefresh(token);
    broadcast();
  }

  function handleAuthError(error: unknown, redirect = false) {
    // Only clear token on auth errors, not network errors
    if (statusOf(error) === 401) {
      setToken(null);
      resetAuth();
      if (redirect) {
        void deps.navigate("/login");
      }
    }
  }

  async function getSession(): Promise<void> {
    if (!state.get().token) {
      state.patch({ user: null, status: "unauthenticated" });
      return;
    }

    state.patch({ status: "loading" });
    try {
      const { data } = await deps.http().get<UserOut>("/api/users/self");
      state.patch({ user: data, status: "authenticated" });
    }
    catch (error) {
      console.error("Failed to fetch user session:", error);
      handleAuthError(error);
      state.patch({ status: "unauthenticated" });
    }
  }

  async function signIn(credentials: FormData): Promise<void> {
    state.patch({ status: "loading" });

    try {
      const response = await deps.http().post<{ access_token: string }>("/api/auth/token", credentials, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setToken(response.data.access_token);
      await getSession();
    }
    catch (error) {
      state.patch({ status: "unauthenticated" });
      throw error;
    }
  }

  async function signOut(callbackUrl: string = ""): Promise<void> {
    try {
      await deps.http().post("/api/auth/logout");
    }
    catch (error) {
      // Continue with logout even if API call fails
      console.warn("Logout API call failed:", error);
    }
    finally {
      setToken(null);
      resetAuth();

      // Clear all cached store and hook data to prevent data leakage between users
      resetAllCaches();

      await deps.navigate(callbackUrl || "/login");
    }
  }

  /**
   * Trades the current token for a fresh one, and nothing else.
   *
   * Concurrent callers share a single request — a page load can easily fire several 401s at once,
   * and each one retrying separately would stampede the endpoint and race over the cookie.
   *
   * Reloading the user is getSession's job: that request goes through the same intercepted axios
   * instance, so a 401 on it would send the interceptor straight back into refresh().
   */
  async function refresh(): Promise<void> {
    // The cookie is the real credential — the interceptor gates on it, and it is populated before
    // initTokenRefresh() hydrates the in-memory token. Gating only on memory would make refresh a
    // silent no-op during boot, turning a recoverable 401 into a logout.
    if (!state.get().token && !readTokenCookie(deps.tokenName)) return;
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      try {
        const config: AxiosRequestConfig = { suppressAlert: true };
        const response = await deps.http().post<{ access_token: string }>("/api/auth/refresh", null, config);
        setToken(response.data.access_token);
      }
      catch (error) {
        handleAuthError(error, true);
        throw error;
      }
      finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  }

  /** A background refresh, where there is no caller to surface a failure to. */
  async function refreshQuietly(): Promise<void> {
    try {
      await refresh();
      refreshRetries = 0;
    }
    catch (error) {
      // A 401 has already cleared the session and redirected. Anything else — offline, a restarting
      // backend — is transient, so try again rather than letting the session lapse over a blip.
      if (statusOf(error) === 401 || !state.get().token) {
        return;
      }
      if (refreshRetries >= MAX_REFRESH_RETRIES) {
        return;
      }

      // Backing off, because a 500 that isn't going away shouldn't be retried at the same rate as a
      // dropped connection. Attempts stop well before the token would have expired anyway.
      refreshRetries += 1;
      clearScheduledRefresh();
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void refreshQuietly();
      }, REFRESH_RETRY_DELAY_MS * refreshRetries);
    }
  }

  /** Re-reads the cookie, picking up a sign-out or refresh performed in another tab. */
  function syncFromCookie() {
    const value = readTokenCookie(deps.tokenName);
    const current = state.get().token;
    if (!value) {
      if (current) {
        // Signed out in another tab. Drop this tab's session too, instead of holding a stale token
        // and a live refresh timer while still rendering as authenticated. Cleared by hand rather
        // than through setToken(null), which would broadcast back — a loop between tabs.
        state.patch({ token: null });
        clearScheduledRefresh();
        resetAuth();
      }
      return;
    }

    if (value !== current) {
      state.patch({ token: value });
      scheduleTokenRefresh(value);
    }
  }

  /**
   * Starts keeping the session alive.
   *
   * Timers alone aren't enough: they don't run while the device sleeps, and a laptop reopened after
   * a day would otherwise come back to an expired token. Re-scheduling on focus, visibility and
   * reconnect recomputes the delay against the real clock without costing a request.
   */
  function initTokenRefresh() {
    state.patch({ token: readTokenCookie(deps.tokenName) });

    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = () => syncFromCookie();
    }

    const reschedule = () => {
      // The user is back, so give a session that exhausted its retries another chance
      refreshRetries = 0;
      syncFromCookie();
      scheduleTokenRefresh(state.get().token);
    };

    window.addEventListener("focus", reschedule);
    window.addEventListener("online", reschedule);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        reschedule();
      }
    });

    scheduleTokenRefresh(state.get().token);
  }

  return {
    getUser: () => state.get().user,
    getStatus: () => state.get().status,
    getToken: () => state.get().token,
    store: state,
    signIn,
    signOut,
    refresh,
    getSession,
    setToken,
    initTokenRefresh,
    resetAuth,
  };
}

let singleton: AuthBackend | null = null;

export function setAuthBackend(backend: AuthBackend): void {
  singleton = backend;
}

/** The app-wide auth backend (non-reactive). */
export function getAuthBackend(): AuthBackend {
  if (!singleton) {
    throw new Error("Auth backend not initialised; call setAuthBackend() during bootstrap");
  }
  return singleton;
}

/** React hook: the auth backend plus a reactive snapshot of its state. */
export function useAuthBackend(): AuthBackend & { snapshot: AuthSnapshot } {
  const backend = getAuthBackend();
  const snapshot = useStore(backend.store);
  return { ...backend, snapshot };
}
