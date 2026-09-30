import { useParams } from "react-router";
import { useMealieAuth } from "~/hooks/use-mealie-auth";

export const useLoggedInState = function () {
  const auth = useMealieAuth();
  const { groupSlug } = useParams();

  const loggedIn = auth.loggedIn;
  const isOwnGroup = !groupSlug ? loggedIn : loggedIn && auth.user?.groupSlug === groupSlug;

  return { loggedIn, isOwnGroup };
};
