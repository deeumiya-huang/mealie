// Usage: <MealPlanLayout mealplans={mealsByDate}>{({ plan, index, day }) => <MealPlanDay … />}</MealPlanLayout>
// One grid cell per day; the scoped default slot (`plan`, `index`, `day`) is the `children` render prop.
import type { ReactNode } from "react";
import Grid from "@mui/material/Grid";
import { usePlanTypeOptions, type Days, type MealsByDate } from "@/hooks/use-group-mealplan";
import type { PlanEntryType } from "@/lib/api/types/meal-plan";

interface MealPlanLayoutProps {
  mealplans: MealsByDate[];
  children: (slot: { plan: MealsByDate; index: number; day: Days }) => ReactNode;
}

export function MealPlanLayout({ mealplans, children }: MealPlanLayoutProps) {
  const planTypeOptions = usePlanTypeOptions();

  function getDay(day: MealsByDate): Days {
    const forSection = (key: PlanEntryType) => day.meals.filter(({ entryType }) => entryType === key);
    return {
      date: day.date,
      sections: planTypeOptions
        .map(({ text, value }) => ({ title: text, meals: forSection(value) }))
        .filter(({ meals }) => meals.length > 0),
      recipes: day.meals.flatMap(({ recipe }) => recipe ? [recipe] : []),
    };
  }

  return (
    <Grid container spacing={3}>
      {mealplans.map((plan, index) => (
        <Grid
          key={index}
          size={{ xs: 12, sm: 12, md: 12, lg: 6, xl: 4 }}
          sx={{ my: 0.5, display: "flex", flexDirection: "column" }}
        >
          {children({ plan, index, day: getDay(plan) })}
        </Grid>
      ))}
    </Grid>
  );
}
