// Usage: <MultiPurposeLabel label={label} sx={{ my: 1 }} /> — a flat, squared chip showing the label's name in
// the label's colour. Extra props (sx, className, …) go to the chip, like Vue's `$attrs`.
import Chip, { type ChipProps } from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";
import type { MultiPurposeLabelSummary } from "@/lib/api/types/recipe";

interface MultiPurposeLabelProps extends Omit<ChipProps, "label" | "color" | "variant"> {
  /** Only `name` and `color` are read, so a form model of a label can be passed too. */
  label: Pick<MultiPurposeLabelSummary, "name"> & { color?: string | null };
}

export function MultiPurposeLabel({ label, sx, ...chipProps }: MultiPurposeLabelProps) {
  const theme = useTheme();
  const color = label.color || undefined;
  let textColor: string | undefined;
  if (color) {
    try {
      textColor = theme.palette.getContrastText(color);
    }
    catch {
      // not a colour MUI can parse (e.g. a CSS keyword): keep the chip's own text colour
      textColor = undefined;
    }
  }

  return (
    <Chip
      {...chipProps}
      variant="filled"
      sx={[
        { borderRadius: 1 },
        color
          ? { backgroundColor: color, color: textColor }
          : {},
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      label={(
        <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label.name}
        </span>
      )}
    />
  );
}
