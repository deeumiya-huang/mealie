// Usage: <MealPlanAddRecipeDialog open={open} onOpenChange={setOpen} recipeId={recipe.id} /> — dialog to add a
// recipe to the meal plan: pick a day and an entry type, confirm to create the entry (toast with a "view" action).
import { useState } from "react";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useNavigate } from "react-router";
import { BaseDialog } from "@/components/global/BaseDialog";
import { useUserApi } from "@/hooks/api";
import { usePlanTypeOptions } from "@/hooks/use-group-mealplan";
import { alert } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import type { PlanEntryType } from "@/lib/api/types/meal-plan";
import { icons } from "@/lib/icons";
import { MealPlanDatePicker } from "./MealPlanDatePicker";

interface MealPlanAddRecipeDialogProps {
  recipeId: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MealPlanAddRecipeDialog({ recipeId, open, onOpenChange }: MealPlanAddRecipeDialogProps) {
  const { t } = useI18n();
  const api = useUserApi();
  const planTypeOptions = usePlanTypeOptions();
  const navigate = useNavigate();

  const [newMealType, setNewMealType] = useState<PlanEntryType>("dinner");
  const [newMealdate, setNewMealdate] = useState(() => new Date());

  // Format the date to YYYY-MM-DD in the same timezone as newMealdate
  const newMealdateString = [
    newMealdate.getFullYear(),
    String(newMealdate.getMonth() + 1).padStart(2, "0"),
    String(newMealdate.getDate()).padStart(2, "0"),
  ].join("-");

  async function addRecipeToPlan() {
    const { response } = await api.mealplans.createOne({
      date: newMealdateString,
      entryType: newMealType,
      title: "",
      text: "",
      recipeId,
    });

    if (response?.status === 201) {
      alert.success(t("recipe.recipe-added-to-mealplan"), null, {
        action: {
          message: t("general.view"),
          onClick: () => void navigate("/household/mealplan/planner/view"),
        },
      });
    }
    else {
      alert.error(t("recipe.failed-to-add-recipe-to-mealplan"));
    }
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      bottomSheet
      title={t("recipe.add-recipe-to-mealplan")}
      color="primary"
      icon={icons.calendar}
      canConfirm
      onConfirm={() => void addRecipeToPlan()}
    >
      <CardContent>
        <MealPlanDatePicker
          value={newMealdate}
          entryType={newMealType}
          onChange={value => setNewMealdate(Array.isArray(value) ? (value[0] ?? newMealdate) : value)}
        />
        <TextField
          select
          fullWidth
          variant="filled"
          size="small"
          label={t("recipe.entry-type")}
          value={newMealType}
          onChange={event => setNewMealType(event.target.value as PlanEntryType)}
        >
          {planTypeOptions.map(option => (
            <MenuItem key={option.value} value={option.value}>{option.text}</MenuItem>
          ))}
        </TextField>
      </CardContent>
    </BaseDialog>
  );
}
