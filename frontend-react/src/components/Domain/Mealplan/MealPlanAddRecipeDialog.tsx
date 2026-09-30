import { useState } from "react";
import CardContent from "@mui/material/CardContent";
import { useNavigate } from "react-router";
import type { PlanEntryType } from "~/lib/api/types/meal-plan";
import { icons } from "~/lib/icons";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { usePlanTypeOptions } from "~/hooks/use-group-mealplan";
import { alert } from "~/hooks/use-toast";
import { BaseDialog } from "~/components/global/BaseDialog";
import { SelectInput } from "~/components/global/form";
import { MealPlanDatePicker } from "./MealPlanDatePicker";

function dateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MealPlanAddRecipeDialog({ open, onOpenChange, recipeId }: { open: boolean; onOpenChange: (open: boolean) => void; recipeId: string }) {
  const i18n = useI18n();
  const api = useUserApi();
  const planTypeOptions = usePlanTypeOptions();
  const navigate = useNavigate();
  const [newMealType, setNewMealType] = useState<PlanEntryType>("dinner");
  const [newMealdate, setNewMealdate] = useState(new Date());

  async function addRecipeToPlan() {
    const { response } = await api.mealplans.createOne({
      date: dateString(newMealdate),
      entryType: newMealType,
      title: "",
      text: "",
      recipeId,
    });

    if (response?.status === 201) {
      alert.success(i18n.t("recipe.recipe-added-to-mealplan"), null, {
        action: {
          message: i18n.t("general.view"),
          onClick: () => void navigate("/household/mealplan/planner/view"),
        },
      });
    }
    else {
      alert.error(i18n.t("recipe.failed-to-add-recipe-to-mealplan"));
    }
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      bottomSheet
      title={i18n.t("recipe.add-recipe-to-mealplan")}
      color="primary"
      icon={icons.calendar}
      canConfirm
      onConfirm={() => void addRecipeToPlan()}
    >
      <CardContent>
        <MealPlanDatePicker value={newMealdate} onChange={setNewMealdate} entryType={newMealType} />
        <SelectInput
          value={newMealType}
          onChange={v => setNewMealType(v as PlanEntryType)}
          items={planTypeOptions}
          label={i18n.t("recipe.entry-type")}
          itemTitle="text"
          itemValue="value"
        />
      </CardContent>
    </BaseDialog>
  );
}

export default MealPlanAddRecipeDialog;
