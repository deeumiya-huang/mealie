import { useCallback, useEffect, useRef } from "react";
import { PageMode } from "./shared-state";

export type BooleanString = "true" | "false" | "";

interface UseCookModeQueryOptions {
  /** The `cook` query value (undefined when absent). */
  cookQuery: BooleanString | undefined;
  /** Writes the `cook` query (undefined removes it). Vue: the writable route query ref. */
  setCookQuery: (value: BooleanString | undefined) => void;
  isEditMode: boolean;
  pageMode: PageMode;
  setMode: (mode: PageMode) => void;
}

interface ModeValues {
  cookQuery: BooleanString | undefined;
  isEditMode: boolean;
  pageMode: PageMode;
}

/** The mode the page should be in for the query (Vue `syncCookModeWithQuery`), or null to leave it. */
function modeForQuery({ cookQuery, isEditMode, pageMode }: ModeValues): PageMode | null {
  if (isEditMode) {
    return null;
  }

  if (cookQuery === "true" && pageMode !== PageMode.COOK) {
    return PageMode.COOK;
  }

  if (cookQuery !== "true" && pageMode === PageMode.COOK) {
    return PageMode.VIEW;
  }

  return null;
}

/**
 * Port of composables/recipe-page/use-cook-mode-query.ts: keeps cook mode and the `?cook=true` query in sync once
 * `hydrateCookMode()` was called (on mount).
 *
 * Vue had two watchers: `[cookQuery, isEditMode]` → page mode, then `pageMode` → query, the second one seeing the
 * mode the first one set in the same flush. Here one effect does both in that order, comparing with the values of
 * the previous render, so a query change and the mode change it causes never fight each other.
 * `hydrateCookMode(current?)` syncs right away like Vue; `current` passes values the caller has just set (e.g. edit
 * mode entered in the same mount handler) that this render does not show yet.
 */
export function useCookModeQuery({
  cookQuery,
  setCookQuery,
  isEditMode,
  pageMode,
  setMode,
}: UseCookModeQueryOptions) {
  const hasHydrated = useRef(false);
  const latest = useRef({ cookQuery, isEditMode, pageMode, setMode });
  const previous = useRef<ModeValues>({ cookQuery, isEditMode, pageMode });

  useEffect(() => {
    latest.current = { cookQuery, isEditMode, pageMode, setMode };
  });

  useEffect(() => {
    const prev = previous.current;
    const queryChanged = prev.cookQuery !== cookQuery || prev.isEditMode !== isEditMode;

    // watch([cookQuery, isEditMode], syncCookModeWithQuery)
    let mode = pageMode;
    if (hasHydrated.current && queryChanged) {
      const target = modeForQuery({ cookQuery, isEditMode, pageMode });
      if (target !== null) {
        mode = target;
        setMode(target);
      }
    }

    // watch(pageMode): the mode (as the sync above left it) changed since the previous render
    if (hasHydrated.current && mode !== prev.pageMode) {
      if (mode === PageMode.COOK) {
        if (cookQuery !== "true") {
          setCookQuery("true");
        }
      }
      else if (mode === PageMode.VIEW) {
        setCookQuery(undefined);
      }
    }

    previous.current = { cookQuery, isEditMode, pageMode: mode };
  }, [cookQuery, isEditMode, pageMode, setMode, setCookQuery]);

  const hydrateCookMode = useCallback((current?: Partial<ModeValues>) => {
    hasHydrated.current = true;
    const values = { ...latest.current, ...current };
    const target = modeForQuery(values);
    if (target !== null) {
      values.setMode(target);
    }
  }, []);

  return {
    hydrateCookMode,
  };
}
