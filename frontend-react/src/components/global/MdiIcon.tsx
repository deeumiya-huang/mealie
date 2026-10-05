// Usage: <MdiIcon path={icons.edit} /> — replaces <v-icon>{{ $globals.icons.edit }}</v-icon>.
// `path` is an @mdi/js SVG path (lib/icons). `size` takes Vuetify's names ("x-small" … "x-large") or px.
import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";

export type IconSize = "x-small" | "small" | "default" | "large" | "x-large" | number;

const SIZES: Record<Exclude<IconSize, number>, number> = {
  "x-small": 12,
  "small": 16,
  "default": 24,
  "large": 28,
  "x-large": 32,
};

export interface MdiIconProps extends Omit<SvgIconProps, "children" | "fontSize" | "size" | "path"> {
  path?: string | null;
  size?: IconSize;
}

export function MdiIcon({ path, size = "default", sx, ...props }: MdiIconProps) {
  const px = typeof size === "number" ? size : SIZES[size];
  return (
    <SvgIcon {...props} sx={[{ fontSize: px }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {path ? <path d={path} /> : null}
    </SvgIcon>
  );
}
