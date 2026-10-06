// Usage: <GroupMealPlanRuleForm day={day} onDayChange={setDay} entryType={type} onEntryTypeChange={setType}
//          queryFilterString={qf} onQueryFilterStringChange={setQf} queryFilter={rule.queryFilter} />
// Form for one meal plan rule: day, meal type and a query filter. Vue's three `defineModel`s become value + onChange props.
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { QueryFilterBuilder } from "@/components/Domain/QueryFilterBuilder";
import type { FieldDefinition } from "@/hooks/use-query-filter-builder";
import { useI18n } from "@/i18n";
import { Organizer } from "@/lib/api/types/non-generated";
import type { QueryFilterJSON } from "@/lib/api/types/non-generated";

interface GroupMealPlanRuleFormProps {
  queryFilter?: QueryFilterJSON | null;
  showHelp?: boolean;
  day?: string;
  onDayChange?: (day: string) => void;
  entryType?: string;
  onEntryTypeChange?: (entryType: string) => void;
  queryFilterString?: string;
  onQueryFilterStringChange?: (queryFilterString: string) => void;
}

export function GroupMealPlanRuleForm({
  queryFilter = null,
  day = "unset",
  onDayChange,
  entryType = "unset",
  onEntryTypeChange,
  onQueryFilterStringChange,
}: GroupMealPlanRuleFormProps) {
  const { t } = useI18n();

  const MEAL_TYPE_OPTIONS = [
    { title: t("meal-plan.breakfast"), value: "breakfast" },
    { title: t("meal-plan.lunch"), value: "lunch" },
    { title: t("meal-plan.dinner"), value: "dinner" },
    { title: t("meal-plan.side"), value: "side" },
    { title: t("meal-plan.snack"), value: "snack" },
    { title: t("meal-plan.drink"), value: "drink" },
    { title: t("meal-plan.dessert"), value: "dessert" },
    { title: t("meal-plan.type-any"), value: "unset" },
  ];

  const MEAL_DAY_OPTIONS = [
    { title: t("general.monday"), value: "monday" },
    { title: t("general.tuesday"), value: "tuesday" },
    { title: t("general.wednesday"), value: "wednesday" },
    { title: t("general.thursday"), value: "thursday" },
    { title: t("general.friday"), value: "friday" },
    { title: t("general.saturday"), value: "saturday" },
    { title: t("general.sunday"), value: "sunday" },
    { title: t("meal-plan.day-any"), value: "unset" },
  ];

  function handleQueryFilterInput(value: string | undefined) {
    onQueryFilterStringChange?.(value || "");
  }

  const fieldDefs: FieldDefinition[] = [
    {
      name: "recipe_category.id",
      label: t("category.categories"),
      type: Organizer.Category,
    },
    {
      name: "tags.id",
      label: t("tag.tags"),
      type: Organizer.Tag,
    },
    {
      name: "recipe_ingredient.food.id",
      label: t("recipe.ingredients"),
      type: Organizer.Food,
    },
    {
      name: "recipe_ingredient.food.label_id",
      label: t("data-pages.foods.food-label"),
      type: Organizer.Label,
    },
    {
      name: "tools.id",
      label: t("tool.tools"),
      type: Organizer.Tool,
    },
    {
      name: "household_id",
      label: t("household.households"),
      type: Organizer.Household,
    },
    {
      name: "user_id",
      label: t("user.users"),
      type: Organizer.User,
    },
    {
      name: "rating",
      label: t("general.rating"),
      type: "number",
    },
    {
      name: "total_time_seconds",
      label: t("recipe.total-time"),
      type: "duration",
    },
    {
      name: "last_made",
      label: t("general.last-made"),
      type: "relativeDate",
    },
    {
      name: "created_at",
      label: t("general.date-created"),
      type: "date",
    },
    {
      name: "updated_at",
      label: t("general.date-updated"),
      type: "date",
    },
  ];

  return (
    <div>
      <Box sx={{ display: { xs: "block", md: "flex" }, gap: "10px" }}>
        <TextField
          select
          fullWidth
          variant="filled"
          label={t("meal-plan.rule-day")}
          value={day}
          onChange={event => onDayChange?.(event.target.value)}
          sx={{ flex: 1 }}
        >
          {MEAL_DAY_OPTIONS.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.title}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          variant="filled"
          label={t("meal-plan.meal-type")}
          value={entryType}
          onChange={event => onEntryTypeChange?.(event.target.value)}
          sx={{ flex: 1 }}
        >
          {MEAL_TYPE_OPTIONS.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.title}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ mb: 5 }}>
        <QueryFilterBuilder
          fieldDefs={fieldDefs}
          initialQueryFilter={queryFilter}
          onInput={handleQueryFilterInput}
        />
      </Box>

      {/* the day name is not pluralized in the message */}
      {t("meal-plan.this-rule-will-apply", {
        dayCriteria: day === "unset"
          ? t("meal-plan.to-all-days")
          : t("meal-plan.on-days", [t("general." + day)]),
        mealTypeCriteria: entryType === "unset"
          ? t("meal-plan.for-all-meal-types")
          : t("meal-plan.for-type-meal-types", [t("meal-plan." + entryType)]),
      })}
    </div>
  );
}
