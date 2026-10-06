// Usage: <RecipeTimeInput label={t("recipe.prep-time")} seconds={prepSeconds} onSecondsChange={setPrepSeconds}
//          text={prepText} onTextChange={setPrepText} />
// Hours + minutes inputs that edit a duration in seconds (plus an optional free-text suffix such as "plus overnight").
// Vue `v-model:seconds` / `v-model:text` → `seconds` + `onSecondsChange`, `text` + `onTextChange`.
import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { BaseNumberInput } from "@/components/global/BaseNumberInput";
import { useRecipeTime } from "@/hooks/recipes/use-recipe-time";

interface RecipeTimeInputProps {
  label?: string;
  hideText?: boolean;
  seconds: number | null | undefined;
  onSecondsChange: (seconds: number | null) => void;
  text?: string | null;
  onTextChange?: (text: string) => void;
}

/** Keeps hours, minutes, and any leftover seconds under the database's 2^31 - 1 limit */
const MAX_HOURS = Math.floor((2 ** 31 - 1 - 3599) / 3600);

function toSeconds(current: number | null | undefined, hours: number | null, minutes: number | null): number | null {
  // Imported times can carry seconds the inputs don't show, which shouldn't be lost on edit
  const leftover = (current ?? 0) % 60;
  const total = (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + leftover;
  return total > 0 ? total : null;
}

export function RecipeTimeInput({ label, hideText = false, seconds, onSecondsChange, text, onTextChange }: RecipeTimeInputProps) {
  const { durationUnitLabel } = useRecipeTime();

  const [hours, setHours] = useState<number | null>(() => (seconds ? Math.floor(seconds / 3600) : null));
  const [minutes, setMinutes] = useState<number | null>(() => (seconds ? Math.floor((seconds % 3600) / 60) : null));
  const [prevSeconds, setPrevSeconds] = useState(seconds);

  // Only re-split outside changes, so typing "90" minutes isn't rewritten to 1 hour 30 mid-edit
  if (seconds !== prevSeconds) {
    setPrevSeconds(seconds);
    if ((seconds ?? null) !== toSeconds(seconds, hours, minutes)) {
      setHours(seconds ? Math.floor(seconds / 3600) : null);
      setMinutes(seconds ? Math.floor((seconds % 3600) / 60) : null);
    }
  }

  function changeHours(value: number | null) {
    setHours(value);
    onSecondsChange(toSeconds(seconds, value, minutes));
  }

  function changeMinutes(value: number | null) {
    setMinutes(value);
    onSecondsChange(toSeconds(seconds, hours, value));
  }

  const inputSx = { flex: "1 1 9em", maxWidth: "12em" };

  return (
    <Box>
      {label && (
        <Typography variant="caption" sx={{ opacity: 0.8, display: "block" }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 1rem" }}>
        <BaseNumberInput
          value={hours}
          onChange={changeHours}
          min={0}
          max={MAX_HOURS}
          precision={0}
          suffix={durationUnitLabel("hour")}
          variant="underlined"
          density="compact"
          inset
          sx={inputSx}
        />
        <BaseNumberInput
          value={minutes}
          onChange={changeMinutes}
          min={0}
          precision={0}
          suffix={durationUnitLabel("minute")}
          variant="underlined"
          density="compact"
          inset
          sx={inputSx}
        />
        {/* Shown after the structured time, e.g. "3 hours" + "plus overnight" */}
        {!hideText && (
          <TextField
            value={text ?? ""}
            onChange={event => onTextChange?.(event.target.value)}
            size="small"
            variant="standard"
            sx={{ flex: "3 1 12em" }}
          />
        )}
      </Box>
    </Box>
  );
}
