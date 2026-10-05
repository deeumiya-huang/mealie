// Usage: <WakelockSwitch /> — "Screen awake" switch (hidden when the browser has no Wake Lock API) that keeps the
// screen on while the page is open; the choice is stored in the `user-experience-preferences` local storage entry.
import { useEffect } from "react";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useDisplay, useLocalStorage, useWakeLock } from "@/hooks/utils";
import { useI18n } from "@/i18n";

export function WakelockSwitch() {
  const { t } = useI18n();
  const { smAndDown } = useDisplay();
  const { isSupported: wakeIsSupported, isActive, request, release } = useWakeLock();
  const [userExperiencePreferences, setUserExperiencePreferences] = useLocalStorage(
    "user-experience-preferences",
    { lockScreen: true },
    { mergeDefaults: true },
  );

  async function lockScreen() {
    if (wakeIsSupported) {
      console.debug("Wake Lock Requested");
      await request("screen");
    }
  }

  async function unlockScreen() {
    if (wakeIsSupported || isActive) {
      console.debug("Wake Lock Released");
      await release();
    }
  }

  function handleLock(lockScreenEnabled: boolean) {
    if (lockScreenEnabled) {
      void lockScreen();
    }
    else {
      void unlockScreen();
    }
  }

  function onToggle() {
    const next = !userExperiencePreferences.lockScreen;
    setUserExperiencePreferences({ ...userExperiencePreferences, lockScreen: next });
    handleLock(next);
  }

  useEffect(() => {
    handleLock(userExperiencePreferences.lockScreen);
    return () => {
      void unlockScreen();
    };
    // mount/unmount only, like onMounted/onUnmounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!wakeIsSupported) {
    return null;
  }

  return (
    <Box sx={{ "display": "flex", "px": 1, "justifyContent": smAndDown ? "center" : "flex-end", "@media print": { display: "none" } }}>
      <FormControlLabel
        control={<Switch color="primary" checked={userExperiencePreferences.lockScreen} onChange={onToggle} />}
        label={t("recipe.screen-awake")}
      />
    </Box>
  );
}
