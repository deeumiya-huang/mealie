import type { UserOut } from "@/lib/api/types/user";
import { AUTH_TOKEN } from "@/config";
import { clearAllStores } from "@/hooks/store";
import { clearComposableCaches } from "@/hooks/use-clear-composable-caches";
import { clearTokenCookie, getTokenExpiry, nextRefreshDelay, readTokenCookie } from "@/hooks/use-token-cookie";
import { clearAsyncDataCache } from "@/hooks/utils/use-async-data";
import { http } from "@/lib/http";
import { navigateTo } from "@/lib/navigation";
import { createStore, useStore } from "@/lib/store";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthSnapshot {
  user: UserOut | null;
  status: AuthStatus;
  token: string | null;
}

/** Retry a refresh that failed for reasons other than auth (offline, server hiccup). */
const REFRESH_RETRY_DELAY_MS = 60_000;
/** Cap those retries, so a persistent server error doesn't become a poll for the life of the tab. */
const MAX_REFRESH_RETRIES = 5;

// The cookie persists the token; `token` here is the in-memory view of it. Keeping a plain value as
// the source of truth means writes are visible synchronously, which a cookie can't guarantee.
export const authStore = createStore<AuthSnapshot>({ user: null, status: "loading", token: null });

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<void> | null = null;
let refreshRetries = 0;
let refreshListenersInstalled = false;

const tokenName = AUTH_TOKEN;

function patch(next: Partial<AuthSnapshot>) {
  authStore.set(state => ({ ...state, ...next }));
}

function errorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

export function resetAuth() {
  patch({ user: null, status: "unauthenticated" });
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

// Tabs tell each other about sign-outs and new tokens (Nuxt syncs cookie refs the same way).
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`mealie:cookie:${tokenName}`) : null;

function setToken(token: string | null) {
  if (!token) {
    patch({ token: null });
    clearScheduledRefresh();
    clearTokenCookie(tokenName);
    channel?.postMessage(null);
    return;
  }

  // Only the in-memory copy is set here. The cookie arrives on the response's Set-Cookie header —
  // writing it again from script would re-apply Safari's seven-day cap to a cookie the server just
  // set correctly, which is the bug this whole arrangement exists to avoid.
  patch({ token });
  scheduleTokenRefresh(token);
  channel?.postMessage(token);
}

function handleAuthError(error: unknown, redirect = false) {
  // Only clear token on auth errors, not network errors
  if (errorStatus(error) === 401) {
    setToken(null);
    resetAuth();
    if (redirect) {
      void navigateTo("/login");
    }
  }
}

async function getSession(): Promise<void> {
  if (!authStore.get().token) {
    patch({ user: null, status: "unauthenticated" });
    return;
  }

  patch({ status: "loading" });
  try {
    const { data } = await http.get<UserOut>("/api/users/self");
    patch({ user: data, status: "authenticated" });
  }
  catch (error) {
    console.error("Failed to fetch user session:", error);
    handleAuthError(error);
    patch({ status: "unauthenticated" });
  }
}

async function signIn(credentials: FormData): Promise<void> {
  patch({ status: "loading" });

  try {
    const response = await http.post<{ access_token: string }>("/api/auth/token", credentials, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    setToken(response.data.access_token);
    await getSession();
  }
  catch (error) {
    patch({ status: "unauthenticated" });
    throw error;
  }
}

async function signOut(callbackUrl: string = ""): Promise<void> {
  try {
    await http.post("/api/auth/logout");
  }
  catch (error) {
    // Continue with logout even if API call fails
    console.warn("Logout API call failed:", error);
  }
  finally {
    setToken(null);
    resetAuth();

    // Clear all cached store data to prevent data leakage between users
    clearAllStores();

    // Clear cached hook state to prevent data leakage between users
    clearComposableCaches();

    // Clear the useAsyncData cache (Nuxt: clearNuxtData)
    clearAsyncDataCache();

    await navigateTo(callbackUrl || "/login");
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
  // initTokenRefresh() hydrates the token. Gating only on the in-memory token would make refresh a
  // silent no-op during boot, turning a recoverable 401 into a logout.
  if (!authStore.get().token && !readTokenCookie(tokenName)) return;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await http.post<{ access_token: string }>("/api/auth/refresh", null, { suppressAlert: true });
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
    if (errorStatus(error) === 401 || !authStore.get().token) {
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

/** Another tab changed the token: adopt it, or drop this tab's session when it was cleared. */
function onTokenChangedElsewhere(value: string | null) {
  if (!value) {
    // Cleared by hand rather than through setToken(null): that writes the cookie and broadcasts,
    // which would land back in the other tab — a loop between tabs.
    patch({ token: null });
    clearScheduledRefresh();
    resetAuth();
    return;
  }

  if (value !== authStore.get().token) {
    patch({ token: value });
    scheduleTokenRefresh(value);
  }
}

/**
 * Starts keeping the session alive. Called once, from the root route loader (port of the auth plugin).
 *
 * Timers alone aren't enough: they don't run while the device sleeps, and a laptop reopened after
 * a day would otherwise come back to an expired token. Re-scheduling on focus, visibility and
 * reconnect recomputes the delay against the real clock without costing a request.
 */
function initTokenRefresh() {
  patch({ token: readTokenCookie(tokenName) });

  if (!refreshListenersInstalled) {
    refreshListenersInstalled = true;

    if (channel) {
      channel.onmessage = (event: MessageEvent<string | null>) => onTokenChangedElsewhere(event.data);
    }

    const reschedule = () => {
      // The user is back, so give a session that exhausted its retries another chance
      refreshRetries = 0;
      scheduleTokenRefresh(authStore.get().token);
    };

    window.addEventListener("focus", reschedule);
    window.addEventListener("online", reschedule);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        reschedule();
      }
    });
  }

  scheduleTokenRefresh(authStore.get().token);
}

/** The auth actions, usable outside React (guards, interceptors, loaders). */
export const authBackend = {
  getState: () => authStore.get(),
  signIn,
  signOut,
  refresh,
  getSession,
  setToken,
  initTokenRefresh,
};

/** Hook view of the auth state: re-renders on change. Port of composables/use-auth-backend.ts. */
export function useAuthBackend() {
  const state = useStore(authStore);
  return {
    data: state.user,
    status: state.status,
    token: state.token,
    signIn,
    signOut,
    refresh,
    getSession,
    setToken,
    initTokenRefresh,
  };
}
