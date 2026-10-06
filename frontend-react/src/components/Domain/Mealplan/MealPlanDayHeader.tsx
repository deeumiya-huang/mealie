// Usage: <MealPlanDayHeader day={date}>{actions}</MealPlanDayHeader> — the card with the day's date (highlighted when it is
// today) and, on the right, the children (the day's action buttons).
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import { isSameDay } from "date-fns";
import { useI18n } from "@/i18n";

interface MealPlanDayHeaderProps {
  day: Date;
  children?: ReactNode;
}

const isToday = (date: Date) => {
  return isSameDay(date, new Date());
};

export function MealPlanDayHeader({ day, children }: MealPlanDayHeaderProps) {
  const { d } = useI18n();

  return (
    <Card variant="outlined" sx={{ border: "2px solid", borderColor: "primary.main", borderRadius: 1, px: 1, zIndex: 2 }}>
      <Box sx={{ px: 0, display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <Box
          component="p"
          sx={{ pl: 1, ...(isToday(day) ? { color: "primary.main", fontWeight: "bold" } : {}) }}
        >
          {d(day, "short")}
        </Box>
        {children}
      </Box>
    </Card>
  );
}
