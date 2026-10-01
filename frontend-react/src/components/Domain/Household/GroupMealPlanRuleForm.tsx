import { useMemo } from "react";
import Box from "@mui/material/Box";
import { SelectInput } from "~/components/global/form";
import { QueryFilterBuilder } from "~/components/Domain/QueryFilterBuilder";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import type { FieldDefinition } from "~/hooks/use-query-filter-builder";
import { Organizer } from "~/lib/api/types/non-generated";
import type { QueryFilterJSON } from "~/lib/api/types/non-generated";

export interface GroupMealPlanRuleFormValue {
  day: string;
  entryType: string;
  queryFilterString: string;
}

export interface GroupMealPlanRuleFormProps {
  queryFilter?: QueryFilterJSON | null;
  value: GroupMealPlanRuleFormValue;
  /** Functional update, so the debounced query filter never overwrites newer edits. */
  onChange: (update: (prev: GroupMealPlanRuleFormValue) => GroupMealPlanRuleFormValue) => void;
}

export function GroupMealPlanRuleForm({ queryFilter = null, value, onChange }: GroupMealPlanRuleFormProps) {
  const i18n = useI18n();
  const display = useDisplay();
  const { day, entryType } = value;

  const MEAL_TYPE_OPTIONS = [
    { title: i18n.t("meal-plan.breakfast"), value: "breakfast" },
    { title: i18n.t("meal-plan.lunch"), value: "lunch" },
    { title: i18n.t("meal-plan.dinner"), value: "dinner" },
    { title: i18n.t("meal-plan.side"), value: "side" },
    { title: i18n.t("meal-plan.snack"), value: "snack" },
    { title: i18n.t("meal-plan.drink"), value: "drink" },
    { title: i18n.t("meal-plan.dessert"), value: "dessert" },
    { title: i18n.t("meal-plan.type-any"), value: "unset" },
  ];

  const MEAL_DAY_OPTIONS = [
    { title: i18n.t("general.monday"), value: "monday" },
    { title: i18n.t("general.tuesday"), value: "tuesday" },
    { title: i18n.t("general.wednesday"), value: "wednesday" },
    { title: i18n.t("general.thursday"), value: "thursday" },
    { title: i18n.t("general.friday"), value: "friday" },
    { title: i18n.t("general.saturday"), value: "saturday" },
    { title: i18n.t("general.sunday"), value: "sunday" },
    { title: i18n.t("meal-plan.day-any"), value: "unset" },
  ];

  const fieldDefs = useMemo<FieldDefinition[]>(() => [
    { name: "recipe_category.id", label: i18n.t("category.categories"), type: Organizer.Category },
    { name: "tags.id", label: i18n.t("tag.tags"), type: Organizer.Tag },
    { name: "recipe_ingredient.food.id", label: i18n.t("recipe.ingredients"), type: Organizer.Food },
    { name: "recipe_ingredient.food.label_id", label: i18n.t("data-pages.foods.food-label"), type: Organizer.Label },
    { name: "tools.id", label: i18n.t("tool.tools"), type: Organizer.Tool },
    { name: "household_id", label: i18n.t("household.households"), type: Organizer.Household },
    { name: "user_id", label: i18n.t("user.users"), type: Organizer.User },
    { name: "rating", label: i18n.t("general.rating"), type: "number" },
    { name: "total_time_seconds", label: i18n.t("recipe.total-time"), type: "duration" },
    { name: "last_made", label: i18n.t("general.last-made"), type: "relativeDate" },
    { name: "created_at", label: i18n.t("general.date-created"), type: "date" },
    { name: "updated_at", label: i18n.t("general.date-updated"), type: "date" },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- labels follow the locale
  ], [i18n.locale]);

  return (
    <div>
      <Box sx={{ display: display.mdAndUp ? "flex" : "block", gap: "10px" }}>
        <SelectInput
          value={day}
          onChange={v => onChange(prev => ({ ...prev, day: v as string }))}
          items={MEAL_DAY_OPTIONS}
          label={i18n.t("meal-plan.rule-day")}
        />
        <SelectInput
          value={entryType}
          onChange={v => onChange(prev => ({ ...prev, entryType: v as string }))}
          items={MEAL_TYPE_OPTIONS}
          label={i18n.t("meal-plan.meal-type")}
        />
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <QueryFilterBuilder
          fieldDefs={fieldDefs}
          initialQueryFilter={queryFilter}
          onInput={v => onChange(prev => ({ ...prev, queryFilterString: v || "" }))}
        />
      </Box>

      {/* TODO: proper pluralization of inputDay */}
      {i18n.t("meal-plan.this-rule-will-apply", {
        dayCriteria: day === "unset"
          ? i18n.t("meal-plan.to-all-days")
          : i18n.t("meal-plan.on-days", [i18n.t("general." + day)]),
        mealTypeCriteria: entryType === "unset"
          ? i18n.t("meal-plan.for-all-meal-types")
          : i18n.t("meal-plan.for-type-meal-types", [i18n.t("meal-plan." + entryType)]),
      })}
    </div>
  );
}

export default GroupMealPlanRuleForm;
