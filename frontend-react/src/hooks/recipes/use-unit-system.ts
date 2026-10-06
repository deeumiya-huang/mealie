import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/utils";
import type { UnitSystem } from "./unit-systems";

/**
 * The unit system recipes are displayed in, or null to show them exactly as they were written.
 *
 * Null is the default and stays the default: a recipe reads as its author typed it until the
 * reader opts in. Nothing is inferred from their locale, because guessing wrong silently
 * rewrites every quantity on the page.
 *
 * Stored per browser rather than on the account — there's no household or user setting for
 * this, so it doesn't sync across devices.
 *
 * Vue's writable `unitSystem` computed is `unitSystem` + `setUnitSystem(value)`.
 */
export function useUnitSystem() {
  const [preference, setPreference] = useLocalStorage<{ unitSystem: UnitSystem | null }>(
    "recipe-unit-system-preferences",
    { unitSystem: null },
    { mergeDefaults: true },
  );

  const unitSystem = preference.unitSystem;

  const setUnitSystem = useCallback((value: UnitSystem | null) => {
    setPreference(current => ({ ...current, unitSystem: value }));
  }, [setPreference]);

  /** Whether quantities are being rewritten at all, as opposed to shown as authored. */
  const isConverting = unitSystem !== null;

  const showAsWritten = useCallback(() => {
    setPreference(current => ({ ...current, unitSystem: null }));
  }, [setPreference]);

  return { unitSystem, setUnitSystem, isConverting, showAsWritten };
}
