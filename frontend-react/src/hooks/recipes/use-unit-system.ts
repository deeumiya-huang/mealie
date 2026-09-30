import type { UnitSystem } from "@mealie-unit-systems";
import { useStorageValue } from "~/lib/storage";

/**
 * The unit system recipes are displayed in, or null to show them exactly as they were written.
 *
 * Null is the default and stays the default: a recipe reads as its author typed it until the
 * reader opts in. Nothing is inferred from their locale, because guessing wrong silently
 * rewrites every quantity on the page.
 *
 * Stored per browser rather than on the account, so it doesn't sync across devices.
 */
export function useUnitSystem() {
  const [preference, setPreference] = useStorageValue<{ unitSystem: UnitSystem | null }>(
    "recipe-unit-system-preferences",
    { unitSystem: null },
  );

  const unitSystem = preference.unitSystem;
  const setUnitSystem = (value: UnitSystem | null) => setPreference({ unitSystem: value });

  /** Whether quantities are being rewritten at all, as opposed to shown as authored. */
  const isConverting = unitSystem !== null;

  function showAsWritten() {
    setPreference({ unitSystem: null });
  }

  return { unitSystem, setUnitSystem, isConverting, showAsWritten };
}
