// Usage: <BasePageTitle divider header={<img …/>} title={t("user.profile")}>{t("…subtitle")}</BasePageTitle>
// Centred page heading (h2) with optional header, subtitle (children, h3) and a `content` row.
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

interface BasePageTitleProps {
  header?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  content?: ReactNode;
  divider?: boolean;
}

export function BasePageTitle({ header, title, children, content, divider = false }: BasePageTitleProps) {
  return (
    <Box sx={{ mt: 2 }}>
      <Box component="section" sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {header}
        <Typography component="h2" variant="h5">
          {/* same fallback as the Vue slot */}
          {title ?? "👋 Here's a Title"}
        </Typography>
        <Typography component="h3" sx={{ fontSize: "1rem", fontWeight: "normal", color: "text.secondary" }}>
          {children}
        </Typography>
      </Box>
      <Box component="section" sx={{ display: "flex" }}>
        {content}
      </Box>
      {divider && <Divider sx={{ my: 2 }} />}
    </Box>
  );
}
