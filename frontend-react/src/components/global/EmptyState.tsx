// Usage: <EmptyState icon={icons.progressCheck} color="success" headline={t("…")} title={t("…")} text={t("…")}>
//          {extra content}</EmptyState>
// Replacement for Vuetify's <v-empty-state>: centred icon, headline, title, text and content.
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { cssColor } from "./colors";
import { MdiIcon } from "./MdiIcon";

interface EmptyStateProps {
  icon?: string;
  color?: string;
  headline?: ReactNode;
  title?: ReactNode;
  text?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}

export function EmptyState({ icon, color, headline, title, text, children, actions }: EmptyStateProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", p: 2, gap: 1 }}>
      {icon && (
        <Box sx={theme => ({ color: color ? cssColor(theme, color) : "text.secondary", mb: 1 })}>
          <MdiIcon path={icon} size={96} />
        </Box>
      )}
      {headline && <Typography variant="h4" component="div">{headline}</Typography>}
      {title && <Typography variant="h6" component="div">{title}</Typography>}
      {text && <Typography variant="body2" sx={{ color: "text.secondary" }}>{text}</Typography>}
      {children}
      {actions && <Box sx={{ display: "flex", gap: 1, mt: 1 }}>{actions}</Box>}
    </Box>
  );
}
