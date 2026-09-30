import { useCallback, useEffect, useRef } from "react";
import { PageMode } from "./shared-state";

export type BooleanString = "true" | "false" | "";

interface UseCookModeQueryOptions {
  cookQuery: BooleanString | undefined;
  setCookQuery: (value: BooleanString | undefined) => void;
  isEditMode: boolean;
  pageMode: PageMode;
  setMode: (mode: PageMode) => void;
}

/**
 * Keeps cook mode and the `?cook=true` query in sync, both ways, once hydrated.
 */
export function useCookModeQuery({ cookQuery, setCookQuery, isEditMode, pageMode, setMode }: UseCookModeQueryOptions) {
  const hasHydrated = useRef(false);
  // Mode the query sync just requested; the page-mode effect of the same commit still sees the old
  // mode and must not write it back to the query (Vue's watcher would have read the new one).
  const pendingMode = useRef<PageMode | null>(null);
  const latest = useRef({ cookQuery, isEditMode, pageMode, setMode, setCookQuery });
  latest.current = { cookQuery, isEditMode, pageMode, setMode, setCookQuery };

  const syncCookModeWithQuery = useCallback(() => {
    const { cookQuery: query, isEditMode: editing, pageMode: mode, setMode: set } = latest.current;
    if (!hasHydrated.current || editing) return;
    if (query === "true" && mode !== PageMode.COOK) {
      pendingMode.current = PageMode.COOK;
      set(PageMode.COOK);
      return;
    }
    if (query !== "true" && mode === PageMode.COOK) {
      pendingMode.current = PageMode.VIEW;
      set(PageMode.VIEW);
    }
  }, []);

  // watch([cookQuery, isEditMode])
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    syncCookModeWithQuery();
  }, [cookQuery, isEditMode, syncCookModeWithQuery]);

  // watch(pageMode)
  const firstMode = useRef(true);
  useEffect(() => {
    if (firstMode.current) {
      firstMode.current = false;
      return;
    }
    if (!hasHydrated.current) return;
    if (pendingMode.current !== null) {
      if (pendingMode.current !== pageMode) return;
      pendingMode.current = null;
    }
    if (pageMode === PageMode.COOK) {
      if (latest.current.cookQuery !== "true") latest.current.setCookQuery("true");
      return;
    }
    if (pageMode === PageMode.VIEW) {
      latest.current.setCookQuery(undefined);
    }
  }, [pageMode]);

  const hydrateCookMode = useCallback(() => {
    hasHydrated.current = true;
    syncCookModeWithQuery();
  }, [syncCookModeWithQuery]);

  return { hydrateCookMode };
}
