import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import { cssColor } from "~/theme/theme";

export function BaseDivider({ width = "100px", thickness = "2px", color = "accent" }: { width?: string; thickness?: string; color?: string }) {
  const theme = useTheme();
  return <Divider sx={{ width, borderWidth: thickness, borderColor: cssColor(theme, color) }} />;
}

export default BaseDivider;
