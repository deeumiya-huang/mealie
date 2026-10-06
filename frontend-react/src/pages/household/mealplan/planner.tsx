import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { addDays, differenceInCalendarDays, format, isSameDay, isValid, parseISO } from "date-fns";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseNumberInput } from "@/components/global/BaseNumberInput";
import { MdiIcon } from "@/components/global/MdiIcon";
import { MealPlanDatePicker } from "@/components/Domain/Mealplan/MealPlanDatePicker";
import { RecipeDialogAddToShoppingList } from "@/components/Domain/Recipe/RecipeDialogAddToShoppingList";
import { useAddToShoppingListDialog } from "@/hooks/shopping-list-page/use-add-to-shopping-list-dialog";
import { useMealplans, type MealsByDate } from "@/hooks/use-group-mealplan";
import { useHouseholdSelf } from "@/hooks/use-households";
import { useUserMealPlanPreferences } from "@/hooks/use-users/preferences";
import { useDisplay, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { Recipe } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

/** What the planner hands to its child routes (Vue passed these as props to `<NuxtPage>`). */
export interface PlannerOutletContext {
  mealplans: MealsByDate[];
  actions: ReturnType<typeof useMealplans>["actions"];
}

const PLANNER_PATH = "/household/mealplan/planner";

function adjustForToday(days: number) {
  // e.g. If the user wants 7 days, we subtract one to do "today + 6"
  // e.g. If the user wants 2 days in the past, we keep it the same to do "today - 2"
  return days > 0 ? days - 1 : days;
}

function safeParseISO(date: string | null, fallback: Date): Date {
  try {
    if (!date) {
      return fallback;
    }
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : fallback;
  }
  catch {
    return fallback;
  }
}

export default function HouseholdMealplanPlannerPage() {
  const { t, d } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { xs } = useDisplay();
  const { household, actions: householdActions } = useHouseholdSelf();
  const { shoppingLists, open: shoppingListDialog, setOpen: setShoppingListDialog, addAllToList } = useAddToShoppingListDialog();

  usePageTitle(t("meal-plan.dinner-this-week"));

  // useHouseholdSelf() caches data in a module-level singleton for the lifetime of the tab,
  // so revisiting this page via client-side navigation can otherwise use a stale
  // firstDayOfWeek value if household preferences were changed elsewhere (e.g. Admin
  // Households panel) in the same session. Force a revalidation whenever this page is entered.
  useEffect(() => {
    void householdActions.refresh();
  }, [householdActions]);

  const [mealPlanPreferences, setMealPlanPreferences] = useUserMealPlanPreferences();
  const [numberOfDaysPast, setNumberOfDaysPast] = useState<number>(mealPlanPreferences.numberOfDaysPast || 0);
  const [numberOfDays, setNumberOfDays] = useState<number>(mealPlanPreferences.numberOfDays || 7);

  function changeNumberOfDaysPast(value: number | null) {
    setNumberOfDaysPast(value as number);
    setMealPlanPreferences(current => ({ ...current, numberOfDaysPast: Number(value) }));
  }

  function changeNumberOfDays(value: number | null) {
    setNumberOfDays(value as number);
    setMealPlanPreferences(current => ({ ...current, numberOfDays: Number(value) }));
  }

  const edit = location.pathname.startsWith(`${PLANNER_PATH}/edit`);

  // Initialize dates from query parameters or defaults
  const [range, setRange] = useState<Date[]>(() => [
    safeParseISO(searchParams.get("start"), addDays(new Date(), adjustForToday(-numberOfDaysPast))),
    safeParseISO(searchParams.get("end"), addDays(new Date(), adjustForToday(numberOfDays))),
  ]);
  const [picker, setPicker] = useState<HTMLElement | null>(null);

  const firstDayOfWeek = household?.preferences?.firstDayOfWeek || 0;

  const weekRange = useMemo(() => {
    const sorted = [...range].sort((a, b) => a.getTime() - b.getTime());

    const start = sorted[0];
    const end = sorted[sorted.length - 1];

    if (start && end) {
      return { start, end };
    }
    return {
      start: addDays(new Date(), adjustForToday(-numberOfDaysPast)),
      end: addDays(new Date(), adjustForToday(numberOfDays)),
    };
  }, [range, numberOfDaysPast, numberOfDays]);

  function changeWeek(step: number) {
    const { start, end } = weekRange;
    const stepSize = differenceInCalendarDays(end, start) + 1;
    setRange([
      addDays(start, step * stepSize),
      addDays(end, step * stepSize),
    ]);
  }

  // Update query parameters when date range changes
  const startParam = format(weekRange.start, "yyyy-MM-dd");
  const endParam = format(weekRange.end, "yyyy-MM-dd");
  const { pathname, search } = location;
  useEffect(() => {
    // Keep current route, just update the query
    const params = new URLSearchParams(search);
    if (params.get("start") === startParam && params.get("end") === endParam) {
      return;
    }
    params.set("start", startParam);
    params.set("end", endParam);
    void navigate({ pathname, search: `?${params.toString()}` }, { replace: true });
  }, [startParam, endParam, pathname, search, navigate]);

  const { mealplans, actions } = useMealplans(weekRange);

  const mealsByDate = useMemo<MealsByDate[]>(() => {
    const numDays
      = Math.floor((weekRange.end.getTime() - weekRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate absolute value
    const days = numDays < 0
      ? []
      : Array.from(Array(numDays).keys()).map((i) => {
          const date = new Date(weekRange.start.getTime());
          date.setDate(date.getDate() + i);
          return date;
        });

    return days.map((day) => {
      const meals = (mealplans ?? []).filter(meal => isSameDay(parseISO(meal.date), day));
      return { date: day, meals };
    });
  }, [weekRange, mealplans]);

  const hasRecipes = mealsByDate.some(day => day.meals.some(meal => meal.recipe));

  const weekRecipesWithScales = mealsByDate
    .flatMap(({ meals }) => meals)
    .flatMap(({ recipe }) => (recipe ? [recipe] : []))
    .map(recipe => ({ scale: 1, ...(recipe as Recipe) }));

  function goTo(tab: "view" | "edit") {
    void navigate({ pathname: `${PLANNER_PATH}/${tab}`, search: location.search });
  }

  return (
    <Container>
      {shoppingLists && (
        <RecipeDialogAddToShoppingList
          open={shoppingListDialog}
          onOpenChange={setShoppingListDialog}
          recipes={weekRecipesWithScales}
          shoppingLists={shoppingLists}
        />
      )}
      <Box sx={{ display: "flex", gap: 1, justifyContent: xs ? "center" : "flex-start" }}>
        <IconButton sx={{ borderRadius: 1 }} onClick={() => changeWeek(-1)}>
          <MdiIcon path={icons.chevronLeft} />
        </IconButton>
        <Button
          variant="contained"
          color="primary"
          sx={{ mb: 1 }}
          aria-haspopup="dialog"
          aria-expanded={picker !== null}
          onClick={event => setPicker(event.currentTarget)}
          startIcon={<MdiIcon path={icons.calendar} />}
        >
          {`${d(weekRange.start, "short")} - ${d(weekRange.end, "short")}`}
        </Button>
        <Popover
          open={picker !== null}
          anchorEl={picker}
          onClose={() => setPicker(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <MealPlanDatePicker
            value={range}
            onChange={value => setRange(Array.isArray(value) ? value : [value])}
            multiple="range"
            firstDayOfWeek={firstDayOfWeek}
          />

          <CardContent>
            <BaseNumberInput
              value={numberOfDaysPast}
              onChange={changeNumberOfDaysPast}
              min={0}
              inset
              label={t("meal-plan.numberOfDaysPast-label")}
              hint={t("meal-plan.numberOfDaysPast-hint")}
              persistentHint
            />
          </CardContent>

          <CardContent>
            <BaseNumberInput
              value={numberOfDays}
              onChange={changeNumberOfDays}
              min={1}
              inset
              label={t("meal-plan.numberOfDays-label")}
              hint={t("meal-plan.numberOfDays-hint")}
              persistentHint
            />
          </CardContent>
        </Popover>
        <IconButton sx={{ borderRadius: 1 }} onClick={() => changeWeek(1)}>
          <MdiIcon path={icons.chevronRight} />
        </IconButton>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <BaseButtonGroup
          buttons={[
            edit
              ? {
                  icon: icons.calendar,
                  text: t("general.view"),
                  event: "view",
                }
              : {
                  icon: icons.edit,
                  text: t("general.edit"),
                  event: "edit",
                },
            {
              icon: icons.dotsVertical,
              text: "",
              event: "three-dot",
              children: [
                {
                  icon: icons.cartCheck,
                  text: t("meal-plan.add-all-to-list"),
                  event: "add-to-list",
                  disabled: !hasRecipes,
                },
                {
                  icon: icons.cog,
                  text: t("general.settings"),
                  event: "settings",
                },
              ],
            },
          ]}
          onAction={(event) => {
            if (event === "add-to-list") {
              void addAllToList();
            }
            else if (event === "edit") {
              goTo("edit");
            }
            else if (event === "view") {
              goTo("view");
            }
            else if (event === "settings") {
              void navigate("/household/mealplan/settings");
            }
          }}
        />
      </Box>
      <div>
        <Outlet context={{ mealplans: mealsByDate, actions } satisfies PlannerOutletContext} />
      </div>
    </Container>
  );
}
