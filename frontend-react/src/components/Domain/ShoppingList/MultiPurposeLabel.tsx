import Chip from "@mui/material/Chip";
import type { ChipProps } from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";
import type { MultiPurposeLabelSummary } from "~/lib/api/types/recipe";

export interface MultiPurposeLabelProps extends Omit<ChipProps, "label" | "color"> {
  label: Pick<MultiPurposeLabelSummary, "name" | "color">;
}

/** A label rendered as a flat chip in the label's own color. */
export function MultiPurposeLabel({ label, sx, ...rest }: MultiPurposeLabelProps) {
  const theme = useTheme();
  let colorSx = {};
  if (label.color) {
    try {
      colorSx = { bgcolor: label.color, color: theme.palette.getContrastText(label.color) };
    }
    catch {
      // not a color MUI can parse: fall back to the default chip colors
    }
  }
  return (
    <Chip
      {...rest}
      label={<span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{label.name}</span>}
      sx={[{ borderRadius: 1 }, colorSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
}

export default MultiPurposeLabel;
