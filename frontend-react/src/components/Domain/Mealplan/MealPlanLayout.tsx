import type { ReactNode } from "react";
import Grid from "@mui/material/Grid";
import { usePlanTypeOptions } from "~/hooks/use-group-mealplan";
import type { Days, MealsByDate } from "~/hooks/use-group-mealplan";
import type { PlanEntryType } from "~/lib/api/types/meal-plan";

export interface MealPlanLayoutProps {
  mealplans: MealsByDate[];
  children: (props: { plan: MealsByDate; index: number; day: Days }) => ReactNode;
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
      recipes: day.meals.flatMap(({ recipe }) => (recipe ? [recipe] : [])),
    };
  }

  return (
    <Grid container spacing={3}>
      {mealplans.map((plan, index) => (
        <Grid
          key={index}
          size={{ xs: 12, lg: 6, xl: 4 }}
          // RecipeCardMobile needs ~340px for its action row; narrower columns wrap instead
          sx={{ minWidth: 340, my: 0.5, display: "flex", flexDirection: "column" }}
        >
          {children({ plan, index, day: getDay(plan) })}
        </Grid>
      ))}
    </Grid>
  );
}

export default MealPlanLayout;
