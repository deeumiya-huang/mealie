// Usage: <RecipePageInfoEditor recipe={recipe} onChange={update} /> — the edit form for the recipe's name, servings,
// yield, times and description. (Vue `v-model` → `recipe` + `onChange`.)
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import { RecipeTimeInput } from "@/components/Domain/Recipe/RecipeTimeInput";
import { BaseNumberInput } from "@/components/global/BaseNumberInput";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { RecipeChange, RecipeModel } from "../recipe-model";

interface RecipePageInfoEditorProps {
  recipe: RecipeModel;
  onChange: RecipeChange;
}

export function RecipePageInfoEditor({ recipe, onChange }: RecipePageInfoEditorProps) {
  const { t } = useI18n();
  const form = useFormValidation({
    name: field(recipe.name, [validators.required]),
  });

  const update = (patch: Partial<RecipeModel>) => onChange(prev => ({ ...prev, ...patch }));

  return (
    <div>
      <TextField
        value={recipe.name ?? ""}
        onChange={event => update({ name: event.target.value })}
        sx={{ my: 1.5 }}
        label={t("recipe.recipe-name")}
        size="small"
        variant="standard"
        fullWidth
        {...form.fieldProps("name")}
      />
      <Box sx={{ m: 0, p: 0 }}>
        <Grid container spacing={3}>
          <Grid size={3}>
            <BaseNumberInput
              value={recipe.recipeServings}
              onChange={value => update({ recipeServings: value as number })}
              min={0}
              precision={null}
              density="compact"
              label={t("recipe.servings")}
              variant="underlined"
              controlVariant="hidden"
              fullWidth
            />
          </Grid>
          <Grid size={3}>
            <BaseNumberInput
              value={recipe.recipeYieldQuantity}
              onChange={value => update({ recipeYieldQuantity: value as number })}
              min={0}
              precision={null}
              density="compact"
              label={t("recipe.yield")}
              variant="underlined"
              controlVariant="hidden"
              fullWidth
            />
          </Grid>
          <Grid size={6}>
            <TextField
              value={recipe.recipeYield ?? ""}
              onChange={event => update({ recipeYield: event.target.value })}
              size="small"
              label={t("recipe.yield-text")}
              variant="standard"
              fullWidth
            />
          </Grid>
        </Grid>
      </Box>

      <RecipeTimeInput
        seconds={recipe.totalTimeSeconds}
        onSecondsChange={seconds => update({ totalTimeSeconds: seconds as number })}
        text={recipe.totalTime}
        onTextChange={text => update({ totalTime: text })}
        label={t("recipe.total-time")}
      />
      <RecipeTimeInput
        seconds={recipe.prepTimeSeconds}
        onSecondsChange={seconds => update({ prepTimeSeconds: seconds as number })}
        text={recipe.prepTime}
        onTextChange={text => update({ prepTime: text })}
        label={t("recipe.prep-time")}
      />
      <RecipeTimeInput
        seconds={recipe.performTimeSeconds}
        onSecondsChange={seconds => update({ performTimeSeconds: seconds as number })}
        text={recipe.performTime}
        onTextChange={text => update({ performTime: text })}
        label={t("recipe.perform-time")}
      />
      <TextField
        value={recipe.description ?? ""}
        onChange={event => update({ description: event.target.value })}
        multiline
        minRows={3}
        label={t("recipe.description")}
        size="small"
        variant="standard"
        fullWidth
      />
    </div>
  );
}
