import { useCallback, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useUserExperiencePreferences } from "~/hooks/use-users/preferences";
import { SwitchInput } from "./form";

const wakeIsSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;

/** Keeps the screen awake while a recipe is open (@vueuse/core useWakeLock in the Vue app). */
export function WakelockSwitch() {
  const i18n = useI18n();
  const display = useDisplay();
  const [prefs, setPrefs] = useUserExperiencePreferences();
  const sentinel = useRef<WakeLockSentinel | null>(null);

  const lockScreen = useCallback(async () => {
    if (!wakeIsSupported) return;
    console.debug("Wake Lock Requested");
    try {
      sentinel.current = await navigator.wakeLock.request("screen");
    }
    catch (e) {
      console.warn(e);
    }
  }, []);

  const unlockScreen = useCallback(async () => {
    if (wakeIsSupported || sentinel.current) {
      console.debug("Wake Lock Released");
      await sentinel.current?.release();
      sentinel.current = null;
    }
  }, []);

  useEffect(() => {
    if (prefs.lockScreen) void lockScreen();
    else void unlockScreen();
  }, [prefs.lockScreen, lockScreen, unlockScreen]);

  useEffect(() => {
    // The browser drops the lock when the page is hidden; take it back when it returns.
    const onVisible = () => {
      if (document.visibilityState === "visible" && prefs.lockScreen) void lockScreen();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [prefs.lockScreen, lockScreen]);

  useEffect(() => () => void unlockScreen(), [unlockScreen]);

  if (!wakeIsSupported) return null;
  return (
    <Box className="d-print-none" sx={{ display: "flex", px: 1, justifyContent: display.smAndDown ? "center" : "flex-end" }}>
      <SwitchInput
        checked={prefs.lockScreen}
        onChange={() => setPrefs({ lockScreen: !prefs.lockScreen })}
        color="primary"
        label={i18n.t("recipe.screen-awake")}
      />
    </Box>
  );
}

export default WakelockSwitch;
