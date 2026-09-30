import { createStore, useStore } from "~/lib/store";
import type { ThemeMode } from "./theme";

/** Same storage key @vueuse/core's useDark used, so the preference survives the migration. */
const STORAGE_KEY = "vueuse-color-scheme";
type Preference = "auto" | "light" | "dark";

function readPreference(): Preference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "auto";
  }
  catch {
    return "auto";
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

function resolve(pref: Preference): ThemeMode {
  if (pref === "auto") {
    return systemPrefersDark() ? "dark" : "light";
  }
  return pref;
}

export const colorSchemeStore = createStore<ThemeMode>(() => resolve(readPreference()));

if (typeof window !== "undefined" && window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    colorSchemeStore.set(resolve(readPreference()));
  });
}

export function setDark(dark: boolean): void {
  const mode: ThemeMode = dark ? "dark" : "light";
  try {
    // useDark stored "auto" when the choice matched the system preference.
    localStorage.setItem(STORAGE_KEY, (systemPrefersDark() === dark) ? "auto" : mode);
  }
  catch {
    // storage unavailable
  }
  document.documentElement.style.backgroundColor = dark ? "#1E1E1E" : "#FFFFFF";
  colorSchemeStore.set(mode);
}

export function useDark(): [boolean, (dark: boolean) => void] {
  const mode = useStore(colorSchemeStore);
  return [mode === "dark", setDark];
}
