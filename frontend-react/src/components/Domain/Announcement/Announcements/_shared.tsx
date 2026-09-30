import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { Link as RouterLink } from "react-router";

/** Shared layout for announcement bodies (`p { padding-bottom: 8px }` in the Vue files). */
export function AnnouncementBody({ children }: { children: ReactNode }) {
  return <Box sx={{ "& p": { pb: 1 }, "& ul": { ml: 3 }, "& hr": { mt: 1, mb: 2 } }}>{children}</Box>;
}

export function AnnouncementLink({ to, href, children }: { to?: string; href?: string; children: ReactNode }) {
  return to
    ? <Button sx={{ mt: 1 }} variant="contained" color="primary" component={RouterLink} to={to}>{children}</Button>
    : <Button sx={{ mt: 1 }} variant="contained" color="primary" href={href ?? ""} target="_blank">{children}</Button>;
}
