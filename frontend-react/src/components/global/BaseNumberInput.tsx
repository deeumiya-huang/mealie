// Usage: <BaseNumberInput label={t("recipe.servings")} value={servings} onChange={setServings} min={0} precision={null} />
// Replacement for <v-number-input>: a number field with −/+ steppers (`controlVariant="hidden"` hides them),
// clamped to min/max (steppers are mouse-only like Vuetify's; keyboard uses the native arrows),, rounded to `precision` decimals (null = unrounded, Vuetify default 0). Empty → null.
import { useState, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { icons } from "@/lib/icons";
import { MdiIcon } from "./MdiIcon";

type Variant = "outlined" | "filled" | "underlined" | "plain";

export interface BaseNumberInputProps extends Omit<TextFieldProps, "value" | "onChange" | "variant" | "type" | "prefix"> {
  value: number | null | undefined;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number | null;
  variant?: Variant;
  density?: "default" | "comfortable" | "compact";
  controlVariant?: "default" | "stacked" | "split" | "hidden";
  /** Vuetify `inset`: kept for parity (visual only). */
  inset?: boolean;
  hint?: string;
  persistentHint?: boolean;
  hideDetails?: boolean;
  suffix?: ReactNode;
  prefix?: ReactNode;
}

/** A caller's slot props to merge with ours (callback slot props are not supported here). */
function objectSlot(props: unknown): Record<string, unknown> {
  return props && typeof props === "object" ? props as Record<string, unknown> : {};
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function BaseNumberInput({
  value, onChange, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, step = 1, precision = 0,
  variant = "filled", density = "default", controlVariant = "default", inset: _inset, hint, persistentHint: _persistentHint,
  hideDetails = false, suffix, prefix, slotProps, ...props
}: BaseNumberInputProps) {
  // the text being typed, while it differs from the committed number (e.g. "1." or "")
  const [draft, setDraft] = useState<string | null>(null);

  const round = (n: number) => (precision === null ? n : Number(n.toFixed(precision)));
  const commit = (n: number | null) => onChange?.(n === null ? null : clamp(round(n), min, max));
  const current = value ?? null;
  const shown = draft ?? (current === null ? "" : String(current));

  const stepBy = (direction: 1 | -1) => {
    setDraft(null);
    commit((current ?? 0) + direction * step);
  };

  const muiVariant = variant === "underlined" || variant === "plain" ? "standard" : variant;
  const controls = controlVariant !== "hidden" && !props.disabled;

  return (
    <TextField
      {...props}
      type="number"
      variant={muiVariant}
      size={density === "compact" ? "small" : "medium"}
      value={shown}
      helperText={hideDetails ? undefined : (props.helperText ?? hint)}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        if (text === "") {
          onChange?.(null);
          return;
        }
        const parsed = Number(text);
        if (Number.isNaN(parsed)) return;
        commit(parsed);
        // more decimals than `precision` (Vuetify blocks those keys): show the rounded value right away
        if (round(parsed) !== parsed) setDraft(null);
      }}
      onBlur={(event) => {
        setDraft(null);
        props.onBlur?.(event);
      }}
      slotProps={{
        ...slotProps,
        htmlInput: { ...objectSlot(slotProps?.htmlInput), min, max, step, inputMode: "decimal" },
        input: {
          ...objectSlot(slotProps?.input),
          startAdornment: prefix ? <InputAdornment position="start">{prefix}</InputAdornment> : undefined,
          endAdornment: (suffix || controls)
            ? (
                <InputAdornment position="end">
                  {suffix}
                  {controls && (
                    <>
                      <IconButton size="small" tabIndex={-1} aria-hidden disabled={(current ?? 0) <= min} onClick={() => stepBy(-1)}>
                        <MdiIcon path={icons.minus} size="small" />
                      </IconButton>
                      <IconButton size="small" tabIndex={-1} aria-hidden disabled={(current ?? 0) >= max} onClick={() => stepBy(1)}>
                        <MdiIcon path={icons.createAlt} size="small" />
                      </IconButton>
                    </>
                  )}
                </InputAdornment>
              )
            : undefined,
        },
      }}
    />
  );
}
