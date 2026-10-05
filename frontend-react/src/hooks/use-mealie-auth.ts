import { useState } from "react";
import { authBackend, useAuthBackend } from "@/hooks/use-auth-backend";
import { http } from "@/lib/http";

async function oauthSignIn() {
  const params = new URLSearchParams(window.location.search);
  const { data: token } = await http.get<{ access_token: string; token_type: "bearer" }>("/api/auth/oauth/callback", { params });
  authBackend.setToken(token.access_token);

  await authBackend.getSession();
  if (authBackend.getState().status !== "authenticated") {
    throw new Error("OIDC sign-in succeeded but the session could not be established");
  }
}

/** Port of composables/use-mealie-auth.ts: `{ user, loggedIn, token, signIn, signOut, getSession, oauthSignIn }`. */
export function useMealieAuth() {
  const auth = useAuthBackend();

  // `loggedIn` keeps the last settled status, so a background session reload ("loading") doesn't
  // flicker the UI into a logged-out state.
  const [lastAuthStatus, setLastAuthStatus] = useState(auth.status);
  if (auth.status !== "loading" && auth.status !== lastAuthStatus) {
    setLastAuthStatus(auth.status);
  }
  const settledStatus = auth.status !== "loading" ? auth.status : lastAuthStatus;

  return {
    user: auth.data,
    loggedIn: settledStatus === "authenticated",
    token: auth.token,
    signIn: auth.signIn,
    signOut: auth.signOut,
    getSession: auth.getSession,
    oauthSignIn,
  };
}
