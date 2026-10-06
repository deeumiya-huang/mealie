// Usage: <MealPlanDatePicker value={date} onChange={setDate} entryType="dinner" /> · multiple="range" with
// `value` = the days of the range (the first click starts a range, the second completes it, like Vuetify).
// A calendar that marks days with a meal-plan entry (a dot; primary when an entry of `entryType` exists,
// grey for other entry types). Month changes load the surrounding entries. `firstDayOfWeek` defaults to the
// household preference.
import { createContext, useContext, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { lighten, type Theme } from "@mui/material/styles";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import type { PickersCalendarHeaderProps } from "@mui/x-date-pickers/PickersCalendarHeader";
import { PickerDay, type PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import { addDays, addMonths, differenceInCalendarDays, format, startOfDay } from "date-fns";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useMealplans } from "@/hooks/use-group-mealplan";
import { useHouseholdSelf } from "@/hooks/use-households";
import type { PlanEntryType } from "@/lib/api/types/meal-plan";
import { icons } from "@/lib/icons";
import { WeekStartLocalization } from "./WeekStartLocalization";

type EventColor = "primary" | "primary-lighten-3" | "grey" | "grey-lighten-3";

interface DayContextValue {
  selected: ReadonlySet<string>;
  eventColor: (date: string) => EventColor | false;
}

const DayContext = createContext<DayContextValue>({ selected: new Set(), eventColor: () => false });

const dateKey = (date: Date) => format(date, "yyyy-MM-dd");

function resolveEventColor(theme: Theme, color: EventColor): string {
  switch (color) {
    case "primary": return theme.palette.primary.main;
    case "primary-lighten-3": return lighten(theme.palette.primary.main, 0.6);
    case "grey": return theme.palette.grey[500];
    case "grey-lighten-3": return theme.palette.grey[300];
  }
}

function MealPlanDay(props: PickerDayProps) {
  const { selected: selectedKeys, eventColor } = useContext(DayContext);
  const key = dateKey(props.day);
  const color = eventColor(key);

  return (
    <PickerDay
      {...props}
      selected={selectedKeys.has(key)}
      sx={theme => ({
        "&::after": {
          content: "\"\"",
          display: color ? "block" : "none",
          position: "absolute",
          bottom: 3,
          left: "50%",
          width: 4,
          height: 4,
          borderRadius: "50%",
          transform: "translateX(-50%)",
          backgroundColor: color ? resolveEventColor(theme, color) : "transparent",
        },
      })}
    />
  );
}

function MealPlanCalendarHeader({ currentMonth, onMonthChange }: PickersCalendarHeaderProps) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", px: 1 }}>
      <IconButton onClick={() => onMonthChange(addMonths(currentMonth, -1))}>
        <MdiIcon path={icons.chevronLeft} />
      </IconButton>
      <Box sx={{ textAlign: "center" }}>
        <Box sx={{ typography: "body1", fontSize: "1rem" }}>{format(currentMonth, "MMMM")}</Box>
        <Box sx={{ typography: "caption" }}>{format(currentMonth, "yyyy")}</Box>
      </Box>
      <IconButton onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
        <MdiIcon path={icons.chevronRight} />
      </IconButton>
    </Box>
  );
}

interface MealPlanDatePickerProps {
  value?: Date | Date[];
  onChange?: (value: Date | Date[]) => void;
  entryType?: PlanEntryType;
  multiple?: boolean | "range";
  firstDayOfWeek?: number;
}

export function MealPlanDatePicker({ value, onChange, entryType, multiple = false, firstDayOfWeek }: MealPlanDatePickerProps) {
  const { household } = useHouseholdSelf();
  const weekStart = firstDayOfWeek ?? (household?.preferences?.firstDayOfWeek || 0);

  const [target, setTarget] = useState(() => new Date());
  const { mealplans } = useMealplans({ start: addMonths(target, -1), end: addMonths(target, 2) });

  const selectedDates = value === undefined ? [] : Array.isArray(value) ? value : [value];
  const selected = new Set(selectedDates.map(dateKey));

  function eventColor(date: string): EventColor | false {
    const planned = mealplans ?? [];
    const dateMatched = planned.filter(meal => meal.date === date);
    const typeMatched = dateMatched.filter(meal => !entryType || meal.entryType === entryType);
    const isSelected = selected.has(date);
    if (!dateMatched.length) return false;
    if (typeMatched.length) return isSelected ? "primary-lighten-3" : "primary";
    return isSelected ? "grey-lighten-3" : "grey";
  }

  function onDaySelected(picked: Date | null) {
    if (!picked) return;
    const day = startOfDay(picked);

    if (multiple === "range") {
      if (selectedDates.length === 1 && selectedDates[0]) {
        const [first, second] = selectedDates[0] <= day ? [selectedDates[0], day] : [day, selectedDates[0]];
        const days: Date[] = [];
        for (let i = 0; i <= differenceInCalendarDays(second, first); i++) {
          days.push(addDays(first, i));
        }
        onChange?.(days);
      }
      else {
        onChange?.([day]);
      }
    }
    else if (multiple) {
      const key = dateKey(day);
      onChange?.(selected.has(key) ? selectedDates.filter(date => dateKey(date) !== key) : [...selectedDates, day]);
    }
    else {
      onChange?.(picked);
    }
  }

  function updateTarget(month: Date) {
    setTarget(month);
  }

  return (
    <WeekStartLocalization firstDayOfWeek={weekStart}>
      <DayContext.Provider value={{ selected, eventColor }}>
        <DateCalendar
          sx={{ mx: "auto" }}
          value={multiple ? null : (selectedDates[0] ?? null)}
          showDaysOutsideCurrentMonth
          onChange={onDaySelected}
          onMonthChange={updateTarget}
          onYearChange={updateTarget}
          slots={{ calendarHeader: MealPlanCalendarHeader, day: MealPlanDay }}
        />
      </DayContext.Provider>
    </WeekStartLocalization>
  );
}
