// Usage: <StatsCards icon={icons.user} to="/admin/manage/users" title={t("…")} value={count} /> — small stat card:
// round primary icon, title and value (Vue `#title` / `#value` slots); a card with `to` is a hoverable link.
import type { ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";
import { icons } from "@/lib/icons";
import { MdiIcon } from "./MdiIcon";

interface StatsCardsProps {
  icon?: string | null;
  minWidth?: string;
  to?: string | null;
  title?: ReactNode;
  value?: ReactNode;
}

export function StatsCards({ icon = null, minWidth = "", to = null, title, value }: StatsCardsProps) {
  const activeIcon = icon ?? icons.primary;

  const content = (
    <Box sx={{ display: "flex", flexWrap: "nowrap" }}>
      <Avatar sx={{ ml: 1.5, mr: 0, mt: 1.5, bgcolor: "primary.main", width: 36, height: 36 }}>
        <MdiIcon path={activeIcon} size="x-large" sx={{ color: "white", p: 0.5 }} />
      </Avatar>
      <div>
        <Typography variant="subtitle1" component="div" sx={{ px: 2, pt: 1, pb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" component="div" sx={{ px: 2, pb: 1, color: "text.secondary" }}>
          {value}
        </Typography>
      </div>
    </Box>
  );

  return (
    <Card sx={{ minWidth: minWidth || undefined }}>
      {to
        ? <CardActionArea component={Link} to={to}>{content}</CardActionArea>
        : content}
    </Card>
  );
}
