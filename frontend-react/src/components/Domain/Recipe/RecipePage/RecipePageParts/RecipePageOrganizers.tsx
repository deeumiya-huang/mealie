import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import { Organizer } from "~/lib/api/types/non-generated";
import type { Recipe, RecipeCategory, RecipeTag, RecipeTool } from "~/lib/api/types/recipe";
import { usePageState } from "~/hooks/recipe-page/shared-state";
import { useI18n } from "~/hooks/use-global-i18n";
import { RecipeAssets } from "../../RecipeAssets";
import { RecipeChips } from "../../RecipeChips";
import type { RecipeChipsProps } from "../../RecipeChips";
import { RecipeNutrition } from "../../RecipeNutrition";
import { RecipeOrganizerSelector } from "../../RecipeOrganizerSelector";

type R = NoUndefinedField<Recipe>;

export function RecipePageOrganizers({ value: recipe, onChange, sx, onItemSelected }: { value: R; onChange: (recipe: R | ((prev: R) => R)) => void; sx?: SxProps<Theme>; onItemSelected?: RecipeChipsProps["onItemSelected"] }) {
  const i18n = useI18n();
  const { isEditForm } = usePageState(recipe.slug);

  const section = (title: string, children: React.ReactNode, mt: number) => (
    <Card sx={{ mt }}>
      <Typography variant="h6" sx={{ px: 2, py: 1 }}>{title}</Typography>
      <Divider sx={{ mx: 1 }} />
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <Box sx={sx}>
      {(recipe.recipeCategory.length > 0 || isEditForm) && section(
        i18n.t("recipe.categories"),
        isEditForm
          ? <RecipeOrganizerSelector<RecipeCategory> value={recipe.recipeCategory} onChange={v => onChange(prev => ({ ...prev, recipeCategory: v as R["recipeCategory"] }))} selectorType={Organizer.Category} />
          : <RecipeChips items={recipe.recipeCategory} onItemSelected={onItemSelected} />,
        isEditForm ? 0 : 5,
      )}
      {(recipe.tags.length > 0 || isEditForm) && section(
        i18n.t("tag.tags"),
        isEditForm
          ? <RecipeOrganizerSelector<RecipeTag> value={recipe.tags} onChange={v => onChange(prev => ({ ...prev, tags: v as R["tags"] }))} selectorType={Organizer.Tag} />
          : <RecipeChips items={recipe.tags} urlPrefix="tags" onItemSelected={onItemSelected} />,
        2,
      )}
      {isEditForm && section(
        i18n.t("tool.required-tools"),
        <RecipeOrganizerSelector<RecipeTool> value={recipe.tools} onChange={v => onChange(prev => ({ ...prev, tools: v as R["tools"] }))} selectorType={Organizer.Tool} />,
        2,
      )}
      {recipe.settings.showNutrition && (
        <RecipeNutrition value={recipe.nutrition} onChange={nutrition => onChange(prev => ({ ...prev, nutrition: nutrition as R["nutrition"] }))} sx={{ mt: 2 }} edit={isEditForm} />
      )}
      {recipe.settings.showAssets && (
        <RecipeAssets value={recipe.assets} onChange={assets => onChange(prev => ({ ...prev, assets: assets as R["assets"] }))} edit={isEditForm} slug={recipe.slug} recipeId={recipe.id} />
      )}
    </Box>
  );
}

export default RecipePageOrganizers;
