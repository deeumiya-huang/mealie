import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import type { ParseIngredientsController } from "~/hooks/recipes/use-parse-ingredients-dialog";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseButton } from "~/components/global/BaseButton";
import { Icon } from "~/components/global/Icon";
import { CheckboxInput } from "~/components/global/form";
import { RecipeIngredientEditor } from "../../../RecipeIngredientEditor";
import { ParseDialogChangeParser } from "./ParseDialogChangeParser";

function asPercentage(num: number | undefined): string {
  if (!num) return "0%";
  return Math.round(num * 100).toFixed(2) + "%";
}

export function ParseDialogParse({ dialogState: d }: { dialogState: ParseIngredientsController }) {
  const i18n = useI18n();
  const currentIng = d.currentIng;
  const low = (currentIng?.confidence?.average || 0) < d.confidenceThreshold;

  return (
    <>
      <ParseDialogChangeParser
        value={d.parser}
        onChange={(p) => {
          d.parser = p;
        }}
        availableParsers={d.availableParsers}
        showNlpLanguageHint={d.showNlpLanguageHint}
        onParse={() => void d.parseIngredients()}
      />
      {currentIng && (
        <CardContent sx={{ pb: 0, mb: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ textAlign: "center", px: 4, py: 2, mb: 3, bgcolor: "action.hover", borderRadius: 999 }}>
            <Typography variant="h5" sx={{ fontStyle: "italic" }}>{currentIng.input}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", p: 0, m: 0 }}>
            <Icon path={low ? icons.alert : icons.check} color={low ? "error" : "success"} />
            <Box component="span" sx={{ ml: 1, color: d.currentIngHasError ? "error.main" : "success.main" }}>
              {i18n.t("recipe.parser.confidence-score")}: {currentIng.confidence ? asPercentage(currentIng.confidence?.average ?? undefined) : ""}
            </Box>
          </Box>
          <RecipeIngredientEditor
            key={currentIng.ingredient.referenceId ?? d.state.currentParsedIndex}
            value={currentIng.ingredient}
            onChange={(ingredient) => {
              currentIng.ingredient = ingredient;
              d.notify();
            }}
            unitError={!!d.currentMissingUnit}
            unitErrorTooltip={i18n.t("recipe.parser.this-unit-could-not-be-parsed-automatically")}
            foodError={!!d.currentMissingFood}
            foodErrorTooltip={i18n.t("recipe.parser.this-food-could-not-be-parsed-automatically")}
          />
          <CardActions sx={{ flexWrap: "wrap", gap: 1 }}>
            <CheckboxInput
              color="error"
              hideDetails
              density="compact"
              sx={{ mt: 4 }}
              checked={d.currentIngShouldDelete}
              onChange={(v) => {
                d.currentIngShouldDelete = v;
                d.notify();
              }}
              label={i18n.t("recipe.parser.delete-item")}
            />
            <Box sx={{ flex: 1 }} />
            {d.currentMissingUnit && !currentIng.ingredient.unit?.id && (
              <BaseButton icon={icons.units} color="warning" small loading={d.state.loading.unit} onClick={() => void d.createMissingUnit()}>
                {i18n.t("recipe.parser.missing-unit", { unit: d.currentMissingUnit })}
              </BaseButton>
            )}
            {d.currentMissingUnit && currentIng.ingredient.unit?.id && d.currentMissingUnit.toLowerCase() !== currentIng.ingredient.unit?.name.toLowerCase() && (
              <BaseButton icon={icons.units} color="warning" small loading={d.state.loading.unit} onClick={() => void d.addMissingUnitAsAlias()}>
                {i18n.t("recipe.parser.add-text-as-alias-for-item", { text: d.currentMissingUnit, item: currentIng.ingredient.unit.name })}
              </BaseButton>
            )}
            {d.currentMissingFood && !currentIng.ingredient.food?.id && (
              <BaseButton icon={icons.foods} color="warning" small loading={d.state.loading.food} onClick={() => void d.createMissingFood()}>
                {i18n.t("recipe.parser.missing-food", { food: d.currentMissingFood })}
              </BaseButton>
            )}
            {d.currentMissingFood && currentIng.ingredient.food?.id && d.currentMissingFood.toLowerCase() !== currentIng.ingredient.food?.name.toLowerCase() && (
              <BaseButton icon={icons.foods} color="warning" small loading={d.state.loading.food} onClick={() => void d.addMissingFoodAsAlias()}>
                {i18n.t("recipe.parser.add-text-as-alias-for-item", { text: d.currentMissingFood, item: currentIng.ingredient.food.name })}
              </BaseButton>
            )}
          </CardActions>
        </CardContent>
      )}
    </>
  );
}

export default ParseDialogParse;
