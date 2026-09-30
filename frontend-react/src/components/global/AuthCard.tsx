import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseDivider } from "./BaseDivider";

/** Shared frame of the forgot/reset password pages (a flat 600px card with a login link). */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  const i18n = useI18n();
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 48px)", p: 2 }}>
      <Card elevation={0} sx={{ bgcolor: "background.default", display: "flex", flexDirection: "column", alignItems: "center", width: 600, maxWidth: "100%" }}>
        <Typography variant="h5" sx={{ textAlign: "center", py: 2 }}>{title}</Typography>
        <BaseDivider />
        <CardContent sx={{ width: "100%" }}>{children}</CardContent>
        <Button sx={{ mx: "auto" }} variant="text" component={RouterLink} to="/login">{i18n.t("user.login")}</Button>
      </Card>
    </Box>
  );
}

export default AuthCard;
