import { useCallback } from "react";
import { useSearchParams } from "react-router";

/** Port of `useRouterQuery(query)`: the query value as a string ("" when absent) and a setter. */
export function useRouterQuery(query: string) {
  const [value, setValue] = useRouteQuery(query, "");
  return [value ?? "", setValue] as const;
}

/**
 * Port of `useRouteQuery(name, defaultValue?)`: the value of a query parameter (repeated parameters
 * → array) and a setter that replaces the URL's query (`null` removes the parameter).
 */
export function useRouteQuery<T extends string | string[]>(name: string, defaultValue?: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  const all = searchParams.getAll(name);
  const value: T | null = all.length === 0 ? (defaultValue ?? null) : ((all.length === 1 ? all[0] : all) as T);

  const setValue = useCallback((next: T | null) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.delete(name);
      if (Array.isArray(next)) {
        next.forEach(v => params.append(name, v));
      }
      else if (next !== null) {
        params.set(name, next);
      }
      return params;
    }, { replace: true });
  }, [name, setSearchParams]);

  return [value, setValue] as const;
}
