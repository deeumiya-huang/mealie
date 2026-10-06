// Usage: <WeekStartLocalization firstDayOfWeek={household.preferences.firstDayOfWeek}><DateCalendar … /></WeekStartLocalization>
// Provides the date adapter for MUI date pickers; `firstDayOfWeek` (0 = Sunday … 6 = Saturday, the household
// preference) decides which weekday the calendar starts on, like Vuetify's `first-day-of-week`.
// The calendar text is English, as in the Vue app (it passed the unsupported `local` prop to Vuetify).
import { useMemo, type ReactNode } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enUS } from "date-fns/locale/en-US";

interface WeekStartLocalizationProps {
  firstDayOfWeek?: number;
  children: ReactNode;
}

export function WeekStartLocalization({ firstDayOfWeek = 0, children }: WeekStartLocalizationProps) {
  const locale = useMemo(() => ({
    ...enUS,
    options: { ...enUS.options, weekStartsOn: (firstDayOfWeek % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6 },
  }), [firstDayOfWeek]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
      {children}
    </LocalizationProvider>
  );
}
