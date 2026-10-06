// Usage: <GroupMealPlanEntryDialog open={open} onOpenChange={setOpen} entry={entry} date={date}
//          onCreate={payload => actions.createOne(payload)} onUpdate={payload => actions.updateOne(payload)} />
// Dialog to create a meal plan entry for `date` (recipe or note), or to update `entry`. The fields are reset from the
// props each time the dialog opens (Vue `watch(dialog)`).
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { format } from "date-fns";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { MealPlanDatePicker } from "@/components/Domain/Mealplan/MealPlanDatePicker";
import { RecipeSelector } from "@/components/Domain/Recipe/RecipeSelector";
import { usePlanTypeOptions } from "@/hooks/use-group-mealplan";
import { buildRuleQueryFilter, useMealplanRules } from "@/hooks/use-mealplan-rules";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { CreatePlanEntry, PlanEntryType, ReadPlanEntry, UpdatePlanEntry } from "@/lib/api/types/meal-plan";
import type { RecipeSummary } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

interface GroupMealPlanEntryDialogProps {
  entry?: ReadPlanEntry | null;
  date?: Date | null;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreate?: (payload: CreatePlanEntry) => void;
  onUpdate?: (payload: UpdatePlanEntry) => void;
}

type EntryMode = "recipe" | "note";

function parseEntryDate(date: string) {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

interface FormState {
  entryMode: EntryMode;
  selectedDate: Date;
  entryType: PlanEntryType;
  recipe: RecipeSummary | null;
  title: string;
  text: string;
  ignoreRules: boolean;
}

export function GroupMealPlanEntryDialog({ entry = null, date = null, open, onOpenChange, onCreate, onUpdate }: GroupMealPlanEntryDialogProps) {
  const { t } = useI18n();
  const { rules } = useMealplanRules();
  const planTypeOptions = usePlanTypeOptions();

  function initialState(): FormState {
    return {
      entryMode: entry && !entry.recipeId ? "note" : "recipe",
      selectedDate: entry ? parseEntryDate(entry.date) : date ?? new Date(),
      entryType: entry?.entryType ?? "dinner",
      recipe: entry?.recipe ?? null,
      title: entry?.title ?? "",
      text: entry?.text ?? "",
      ignoreRules: false,
    };
  }

  const [state, setState] = useState<FormState>(() => ({
    entryMode: "recipe",
    selectedDate: new Date(),
    entryType: "dinner",
    recipe: null,
    title: "",
    text: "",
    ignoreRules: false,
  }));
  const { entryMode, selectedDate, entryType, recipe, title, text, ignoreRules } = state;

  function update(change: Partial<FormState>) {
    setState(current => ({ ...current, ...change }));
  }

  // initialize whenever the dialog opens (Vue: watch(dialog))
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setState(initialState());
    }
  }

  const isRecipe = entryMode === "recipe";

  const applicableRuleFilter = buildRuleQueryFilter(rules, selectedDate, entryType);
  const ruleQueryFilter = ignoreRules ? null : applicableRuleFilter;

  const submitDisabled = isRecipe ? !recipe : !title.trim();

  const form = useFormValidation({
    title: field<string>(title, [validators.required]),
  });

  function submit() {
    const payload = {
      date: format(selectedDate, "yyyy-MM-dd"),
      entryType,
      title: isRecipe ? "" : title,
      text: isRecipe ? "" : text,
      recipeId: isRecipe ? recipe?.id : null,
    };

    if (entry) {
      onUpdate?.({
        ...payload,
        id: entry.id,
        groupId: entry.groupId,
        userId: entry.userId,
      });
    }
    else {
      onCreate?.(payload);
    }
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? t("meal-plan.update-this-meal-plan") : t("meal-plan.create-a-new-meal-plan")}
      submitText={entry ? t("general.update") : t("general.create")}
      icon={icons.foods}
      submitDisabled={submitDisabled}
      color="primary"
      width="1000"
      canSubmit
      disableSubmitOnEnter
      onSubmit={submit}
    >
      <CardContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <ToggleButtonGroup
              exclusive
              fullWidth
              color="primary"
              value={entryMode}
              onChange={(_event, value: EntryMode | null) => {
                // mandatory: one of the two stays selected
                if (value) {
                  update({ entryMode: value });
                }
              }}
              sx={{ mb: 2 }}
            >
              <ToggleButton value="recipe" sx={{ flexGrow: 1 }}>
                <MdiIcon path={icons.silverwareForkKnife} sx={{ mr: 1 }} />
                {t("general.recipe")}
              </ToggleButton>
              <ToggleButton value="note" sx={{ flexGrow: 1 }}>
                <MdiIcon path={icons.textBox} sx={{ mr: 1 }} />
                {t("meal-plan.note")}
              </ToggleButton>
            </ToggleButtonGroup>

            <MealPlanDatePicker
              value={selectedDate}
              entryType={entryType}
              onChange={value => update({ selectedDate: Array.isArray(value) ? (value[0] ?? selectedDate) : value })}
            />

            <TextField
              select
              fullWidth
              variant="filled"
              label={t("recipe.entry-type")}
              value={entryType}
              onChange={event => update({ entryType: event.target.value as PlanEntryType })}
              sx={{ mt: 2 }}
            >
              {planTypeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.text}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* both modes fill the same pane, so the dialog doesn't resize when switching between them */}
          <Grid
            size={{ xs: 12, md: 7 }}
            sx={{
              "position": "relative",
              "minHeight": "clamp(320px, 45vh, 520px)",
              // Take the pane out of flow so a long result list scrolls inside it instead of growing the
              // dialog, while it still stretches to the height of the settings column beside it.
              "& > *": { position: "absolute", inset: "12px", overflowY: "auto" },
            }}
          >
            {isRecipe
              ? (
                  <RecipeSelector
                    value={recipe}
                    onChange={selected => update({ recipe: selected })}
                    height="auto"
                    queryFilter={ruleQueryFilter}
                    filters={(
                      <FormControlLabel
                        sx={{ flexGrow: 0, ml: "auto", mr: 0, alignSelf: "flex-start" }}
                        disabled={!applicableRuleFilter}
                        control={(
                          <Switch
                            size="small"
                            color="primary"
                            checked={ignoreRules}
                            onChange={event => update({ ignoreRules: event.target.checked })}
                          />
                        )}
                        label={t("meal-plan.ignore-rules")}
                      />
                    )}
                    noResults={ruleQueryFilter
                      ? (
                          <Alert severity="info">
                            <div>{t("meal-plan.no-recipes-match-your-rules")}</div>
                            <Button
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ mt: 1 }}
                              onClick={() => update({ ignoreRules: true })}
                            >
                              {t("meal-plan.ignore-rules")}
                            </Button>
                          </Alert>
                        )
                      : <Alert severity="info">{t("search.no-results")}</Alert>}
                  />
                )
              : (
                  <Box>
                    <TextField
                      fullWidth
                      variant="filled"
                      label={t("meal-plan.meal-title")}
                      value={title}
                      onChange={event => update({ title: event.target.value })}
                      {...form.fieldProps("title")}
                    />
                    <TextField
                      fullWidth
                      multiline
                      minRows={6}
                      variant="filled"
                      label={t("meal-plan.meal-note")}
                      value={text}
                      onChange={event => update({ text: event.target.value })}
                      sx={{ mt: 2 }}
                    />
                  </Box>
                )}
          </Grid>
        </Grid>
      </CardContent>
    </BaseDialog>
  );
}
