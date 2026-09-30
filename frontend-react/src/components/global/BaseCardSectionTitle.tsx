import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { Icon } from "./Icon";

type Size = "large" | "medium" | "small";

export interface BaseCardSectionTitleProps {
  title: string;
  size?: Size;
  icon?: string;
  section?: boolean;
  prependTitle?: ReactNode;
  appendTitle?: ReactNode;
  children?: ReactNode;
}

const VARIANTS = { large: "h5", medium: "h6", small: "subtitle1" } as const;

export function BaseCardSectionTitle({ title, size = "large", icon = "", section = false, prependTitle, appendTitle, children }: BaseCardSectionTitleProps) {
  return (
    <Box sx={{ pb: 1, mt: section ? 4 : 0 }}>
      <Typography variant={VARIANTS[size]} component="div" sx={{ display: "flex", alignItems: "center", fontWeight: "normal" }}>
        {prependTitle}
        {icon && <Icon path={icon} size="small" start />}
        {title}
        {appendTitle}
      </Typography>
      {children && (
        <Box sx={{ pt: 1 }}>
          <Typography component="div" variant="body2">{children}</Typography>
        </Box>
      )}
      <Divider sx={{ mt: 0.5, mb: 1.5 }} />
    </Box>
  );
}

export default BaseCardSectionTitle;
