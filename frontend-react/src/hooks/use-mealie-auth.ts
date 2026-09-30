import type { UserOut } from "~/lib/api/types/user";
import { getAuthBackend, useAuthBackend } from "~/hooks/use-auth-backend";
import type { AuthStatus } from "~/hooks/use-auth-backend";

/**
 * Completes an OIDC sign-in: trades the callback's query string for a token and loads the session.
 */
export async function oauthSignIn(): Promise<void> {
  const auth = getAuthBackend();
  const { apiHttp } = await import("~/app/services");
  const params = new URLSearchParams(window.location.search);
  const { data: token } = await apiHttp().get<{ access_token: string; token_type: "bearer" }>("/api/auth/oauth/callback", { params });
  auth.setToken(token.access_token);

  await auth.getSession();
  if (auth.getStatus() !== "authenticated") {
    throw new Error("OIDC sign-in succeeded but the session could not be established");
  }
}

/**
 * While a session request is in flight the status is "loading"; the Vue composable kept reporting the
 * last settled status so the UI doesn't flash logged-out. A session reload keeps the loaded user, so
 * "loading with a user" means the last settled status was "authenticated".
 */
function loggedInFromStatus(status: AuthStatus, user: UserOut | null): boolean {
  return status === "authenticated" || (status === "loading" && user !== null);
}

/** Non-reactive read of the logged-in state, for route guards and other non-component code. */
export function isLoggedIn(): boolean {
  const auth = getAuthBackend();
  return loggedInFromStatus(auth.getStatus(), auth.getUser());
}

export function currentUser(): UserOut | null {
  return getAuthBackend().getUser();
}

export interface MealieAuth {
  user: UserOut | null;
  loggedIn: boolean;
  token: string | null;
  signIn: (credentials: FormData) => Promise<void>;
  signOut: (callbackUrl?: string) => Promise<void>;
  getSession: () => Promise<void>;
  oauthSignIn: () => Promise<void>;
}

export function useMealieAuth(): MealieAuth {
  const auth = useAuthBackend();
  const { user, status, token } = auth.snapshot;

  return {
    user,
    loggedIn: loggedInFromStatus(status, user),
    token,
    signIn: auth.signIn,
    signOut: auth.signOut,
    getSession: auth.getSession,
    oauthSignIn,
  };
}
