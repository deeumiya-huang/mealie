import { useParams } from "react-router";
import { useMealieAuth } from "@/hooks/use-mealie-auth";

/** Port of composables/use-logged-in-state.ts. */
export function useLoggedInState() {
  const auth = useMealieAuth();
  const { groupSlug } = useParams();

  const loggedIn = auth.loggedIn;
  const isOwnGroup = !groupSlug ? loggedIn : loggedIn && auth.user?.groupSlug === groupSlug;

  return { loggedIn, isOwnGroup };
}
