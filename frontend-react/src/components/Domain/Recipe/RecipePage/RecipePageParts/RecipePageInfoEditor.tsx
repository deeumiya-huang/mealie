import Grid from "@mui/material/Grid";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe } from "~/lib/api/types/recipe";
import { useI18n } from "~/hooks/use-global-i18n";
import { validators } from "~/hooks/use-validators";
import { NumberInput, TextInput } from "~/components/global/form";
import { RecipeTimeInput } from "../../RecipeTimeInput";

type R = NoUndefinedField<Recipe>;

export function RecipePageInfoEditor({ value: recipe, onChange }: { value: R; onChange: (recipe: R) => void }) {
  const i18n = useI18n();
  const set = (patch: Partial<R>) => onChange({ ...recipe, ...patch });
  return (
    <div>
      <TextInput value={recipe.name} onChange={name => set({ name })} sx={{ my: 1.5 }} label={i18n.t("recipe.recipe-name")} rules={[validators.required]} variant="underlined" />
      <Grid container spacing={2}>
        <Grid size={3}>
          <NumberInput value={recipe.recipeServings} onChange={v => set({ recipeServings: v ?? 0 })} min={0} label={i18n.t("recipe.servings")} variant="underlined" />
        </Grid>
        <Grid size={3}>
          <NumberInput value={recipe.recipeYieldQuantity} onChange={v => set({ recipeYieldQuantity: v ?? 0 })} min={0} label={i18n.t("recipe.yield")} variant="underlined" />
        </Grid>
        <Grid size={6}>
          <TextInput value={recipe.recipeYield} onChange={recipeYield => set({ recipeYield })} label={i18n.t("recipe.yield-text")} variant="underlined" />
        </Grid>
      </Grid>
      <RecipeTimeInput
        seconds={recipe.totalTimeSeconds}
        onSecondsChange={s => set({ totalTimeSeconds: s as number })}
        text={recipe.totalTime}
        onTextChange={totalTime => set({ totalTime })}
        label={i18n.t("recipe.total-time")}
      />
      <RecipeTimeInput
        seconds={recipe.prepTimeSeconds}
        onSecondsChange={s => set({ prepTimeSeconds: s as number })}
        text={recipe.prepTime}
        onTextChange={prepTime => set({ prepTime })}
        label={i18n.t("recipe.prep-time")}
      />
      <RecipeTimeInput
        seconds={recipe.performTimeSeconds}
        onSecondsChange={s => set({ performTimeSeconds: s as number })}
        text={recipe.performTime}
        onTextChange={performTime => set({ performTime })}
        label={i18n.t("recipe.perform-time")}
      />
      <TextInput value={recipe.description} onChange={description => set({ description })} multiline autoGrow rows={4} label={i18n.t("recipe.description")} variant="underlined" />
    </div>
  );
}

export default RecipePageInfoEditor;
