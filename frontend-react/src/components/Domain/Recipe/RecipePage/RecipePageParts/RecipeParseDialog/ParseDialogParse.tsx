// Usage: <ParseDialogParse dialogState={state} /> — the review step for one parsed ingredient: the original text, the
// parser's confidence, the editable result, "delete" and buttons to create the missing unit/food or add the text as an
// alias of the chosen one. `dialogState` is the return value of useParseIngredientsDialog.
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { RecipeIngredientEditor } from "@/components/Domain/Recipe/RecipeIngredientEditor";
import { BaseButton } from "@/components/global/BaseButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import type { ParseIngredientsDialogState } from "@/hooks/recipes/use-parse-ingredients-dialog";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { ParseDialogChangeParser } from "./ParseDialogChangeParser";

interface ParseDialogParseProps {
  dialogState: ParseIngredientsDialogState;
}

function asPercentage(num: number | undefined): string {
  if (!num) {
    return "0%";
  }

  return Math.round(num * 100).toFixed(2) + "%";
}

export function ParseDialogParse({ dialogState }: ParseDialogParseProps) {
  const { t } = useI18n();
  const {
    state,
    currentIng,
    showNlpLanguageHint,
    availableParsers,
    currentIngShouldDelete,
    parser,
    confidenceThreshold,
    currentIngHasError,
    currentMissingFood,
    currentMissingUnit,
    parseIngredients,
    createMissingFood,
    createMissingUnit,
    addMissingFoodAsAlias,
    addMissingUnitAsAlias,
    setParser,
    setCurrentIngredient,
    setCurrentIngShouldDelete,
  } = dialogState;

  const lowConfidence = (currentIng?.confidence?.average || 0) < confidenceThreshold;
  const unit = currentIng?.ingredient.unit;
  const food = currentIng?.ingredient.food;

  return (
    <>
      <ParseDialogChangeParser
        value={parser}
        availableParsers={availableParsers}
        showNlpLanguageHint={showNlpLanguageHint}
        onChange={setParser}
        onParse={() => void parseIngredients()}
      />
      {currentIng && (
        <CardContent sx={{ pb: 0, mb: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={theme => ({ textAlign: "center", px: 4, py: 2, mb: 3, bgcolor: theme.palette.action.hover, borderRadius: 9999 })}>
            <Typography variant="h5" component="p" sx={{ fontStyle: "italic" }}>
              {currentIng.input}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", p: 0, m: 0 }}>
            <MdiIcon
              path={lowConfidence ? icons.alert : icons.check}
              sx={{ color: lowConfidence ? "error.main" : "success.main" }}
            />
            <Box component="span" sx={{ ml: 1, color: currentIngHasError ? "error.main" : "success.main" }}>
              {t("recipe.parser.confidence-score")}
              {": "}
              {currentIng.confidence ? asPercentage(currentIng.confidence.average ?? undefined) : ""}
            </Box>
          </Box>
          <RecipeIngredientEditor
            value={currentIng.ingredient}
            onChange={setCurrentIngredient}
            unitError={!!currentMissingUnit}
            unitErrorTooltip={t("recipe.parser.this-unit-could-not-be-parsed-automatically")}
            foodError={!!currentMissingFood}
            foodErrorTooltip={t("recipe.parser.this-food-could-not-be-parsed-automatically")}
          />
          <CardActions sx={{ flexWrap: "wrap", gap: 1 }}>
            <FormControlLabel
              sx={{ mt: 4 }}
              label={t("recipe.parser.delete-item")}
              control={(
                <Checkbox
                  size="small"
                  color="error"
                  checked={currentIngShouldDelete}
                  onChange={event => setCurrentIngShouldDelete(event.target.checked)}
                />
              )}
            />
            <Box sx={{ flexGrow: 1 }} />
            {!!currentMissingUnit && !unit?.id && (
              <BaseButton
                icon={icons.units}
                color="warning"
                small
                loading={state.loading.unit}
                onClick={() => void createMissingUnit()}
              >
                {t("recipe.parser.missing-unit", { unit: currentMissingUnit })}
              </BaseButton>
            )}
            {!!currentMissingUnit
              && !!unit?.id
              && currentMissingUnit.toLowerCase() != unit.name.toLowerCase() && (
              <BaseButton
                icon={icons.units}
                color="warning"
                small
                loading={state.loading.unit}
                onClick={() => void addMissingUnitAsAlias()}
              >
                {t("recipe.parser.add-text-as-alias-for-item", { text: currentMissingUnit, item: unit.name })}
              </BaseButton>
            )}
            {!!currentMissingFood && !food?.id && (
              <BaseButton
                icon={icons.foods}
                color="warning"
                small
                loading={state.loading.food}
                onClick={() => void createMissingFood()}
              >
                {t("recipe.parser.missing-food", { food: currentMissingFood })}
              </BaseButton>
            )}
            {!!currentMissingFood
              && !!food?.id
              && currentMissingFood.toLowerCase() != food.name.toLowerCase() && (
              <BaseButton
                icon={icons.foods}
                color="warning"
                small
                loading={state.loading.food}
                onClick={() => void addMissingFoodAsAlias()}
              >
                {t("recipe.parser.add-text-as-alias-for-item", { text: currentMissingFood, item: food.name })}
              </BaseButton>
            )}
          </CardActions>
        </CardContent>
      )}
    </>
  );
}
