// Usage: <MealPlanDay day={date} recipes={day.recipes} actions={actions} inlineActions>{meals}</MealPlanDay>
// One day of the planner: the day header with the day's actions (a "…" menu, or the buttons below the meals with
// `inlineActions`), the children (the day's meals) and the dialogs the actions open.
import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { format } from "date-fns";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import type { ButtonOption } from "@/components/global/BaseMenu";
import { GroupMealPlanEntryDialog } from "@/components/Domain/Household/GroupMealPlanEntryDialog";
import { RecipeDialogAddToShoppingList } from "@/components/Domain/Recipe/RecipeDialogAddToShoppingList";
import { useUserApi } from "@/hooks/api";
import { useAddToShoppingListDialog } from "@/hooks/shopping-list-page/use-add-to-shopping-list-dialog";
import type { useMealplans } from "@/hooks/use-group-mealplan";
import { useI18n } from "@/i18n";
import type { PlanEntryType, ReadPlanEntry } from "@/lib/api/types/meal-plan";
import type { Recipe, RecipeSummary } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { MealPlanDayHeader } from "./MealPlanDayHeader";

interface MealPlanDayProps {
  recipes?: RecipeSummary[];
  day: Date;
  actions: ReturnType<typeof useMealplans>["actions"];
  inlineActions?: boolean;
  children?: ReactNode;
}

const NO_RECIPES: RecipeSummary[] = [];

export function MealPlanDay({ recipes = NO_RECIPES, day, actions, inlineActions = false, children }: MealPlanDayProps) {
  const { open: shoppingListOpen, setOpen: setShoppingListOpen, shoppingLists, addAllLoading, addAllToList } = useAddToShoppingListDialog();
  const { t } = useI18n();
  const api = useUserApi();

  const commonButtons: ButtonOption[] = [
    {
      icon: icons.createAlt,
      text: t("general.new"),
      event: "create",
    },
    {
      icon: icons.potSteam,
      text: t("meal-plan.random-dinner"),
      event: "randomDinner",
    },
    {
      icon: icons.bowlMixOutline,
      text: t("meal-plan.random-side"),
      event: "randomSide",
    },
  ];
  const randomButtons: ButtonOption[] = [
    {
      icon: icons.diceMultiple,
      text: t("meal-plan.breakfast"),
      event: "randomBreakfast",
    },
    {
      icon: icons.diceMultiple,
      text: t("meal-plan.lunch"),
      event: "randomLunch",
    },
    {
      icon: icons.diceMultiple,
      text: t("meal-plan.side"),
      event: "randomSide",
    },
    {
      icon: icons.diceMultiple,
      text: t("meal-plan.snack"),
      event: "randomSnack",
    },
    {
      icon: icons.diceMultiple,
      text: t("meal-plan.drink"),
      event: "randomDrink",
    },
    {
      icon: icons.diceMultiple,
      text: t("meal-plan.dessert"),
      event: "randomDessert",
    },
  ];
  const inlineButtons: ButtonOption[] = [
    {
      icon: icons.diceMultiple,
      text: t("meal-plan.random-meal"),
      event: "random",
      children: randomButtons,
    },
  ];

  // the dialog's recipes are the summaries of the day's entries, at scale 1
  const recipesWithScales = recipes.map(recipe => ({ scale: 1, ...(recipe as Recipe) }));

  async function randomMeal(date: Date, type: PlanEntryType) {
    const { data } = await api.mealplans.setRandom({
      date: format(date, "yyyy-MM-dd"),
      entryType: type,
    });

    if (data) {
      void actions.refreshAll();
    }
  }

  const [dialog, setDialog] = useState<{ open: boolean; entry: ReadPlanEntry | null; date: Date | null }>({
    open: false,
    entry: null,
    date: null,
  });

  function openDialog() {
    setDialog({ open: true, entry: null, date: day });
  }

  const handlers: Record<string, () => void> = {
    "create": openDialog,
    "randomBreakfast": () => void randomMeal(day, "breakfast"),
    "randomLunch": () => void randomMeal(day, "lunch"),
    "randomDinner": () => void randomMeal(day, "dinner"),
    "randomSide": () => void randomMeal(day, "side"),
    "randomSnack": () => void randomMeal(day, "snack"),
    "randomDrink": () => void randomMeal(day, "drink"),
    "randomDessert": () => void randomMeal(day, "dessert"),
    "shopping-list": () => void addAllToList(),
  };

  function handleAction(event: string) {
    handlers[event]?.();
  }

  return (
    <>
      <RecipeDialogAddToShoppingList
        open={shoppingListOpen}
        onOpenChange={setShoppingListOpen}
        recipes={recipesWithScales}
        shoppingLists={shoppingLists}
      />
      <GroupMealPlanEntryDialog
        open={dialog.open}
        onOpenChange={open => setDialog(current => ({ ...current, open }))}
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
                <BaseButtonGroup buttons={[...commonButtons, ...inlineButtons]} onAction={handleAction} />
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
                        text: t("meal-plan.add-day-to-list"),
                        icon: icons.cartCheck,
                        event: "shopping-list",
                        loading: addAllLoading,
                        disabled: !recipes.length,
                      },
                      ...commonButtons,
                      ...inlineButtons,
                    ],
                  }]}
                  onAction={handleAction}
                />
              </MealPlanDayHeader>
              {children}
            </>
          )}
    </>
  );
}
