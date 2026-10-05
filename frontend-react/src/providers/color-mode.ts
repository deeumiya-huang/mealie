import { useCallback, useSyncExternalStore } from "react";
import { getStorageStore } from "@/hooks/utils/use-storage";
import { useStore } from "@/lib/store";

/**
 * Port of VueUse `useDark()` as used by plugins/dark-mode.client.ts: the choice is stored under the
 * same key (`vueuse-color-scheme`: "auto" | "dark" | "light"), "auto" follows the system, and the
 * pre-paint script in index.html reads the same key.
 */
export type ColorMode = "auto" | "dark" | "light";

export const COLOR_SCHEME_KEY = "vueuse-color-scheme";

const modeStore = () => getStorageStore<ColorMode>("local", COLOR_SCHEME_KEY, "auto");

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystem(listener: () => void) {
  const query = window.matchMedia?.(DARK_QUERY);
  query?.addEventListener("change", listener);
  return () => query?.removeEventListener("change", listener);
}

function systemPrefersDark() {
  return window.matchMedia?.(DARK_QUERY).matches ?? false;
}

export function isDarkMode(mode: ColorMode, systemDark: boolean) {
  return mode === "dark" || (mode === "auto" && systemDark);
}

/** Sets dark mode like VueUse: storing "auto" when the choice equals the system preference. */
export function setDarkMode(dark: boolean) {
  const wanted: ColorMode = dark ? "dark" : "light";
  const system: ColorMode = systemPrefersDark() ? "dark" : "light";
  modeStore().set(wanted === system ? "auto" : wanted);
}

export function useColorMode() {
  const mode = useStore(modeStore());
  const systemDark = useSyncExternalStore(subscribeSystem, systemPrefersDark, () => false);
  const isDark = isDarkMode(mode, systemDark);

  const toggle = useCallback(() => setDarkMode(!isDark), [isDark]);

  return { mode, isDark, setDark: setDarkMode, toggle };
}
