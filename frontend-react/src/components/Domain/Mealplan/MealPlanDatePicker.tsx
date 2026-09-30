import { useState } from "react";
import { addMonths, format, isSameDay, isWithinInterval } from "date-fns";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickerDay } from "@mui/x-date-pickers/PickerDay";
import type { PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import type { PlanEntryType } from "~/lib/api/types/meal-plan";
import { useMealplans } from "~/hooks/use-group-mealplan";

type Value = Date | [Date, Date];

export interface MealPlanDatePickerProps<V extends Value> {
  value: V | undefined;
  onChange: (value: V) => void;
  entryType?: PlanEntryType;
  /** `multiple="range"`: two clicks pick a start and an end date. */
  range?: boolean;
  firstDayOfWeek?: number;
}

/**
 * Calendar that marks days with planned meals (primary when a meal of `entryType` exists, grey for
 * other meals), like the Vue v-date-picker `events` callback.
 */
export function MealPlanDatePicker<V extends Value>({ value, onChange, entryType, range = false }: MealPlanDatePickerProps<V>) {
  const theme = useTheme();
  const [target, setTarget] = useState(new Date());
  const { mealplans } = useMealplans({ start: addMonths(target, -1), end: addMonths(target, 2) });
  const [awaitingEnd, setAwaitingEnd] = useState(false);

  const start: Date | undefined = Array.isArray(value) ? value[0] : (value as Date | undefined);
  const end: Date | undefined = Array.isArray(value) ? value[1] : (value as Date | undefined);

  function markerColor(date: Date): string | null {
    const key = format(date, "yyyy-MM-dd");
    const planned = mealplans ?? [];
    const dateMatched = planned.filter(meal => meal.date === key);
    if (!dateMatched.length) return null;
    const typeMatched = dateMatched.filter(meal => !entryType || meal.entryType === entryType);
    const isSelected = (start && isSameDay(date, start)) || (end && isSameDay(date, end));
    if (typeMatched.length) return isSelected ? theme.palette.primary.light : theme.palette.primary.main;
    return isSelected ? theme.palette.grey[300] : theme.palette.grey[500];
  }

  function Day(props: PickerDayProps) {
    const { day, outsideCurrentMonth, ...rest } = props;
    const date = day as Date;
    const color = outsideCurrentMonth ? null : markerColor(date);
    const inRange = range && start && end && !isSameDay(start, end) && isWithinInterval(date, { start, end });
    return (
      <Box sx={{ position: "relative", ...(inRange ? { bgcolor: "action.selected", borderRadius: 0 } : {}) }}>
        <PickerDay {...rest} day={day} outsideCurrentMonth={outsideCurrentMonth} selected={!!start && (isSameDay(date, start) || (!!end && isSameDay(date, end)))} />
        {color && (
          <Box sx={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 6, height: 6, borderRadius: "50%", bgcolor: color }} />
        )}
      </Box>
    );
  }

  return (
    <DateCalendar
      value={start ?? null}
      onChange={(next: Date | null) => {
        if (!next) return;
        if (!range) {
          onChange(next as V);
          return;
        }
        if (!awaitingEnd || !start || next < start) {
          onChange([next, next] as V);
          setAwaitingEnd(true);
        }
        else {
          onChange([start, next] as V);
          setAwaitingEnd(false);
        }
      }}
      showDaysOutsideCurrentMonth
      onMonthChange={(m: Date) => setTarget(m)}
      onYearChange={(y: Date) => setTarget(y)}
      slots={{ day: Day }}
      sx={{ mx: "auto" }}
    />
  );
}

export default MealPlanDatePicker;
