import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { SelectInput, TextInput } from "~/components/global/form";
import { MealPlanDatePicker } from "~/components/Domain/Mealplan/MealPlanDatePicker";
import { RecipeSelector } from "~/components/Domain/Recipe/RecipeSelector";
import type { RecipeSelectorHandle } from "~/components/Domain/Recipe/RecipeSelector";
import { usePlanTypeOptions } from "~/hooks/use-group-mealplan";
import { useI18n } from "~/hooks/use-global-i18n";
import { buildRuleQueryFilter, useMealplanRules } from "~/hooks/use-mealplan-rules";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";
import type { CreatePlanEntry, PlanEntryType, ReadPlanEntry, UpdatePlanEntry } from "~/lib/api/types/meal-plan";
import type { RecipeSummary } from "~/lib/api/types/recipe";

export interface GroupMealPlanEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: ReadPlanEntry | null;
  date?: Date | null;
  onCreate?: (payload: CreatePlanEntry) => void;
  onUpdate?: (payload: UpdatePlanEntry) => void;
}

function parseEntryDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year!, month! - 1, day);
}

export function GroupMealPlanEntryDialog({ open, onOpenChange, entry = null, date = null, onCreate, onUpdate }: GroupMealPlanEntryDialogProps) {
  const i18n = useI18n();
  const { rules } = useMealplanRules();
  const planTypeOptions = usePlanTypeOptions();
  const selector = useRef<RecipeSelectorHandle>(null);

  const [entryMode, setEntryMode] = useState<"recipe" | "note">("recipe");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entryType, setEntryType] = useState<PlanEntryType>("dinner");
  const [recipe, setRecipe] = useState<RecipeSummary | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [ignoreRules, setIgnoreRules] = useState(false);

  const isRecipe = entryMode === "recipe";
  const applicableRuleFilter = buildRuleQueryFilter(rules, selectedDate, entryType);
  const ruleQueryFilter = ignoreRules ? null : applicableRuleFilter;
  const submitDisabled = isRecipe ? !recipe : !title.trim();

  useEffect(() => {
    if (!open) return;
    setEntryMode(entry && !entry.recipeId ? "note" : "recipe");
    setSelectedDate(entry ? parseEntryDate(entry.date) : date ?? new Date());
    setEntryType(entry?.entryType ?? "dinner");
    setRecipe(entry?.recipe ?? null);
    setTitle(entry?.title ?? "");
    setText(entry?.text ?? "");
    setIgnoreRules(false);
    selector.current?.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- initialise when opened
  }, [open]);

  function submit() {
    const payload = {
      date: format(selectedDate, "yyyy-MM-dd"),
      entryType,
      title: isRecipe ? "" : title,
      text: isRecipe ? "" : text,
      recipeId: isRecipe ? recipe?.id : null,
    };
    if (entry) {
      onUpdate?.({ ...payload, id: entry.id, groupId: entry.groupId, userId: entry.userId });
    }
    else {
      onCreate?.(payload);
    }
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? i18n.t("meal-plan.update-this-meal-plan") : i18n.t("meal-plan.create-a-new-meal-plan")}
      submitText={entry ? i18n.t("general.update") : i18n.t("general.create")}
      icon={icons.foods}
      submitDisabled={submitDisabled}
      color="primary"
      width={1000}
      canSubmit
      disableSubmitOnEnter
      onSubmit={submit}
    >
      <Box sx={{ p: 2 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <ToggleButtonGroup
              value={entryMode}
              exclusive
              color="primary"
              onChange={(_, v: "recipe" | "note" | null) => v && setEntryMode(v)}
              sx={{ width: "100%", mb: 2 }}
            >
              <ToggleButton value="recipe" sx={{ flexGrow: 1, gap: 1 }}>
                <Icon path={icons.silverwareForkKnife} />
                {i18n.t("general.recipe")}
              </ToggleButton>
              <ToggleButton value="note" sx={{ flexGrow: 1, gap: 1 }}>
                <Icon path={icons.textBox} />
                {i18n.t("meal-plan.note")}
              </ToggleButton>
            </ToggleButtonGroup>

            <MealPlanDatePicker<Date> value={selectedDate} onChange={setSelectedDate} entryType={entryType} />

            <SelectInput
              value={entryType}
              onChange={v => setEntryType(v as PlanEntryType)}
              sx={{ mt: 2 }}
              items={planTypeOptions}
              label={i18n.t("recipe.entry-type")}
              itemTitle="text"
              itemValue="value"
              hideDetails
            />
          </Grid>

          {/* both modes fill the same pane, so the dialog doesn't resize when switching between them */}
          <Grid size={{ xs: 12, md: 7 }} sx={{ position: "relative", minHeight: "clamp(320px, 45vh, 520px)" }}>
            <Box sx={{ position: { md: "absolute" }, inset: { md: 12 }, overflowY: "auto", height: { xs: 480, md: "auto" } }}>
              {isRecipe
                ? (
                    <RecipeSelector
                      ref={selector}
                      value={recipe}
                      onChange={setRecipe}
                      height="100%"
                      queryFilter={ruleQueryFilter}
                      filters={(
                        <FormControlLabel
                          sx={{ ml: "auto", alignSelf: "flex-start" }}
                          control={<Switch size="small" checked={ignoreRules} disabled={!applicableRuleFilter} onChange={e => setIgnoreRules(e.target.checked)} />}
                          label={i18n.t("meal-plan.ignore-rules")}
                        />
                      )}
                      noResults={ruleQueryFilter
                        ? (
                            <Alert severity="info" variant="standard">
                              <div>{i18n.t("meal-plan.no-recipes-match-your-rules")}</div>
                              <Button sx={{ mt: 1 }} size="small" color="info" variant="outlined" onClick={() => setIgnoreRules(true)}>
                                {i18n.t("meal-plan.ignore-rules")}
                              </Button>
                            </Alert>
                          )
                        : <Alert severity="info" variant="standard">{i18n.t("search.no-results")}</Alert>}
                    />
                  )
                : (
                    <div>
                      <TextInput value={title} onChange={setTitle} label={i18n.t("meal-plan.meal-title")} rules={[validators.required]} />
                      <TextInput value={text} onChange={setText} label={i18n.t("meal-plan.meal-note")} multiline rows={6} />
                    </div>
                  )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </BaseDialog>
  );
}

export default GroupMealPlanEntryDialog;
