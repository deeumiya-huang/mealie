import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { publicUrl } from "~/lib/constants";

export interface BasePageTitleProps {
  divider?: boolean;
  header?: ReactNode;
  title?: ReactNode;
  content?: ReactNode;
  children?: ReactNode;
}

export function BasePageTitle({ divider = false, header, title, content, children }: BasePageTitleProps) {
  return (
    <Box sx={{ mt: 2 }}>
      <Box component="section" sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {header}
        <Typography variant="h5" component="h2">
          {title ?? "👋 Here's a Title"}
        </Typography>
        <Typography component="h3" sx={{ fontSize: "1rem", fontWeight: "normal", color: "text.secondary", textAlign: "center" }}>
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

export default BasePageTitle;

export interface BasePageTitleImageProps {
  /** Path under frontend/public, e.g. "/svgs/manage-members.svg". */
  src: string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

/** The illustration most pages put in `<BasePageTitle>`'s header slot (`<v-img width="100%" …>`). */
export function BasePageTitleImage({ src, maxWidth = 150, maxHeight = 200 }: BasePageTitleImageProps) {
  return (
    <Box
      component="img"
      src={publicUrl(src)}
      alt=""
      sx={{ width: "100%", maxWidth, maxHeight, objectFit: "contain" }}
    />
  );
}
