import SvgIcon from "@mui/material/SvgIcon";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { useTheme } from "@mui/material/styles";
import { cssColor } from "~/theme/theme";

export interface IconProps extends Omit<SvgIconProps, "children" | "color" | "path" | "end" | "start"> {
  /** An @mdi/js path (the values in `icons`). */
  path?: string | null;
  /** Theme color name ("primary", "error", …) or any CSS color. */
  color?: string;
  /** Pixel size or a Vuetify size keyword. */
  size?: number | "x-small" | "small" | "default" | "large" | "x-large";
  start?: boolean;
  end?: boolean;
}

const SIZES = { "x-small": 12, "small": 16, "default": 24, "large": 28, "x-large": 32 } as const;

/** `<v-icon>{{ $globals.icons.x }}</v-icon>` equivalent. */
export function Icon({ path, color, size, start, end, sx, ...rest }: IconProps) {
  const theme = useTheme();
  const px = typeof size === "number" ? size : size ? SIZES[size] : undefined;
  if (!path) {
    return null;
  }
  return (
    <SvgIcon
      {...rest}
      sx={[
        {
          ...(px ? { fontSize: px } : {}),
          ...(color ? { color: cssColor(theme, color) } : {}),
          ...(start ? { marginInlineEnd: "8px", marginInlineStart: "-4px" } : {}),
          ...(end ? { marginInlineStart: "8px", marginInlineEnd: "-4px" } : {}),
          verticalAlign: "middle",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <path d={path} />
    </SvgIcon>
  );
}

export default Icon;
