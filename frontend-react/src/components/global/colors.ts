// Vuetify colour names used by the Vue templates → MUI. Theme palette keys map to the `color` prop;
// anything else ("grey", hex values) is applied as a plain CSS colour.
import type { Theme } from "@mui/material/styles";

export const PALETTE_COLORS = ["primary", "secondary", "accent", "success", "info", "warning", "error"] as const;
export type PaletteColor = (typeof PALETTE_COLORS)[number];

export function isPaletteColor(color: string | null | undefined): color is PaletteColor {
  return !!color && (PALETTE_COLORS as readonly string[]).includes(color);
}

/** CSS colour for a Vuetify colour name (palette key, "grey", "white", or a CSS colour). */
export function cssColor(theme: Theme, color: string): string {
  if (isPaletteColor(color)) return theme.palette[color].main;
  if (color === "grey") return theme.palette.grey[600];
  return color;
}

/** Vuetify accepts numbers (px) and strings for sizes. */
export function cssSize(value: number | string | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return typeof value === "number" || /^\d+(\.\d+)?$/.test(value) ? `${value}px` : value;
}
