import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { addDays, differenceInCalendarDays, format, isSameDay, isValid, parseISO } from "date-fns";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { BaseContainer } from "~/components/global/BaseContainer";
import { Icon } from "~/components/global/Icon";
import { NumberInput } from "~/components/global/form";
import { MealPlanDatePicker } from "~/components/Domain/Mealplan/MealPlanDatePicker";
import { RecipeDialogAddToShoppingList } from "~/components/Domain/Recipe/RecipeDialogAddToShoppingList";
import type { RecipeWithScale } from "~/components/Domain/Recipe/RecipeDialogAddToShoppingList";
import { useAddToShoppingListDialog } from "~/hooks/shopping-list-page/use-add-to-shopping-list-dialog";
import { useMealplans } from "~/hooks/use-group-mealplan";
import type { MealsByDate } from "~/hooks/use-group-mealplan";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useHouseholdSelf } from "~/hooks/use-households";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { useUserMealPlanPreferences } from "~/hooks/use-users/preferences";
import { icons } from "~/lib/icons";

/** What the planner passes to its /edit and /view children (Vue: NuxtPage props). */
export interface PlannerOutletContext {
  mealplans: MealsByDate[];
  actions: ReturnType<typeof useMealplans>["actions"];
}

const BASE = "/household/mealplan/planner";

function safeParseISO(date: string | null, fallback: Date) {
  if (!date) return fallback;
  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : fallback;
  }
  catch {
    return fallback;
  }
}

function adjustForToday(days: number) {
  // e.g. If the user wants 7 days, we subtract one to do "today + 6"
  // e.g. If the user wants 2 days in the past, we keep it the same to do "today - 2"
  return days > 0 ? days - 1 : days;
}

export default function MealPlanPlannerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const i18n = useI18n();
  const display = useDisplay();
  const { actions: householdActions } = useHouseholdSelf();
  const { shoppingLists, open: shoppingListDialog, setOpen: setShoppingListDialog, addAllToList } = useAddToShoppingListDialog();

  useSeoMeta({ title: i18n.t("meal-plan.dinner-this-week") });

  // useHouseholdSelf() caches data in a module-level singleton for the lifetime of the tab,
  // so revisiting this page via client-side navigation can otherwise use a stale
  // firstDayOfWeek value if household preferences were changed elsewhere (e.g. Admin
  // Households panel) in the same session. Force a revalidation whenever this page is entered.
  useEffect(() => {
    void householdActions.refresh();
  }, [householdActions]);

  const [mealPlanPreferences, setMealPlanPreferences] = useUserMealPlanPreferences();
  const numberOfDaysPast = mealPlanPreferences.numberOfDaysPast || 0;
  const numberOfDays = mealPlanPreferences.numberOfDays || 7;

  const edit = location.pathname.startsWith(`${BASE}/edit`);

  // Initialize dates from query parameters or defaults
  const [range, setRange] = useState<[Date, Date]>(() => [
    safeParseISO(searchParams.get("start"), addDays(new Date(), adjustForToday(-numberOfDaysPast))),
    safeParseISO(searchParams.get("end"), addDays(new Date(), adjustForToday(numberOfDays))),
  ]);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);

  const weekRange = useMemo(() => {
    const sorted = [...range].sort((a, b) => a.getTime() - b.getTime());
    return { start: sorted[0]!, end: sorted[sorted.length - 1]! };
  }, [range]);

  function changeWeek(step: number) {
    const { start, end } = weekRange;
    const stepSize = differenceInCalendarDays(end, start) + 1;
    setRange([addDays(start, step * stepSize), addDays(end, step * stepSize)]);
  }

  // Update query parameters when date range changes
  const startKey = format(weekRange.start, "yyyy-MM-dd");
  const endKey = format(weekRange.end, "yyyy-MM-dd");
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;
  useEffect(() => {
    setSearchParamsRef.current((prev) => {
      const next = new URLSearchParams(prev);
      next.set("start", startKey);
      next.set("end", endKey);
      return next;
    }, { replace: true });
  }, [startKey, endKey, location.pathname]);

  const { mealplans, actions } = useMealplans(weekRange);

  const mealsByDate = useMemo<MealsByDate[]>(() => {
    const numDays = Math.floor((weekRange.end.getTime() - weekRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (numDays < 0) return [];
    return Array.from(Array(numDays).keys()).map((i) => {
      const date = new Date(weekRange.start.getTime());
      date.setDate(date.getDate() + i);
      return {
        date,
        meals: (mealplans ?? []).filter(meal => isSameDay(parseISO(meal.date), date)),
      };
    });
  }, [weekRange, mealplans]);

  const hasRecipes = mealsByDate.some(day => day.meals.some(meal => meal.recipe));
  const weekRecipesWithScales = mealsByDate
    .flatMap(({ meals }) => meals)
    .map(({ recipe }) => recipe)
    .filter(recipe => recipe)
    .map(recipe => ({ scale: 1, ...recipe }) as RecipeWithScale);

  // Force to /view if current route is /planner
  if (location.pathname.replace(/\/$/, "") === BASE) {
    return <Navigate to={{ pathname: `${BASE}/view`, search: location.search }} replace />;
  }

  const context: PlannerOutletContext = { mealplans: mealsByDate, actions };

  return (
    <BaseContainer>
      {shoppingLists && (
        <RecipeDialogAddToShoppingList
          open={shoppingListDialog}
          onOpenChange={setShoppingListDialog}
          recipes={weekRecipesWithScales}
          shoppingLists={shoppingLists}
        />
      )}
      <Box sx={{ display: "flex", gap: 1, justifyContent: display.xs ? "center" : "flex-start" }}>
        <IconButton onClick={() => changeWeek(-1)}><Icon path={icons.chevronLeft} /></IconButton>
        <Button variant="contained" color="primary" sx={{ mb: 1 }} startIcon={<Icon path={icons.calendar} />} onClick={e => setPickerAnchor(e.currentTarget)}>
          {i18n.d(weekRange.start, "short")}
          {" - "}
          {i18n.d(weekRange.end, "short")}
        </Button>
        <Popover open={!!pickerAnchor} anchorEl={pickerAnchor} onClose={() => setPickerAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
          <Card>
            <MealPlanDatePicker<[Date, Date]> value={range} onChange={setRange} range />
            <CardContent>
              <NumberInput
                value={numberOfDaysPast}
                min={0}
                label={i18n.t("meal-plan.numberOfDaysPast-label")}
                hint={i18n.t("meal-plan.numberOfDaysPast-hint")}
                persistentHint
                onChange={v => setMealPlanPreferences(prev => ({ ...prev, numberOfDaysPast: Number(v ?? 0) }))}
              />
            </CardContent>
            <CardContent>
              <NumberInput
                value={numberOfDays}
                min={1}
                label={i18n.t("meal-plan.numberOfDays-label")}
                hint={i18n.t("meal-plan.numberOfDays-hint")}
                persistentHint
                onChange={v => setMealPlanPreferences(prev => ({ ...prev, numberOfDays: Number(v ?? 1) }))}
              />
            </CardContent>
          </Card>
        </Popover>
        <IconButton onClick={() => changeWeek(1)}><Icon path={icons.chevronRight} /></IconButton>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <BaseButtonGroup
          buttons={[
            edit
              ? { icon: icons.calendar, text: i18n.t("general.view"), event: "view" }
              : { icon: icons.edit, text: i18n.t("general.edit"), event: "edit" },
            {
              icon: icons.dotsVertical,
              text: "",
              event: "three-dot",
              children: [
                { icon: icons.cartCheck, text: i18n.t("meal-plan.add-all-to-list"), event: "add-to-list", disabled: !hasRecipes },
                { icon: icons.cog, text: i18n.t("general.settings"), event: "settings" },
              ],
            },
          ]}
          onEvent={(event) => {
            if (event === "add-to-list") void addAllToList();
            if (event === "edit") void navigate({ pathname: `${BASE}/edit`, search: location.search });
            if (event === "view") void navigate({ pathname: `${BASE}/view`, search: location.search });
            if (event === "settings") void navigate("/household/mealplan/settings");
          }}
        />
      </Box>
      <div>
        <Outlet context={context} />
      </div>
    </BaseContainer>
  );
}
