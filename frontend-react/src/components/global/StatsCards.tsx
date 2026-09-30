import type { ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router";
import { icons } from "~/lib/icons";
import { Icon } from "./Icon";

export interface StatsCardsProps {
  icon?: string | null;
  minWidth?: string;
  to?: string | null;
  title?: ReactNode;
  value?: ReactNode;
}

export function StatsCards({ icon = null, minWidth = "", to = null, title, value }: StatsCardsProps) {
  const body = (
    <Box sx={{ display: "flex", flexWrap: "nowrap" }}>
      <Avatar sx={{ ml: 1.5, mr: 0, mt: 1.5, width: 36, height: 36, bgcolor: "primary.main" }}>
        <Icon path={icon ?? icons.primary} color="white" size="x-large" sx={{ p: 0.5 }} />
      </Avatar>
      <div>
        <Typography variant="subtitle1" sx={{ px: 2, pt: 1, pb: 1 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 1 }}>{value}</Typography>
      </div>
    </Box>
  );
  return (
    <Card sx={{ minWidth: minWidth || undefined }}>
      {to ? <CardActionArea component={RouterLink} to={to}>{body}</CardActionArea> : body}
    </Card>
  );
}

export default StatsCards;
