import { useState } from "react";
import type { ReactNode } from "react";
import { format } from "date-fns";
import Box from "@mui/material/Box";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import type { ButtonOption } from "~/components/global/BaseMenu";
import { GroupMealPlanEntryDialog } from "~/components/Domain/Household/GroupMealPlanEntryDialog";
import { RecipeDialogAddToShoppingList } from "~/components/Domain/Recipe/RecipeDialogAddToShoppingList";
import type { RecipeWithScale } from "~/components/Domain/Recipe/RecipeDialogAddToShoppingList";
import { useUserApi } from "~/hooks/api";
import type { useMealplans } from "~/hooks/use-group-mealplan";
import { useI18n } from "~/hooks/use-global-i18n";
import { useAddToShoppingListDialog } from "~/hooks/shopping-list-page/use-add-to-shopping-list-dialog";
import { icons } from "~/lib/icons";
import type { PlanEntryType, ReadPlanEntry } from "~/lib/api/types/meal-plan";
import type { RecipeSummary } from "~/lib/api/types/recipe";
import { MealPlanDayHeader } from "./MealPlanDayHeader";

export interface MealPlanDayProps {
  recipes?: RecipeSummary[];
  day: Date;
  actions: ReturnType<typeof useMealplans>["actions"];
  inlineActions?: boolean;
  children?: ReactNode;
}

const RANDOM_EVENTS: Record<string, PlanEntryType> = {
  randomBreakfast: "breakfast",
  randomLunch: "lunch",
  randomDinner: "dinner",
  randomSide: "side",
  randomSnack: "snack",
  randomDrink: "drink",
  randomDessert: "dessert",
};

export function MealPlanDay({ recipes = [], day, actions, inlineActions = false, children }: MealPlanDayProps) {
  const i18n = useI18n();
  const api = useUserApi();
  const { open: shoppingListDialog, setOpen: setShoppingListDialog, shoppingLists, addAllLoading, addAllToList } = useAddToShoppingListDialog();

  const commonButtons: ButtonOption[] = [
    { icon: icons.createAlt, text: i18n.t("general.new"), event: "create" },
    { icon: icons.potSteam, text: i18n.t("meal-plan.random-dinner"), event: "randomDinner" },
    { icon: icons.bowlMixOutline, text: i18n.t("meal-plan.random-side"), event: "randomSide" },
  ];
  const randomButtons: ButtonOption[] = [
    { icon: icons.diceMultiple, text: i18n.t("meal-plan.breakfast"), event: "randomBreakfast" },
    { icon: icons.diceMultiple, text: i18n.t("meal-plan.lunch"), event: "randomLunch" },
    { icon: icons.diceMultiple, text: i18n.t("meal-plan.side"), event: "randomSide" },
    { icon: icons.diceMultiple, text: i18n.t("meal-plan.snack"), event: "randomSnack" },
    { icon: icons.diceMultiple, text: i18n.t("meal-plan.drink"), event: "randomDrink" },
    { icon: icons.diceMultiple, text: i18n.t("meal-plan.dessert"), event: "randomDessert" },
  ];
  const inlineButtons: ButtonOption[] = [
    { icon: icons.diceMultiple, text: i18n.t("meal-plan.random-meal"), event: "random", children: randomButtons },
  ];

  const recipesWithScales = recipes.map(recipe => ({ scale: 1, ...recipe }) as RecipeWithScale);

  async function randomMeal(date: Date, type: PlanEntryType) {
    const { data } = await api.mealplans.setRandom({ date: format(date, "yyyy-MM-dd"), entryType: type });
    if (data) {
      void actions.refreshAll();
    }
  }

  const [dialog, setDialog] = useState<{ open: boolean; entry: ReadPlanEntry | null; date: Date | null }>({ open: false, entry: null, date: null });

  function onEvent(event: string) {
    if (event === "create") {
      setDialog({ open: true, entry: null, date: day });
    }
    else if (event === "shopping-list") {
      void addAllToList();
    }
    else if (RANDOM_EVENTS[event]) {
      void randomMeal(day, RANDOM_EVENTS[event]);
    }
  }

  return (
    <>
      <RecipeDialogAddToShoppingList
        open={shoppingListDialog}
        onOpenChange={setShoppingListDialog}
        recipes={recipesWithScales}
        shoppingLists={shoppingLists}
      />
      <GroupMealPlanEntryDialog
        open={dialog.open}
        onOpenChange={open => setDialog(prev => ({ ...prev, open }))}
        entry={dialog.entry}
        date={dialog.date}
        onCreate={payload => void actions.createOne(payload)}
        onUpdate={payload => void actions.updateOne(payload)}
      />
      {inlineActions
        ? (
            <>
              <MealPlanDayHeader day={day} />
              {children}
              {/* Day Column Actions */}
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <BaseButtonGroup buttons={[...commonButtons, ...inlineButtons]} onEvent={onEvent} />
              </Box>
            </>
          )
        : (
            <>
              <MealPlanDayHeader day={day}>
                <BaseButtonGroup
                  buttons={[{
                    icon: icons.dotsVertical,
                    event: "",
                    text: "",
                    children: [
                      {
                        text: i18n.t("meal-plan.add-day-to-list"),
                        icon: icons.cartCheck,
                        event: "shopping-list",
                        loading: addAllLoading,
                        disabled: !recipes.length,
                      },
                      ...commonButtons,
                      ...inlineButtons,
                    ],
                  }]}
                  onEvent={onEvent}
                />
              </MealPlanDayHeader>
              {children}
            </>
          )}
    </>
  );
}

export default MealPlanDay;
