import type { ReactNode } from "react";
import { isSameDay } from "date-fns";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { useI18n } from "~/hooks/use-global-i18n";

export function MealPlanDayHeader({ day, children }: { day: Date; children?: ReactNode }) {
  const i18n = useI18n();
  const isToday = isSameDay(day, new Date());
  return (
    <Card sx={{ borderRadius: 0.5, px: 1, zIndex: 2, borderLeft: theme => `4px solid ${theme.palette.primary.main}` }}>
      <Box sx={{ px: 0, display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <Typography sx={{ pl: 1, ...(isToday ? { color: "primary.main", fontWeight: "bold" } : {}) }}>
          {i18n.d(day, "short")}
        </Typography>
        {children}
      </Box>
    </Card>
  );
}

export default MealPlanDayHeader;
