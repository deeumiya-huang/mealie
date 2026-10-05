// Usage: <BannerWarning title={…} description={…}>{extra}</BannerWarning> — tonal warning alert with a left border.
import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { icons } from "@/lib/icons";
import { MdiIcon } from "./MdiIcon";

interface BannerWarningProps {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export function BannerWarning({ title = "", description = "", children }: BannerWarningProps) {
  return (
    <Alert
      severity="warning"
      variant="standard"
      elevation={2}
      icon={<MdiIcon path={icons.alert} />}
      sx={{ borderLeft: 4, borderLeftStyle: "solid", borderLeftColor: "warning.main" }}
    >
      {title ? <b>{title}</b> : null}
      {description ? <div>{description}</div> : null}
      {children ? <Box sx={{ py: 1 }}>{children}</Box> : null}
    </Alert>
  );
}
