import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { icons } from "~/lib/icons";
import { Icon } from "./Icon";

export function BannerWarning({ title = "", description = "", children }: { title?: string; description?: string; children?: ReactNode }) {
  return (
    <Alert
      severity="warning"
      variant="standard"
      icon={<Icon path={icons.alert} />}
      sx={{ borderInlineStart: 4, borderColor: "warning.main", boxShadow: 2 }}
    >
      {title && <b>{title}</b>}
      {description && <div>{description}</div>}
      {children && <Box sx={{ py: 1 }}>{children}</Box>}
    </Alert>
  );
}

export default BannerWarning;
