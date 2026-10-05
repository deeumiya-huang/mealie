// Usage: <BaseDivider /> · <BaseDivider width="50px" thickness="4px" color="primary" />
import Divider from "@mui/material/Divider";
import { cssColor } from "./colors";

interface BaseDividerProps {
  width?: string;
  thickness?: string;
  color?: string;
}

export function BaseDivider({ width = "100px", thickness = "2px", color = "accent" }: BaseDividerProps) {
  return (
    <Divider
      sx={theme => ({
        width,
        borderWidth: thickness,
        borderStyle: "solid",
        borderColor: cssColor(theme, color),
      })}
    />
  );
}
