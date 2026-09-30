import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useRecipeTime } from "~/hooks/recipes";
import { NumberInput, TextInput } from "~/components/global/form";

/** Keeps hours, minutes, and any leftover seconds under the database's 2^31 - 1 limit */
const MAX_HOURS = Math.floor((2 ** 31 - 1 - 3599) / 3600);

export interface RecipeTimeInputProps {
  label?: string;
  hideText?: boolean;
  seconds: number | null | undefined;
  onSecondsChange: (seconds: number | null) => void;
  text?: string | null;
  onTextChange?: (text: string) => void;
}

export function RecipeTimeInput({ label, hideText, seconds, onSecondsChange, text, onTextChange }: RecipeTimeInputProps) {
  const { durationUnitLabel } = useRecipeTime();
  const [hours, setHours] = useState<number | null>(seconds ? Math.floor(seconds / 3600) : null);
  const [minutes, setMinutes] = useState<number | null>(seconds ? Math.floor((seconds % 3600) / 60) : null);
  const latestSeconds = useRef(seconds);
  latestSeconds.current = seconds;

  function toSeconds(h: number | null, m: number | null): number | null {
    // Imported times can carry seconds the inputs don't show, which shouldn't be lost on edit
    const leftover = (latestSeconds.current ?? 0) % 60;
    const total = (h ?? 0) * 3600 + (m ?? 0) * 60 + leftover;
    return total > 0 ? total : null;
  }

  useEffect(() => {
    // Only re-split outside changes, so typing "90" minutes isn't rewritten to 1 hour 30 mid-edit
    if ((seconds ?? null) === toSeconds(hours, minutes)) return;
    setHours(seconds ? Math.floor(seconds / 3600) : null);
    setMinutes(seconds ? Math.floor((seconds % 3600) / 60) : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- watch(seconds)
  }, [seconds]);

  return (
    <div>
      {label && <Typography variant="caption" sx={{ opacity: 0.8 }}>{label}</Typography>}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: "1rem" }}>
        <Box sx={{ flex: "1 1 9em", maxWidth: "12em" }}>
          <NumberInput
            value={hours}
            onChange={(h) => {
              setHours(h);
              onSecondsChange(toSeconds(h, minutes));
            }}
            min={0}
            max={MAX_HOURS}
            step={1}
            suffix={durationUnitLabel("hour")}
            variant="underlined"
          />
        </Box>
        <Box sx={{ flex: "1 1 9em", maxWidth: "12em" }}>
          <NumberInput
            value={minutes}
            onChange={(m) => {
              setMinutes(m);
              onSecondsChange(toSeconds(hours, m));
            }}
            min={0}
            step={1}
            suffix={durationUnitLabel("minute")}
            variant="underlined"
          />
        </Box>
        {/* Shown after the structured time, e.g. "3 hours" + "plus overnight" */}
        {!hideText && (
          <Box sx={{ flex: "3 1 12em" }}>
            <TextInput value={text ?? ""} onChange={v => onTextChange?.(v)} variant="underlined" />
          </Box>
        )}
      </Box>
    </div>
  );
}

export default RecipeTimeInput;
