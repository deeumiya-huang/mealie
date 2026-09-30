import { useCallback } from "react";
import { useSearchParams } from "react-router";

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
