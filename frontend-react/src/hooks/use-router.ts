import { useCallback, useEffect, useRef } from "react";
import { useBlocker, useLocation, useNavigate, useSearchParams } from "react-router";

/**
 * A single route query parameter as `[value, setValue]` (the Vue app's `useRouteQuery`). Setting it
 * replaces the current history entry and keeps every other query parameter.
 */
export function useRouteQuery(name: string, defaultValue = ""): [string, (value: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(name) ?? defaultValue;
  const setValue = useCallback((v: string | null) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === null) {
        next.delete(name);
      }
      else {
        next.set(name, v);
      }
      return next;
    }, { replace: true });
  }, [name, setParams]);
  return [value, setValue];
}

/**
 * When navigating to another page, first replace the current history entry with the same path
 * without its query (Vue: `onBeforeRouteLeave` + `router.replace({ query: undefined })`), so going
 * back does not restore a pre-filled form.
 */
export function useStripQueryOnLeave() {
  const navigate = useNavigate();
  const location = useLocation();
  const leaving = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !leaving.current && !!currentLocation.search && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const next = blocker.location;
    leaving.current = true;
    blocker.reset();
    void Promise.resolve(navigate(location.pathname, { replace: true }))
      .then(() => navigate(next.pathname + next.search + next.hash, { state: next.state as unknown }));
  }, [blocker, location.pathname, navigate]);
}
