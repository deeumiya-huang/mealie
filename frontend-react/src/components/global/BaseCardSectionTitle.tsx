// Usage: <BaseCardSectionTitle title={t("profile.account-summary")} icon={icons.user} section>
//          {t("…description")}</BaseCardSectionTitle>
// Section heading with an optional icon, description (children) and a divider below.
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { MdiIcon } from "./MdiIcon";

type Size = "large" | "medium" | "small";

// Vuetify typography: text-title-large / -medium / -small
const TITLE_STYLES: Record<Size, { fontSize: string; lineHeight: string; letterSpacing: string }> = {
  large: { fontSize: "1.375rem", lineHeight: "1.75rem", letterSpacing: "0" },
  medium: { fontSize: "1rem", lineHeight: "1.5rem", letterSpacing: "0.009375em" },
  small: { fontSize: "0.875rem", lineHeight: "1.25rem", letterSpacing: "0.0071428571em" },
};

interface BaseCardSectionTitleProps {
  title: string;
  size?: Size;
  icon?: string;
  section?: boolean;
  prependTitle?: ReactNode;
  appendTitle?: ReactNode;
  children?: ReactNode;
}

export function BaseCardSectionTitle({ title, size = "large", icon = "", section = false, prependTitle, appendTitle, children }: BaseCardSectionTitleProps) {
  return (
    <Box sx={{ pb: 1, mt: section ? 4 : 0, bgcolor: "background.default" }}>
      <Box sx={{ ...TITLE_STYLES[size], display: "flex", alignItems: "center", fontWeight: "normal", pt: 0, pb: 0 }}>
        {prependTitle}
        {icon && <MdiIcon path={icon} size="small" sx={{ mr: 1 }} />}
        {title}
        {appendTitle}
      </Box>
      {children !== undefined && children !== null && children !== false && (
        <Box sx={{ pt: 1, pb: 2 }}>
          <Typography component="p" variant="body2" sx={{ m: 0, color: "text.secondary" }}>{children}</Typography>
        </Box>
      )}
      <Divider sx={{ mt: 0.5, mb: 1.5 }} />
    </Box>
  );
}
