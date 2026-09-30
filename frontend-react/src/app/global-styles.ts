import type { Theme } from "@mui/material/styles";

/** Ported from frontend/app/assets/main.css and style-overrides.scss. */
export const globalStyles = (theme: Theme) => ({
  ".narrow-container": { maxWidth: "800px !important" },
  ".md-container": { maxWidth: "950px !important" },
  ".lg-container": { maxWidth: "1100px !important" },
  ".left-border": { borderLeft: `5px solid ${theme.palette.primary.main} !important` },
  ".left-warning-border": { borderLeft: `5px solid ${theme.palette.warning.main} !important` },
  ".handle": { cursor: "grab !important" },
  ".hidden": { visibility: "hidden !important" as const },
  ".text-hide-overflow": {
    display: "inline-block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },
  ".fill-height": { minHeight: "100vh" },
  "p": { marginTop: 0, marginBottom: 0 },
  "a": { color: theme.palette.primary.main },
  "@media print": {
    ".d-print-none": { display: "none !important" },
  },
});
