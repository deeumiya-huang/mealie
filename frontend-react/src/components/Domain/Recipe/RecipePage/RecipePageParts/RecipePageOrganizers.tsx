// Usage: <RecipePageOrganizers recipe={recipe} onChange={update} onItemSelected={(item, type) => …} />
// Categories, tags (chips, or selectors while editing), required tools (editing), nutrition and assets of the recipe.
// (Vue `v-model` → `recipe` + `onChange`; `@item-selected` reached the chips through `$attrs`.)
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { RecipeAssets } from "@/components/Domain/Recipe/RecipeAssets";
import { RecipeChips, type UrlPrefixParam } from "@/components/Domain/Recipe/RecipeChips";
import { RecipeNutrition } from "@/components/Domain/Recipe/RecipeNutrition";
import { RecipeOrganizerSelector } from "@/components/Domain/Recipe/RecipeOrganizerSelector";
import { usePageState } from "@/hooks/recipe-page/shared-state";
import { useI18n } from "@/i18n";
import type { RecipeCategory, RecipeTag, RecipeTool } from "@/lib/api/types/recipe";
import type { RecipeChange, RecipeModel } from "../recipe-model";

interface RecipePageOrganizersProps {
  recipe: RecipeModel;
  onChange: RecipeChange;
  sx?: SxProps<Theme>;
  onItemSelected?: (item: RecipeCategory | RecipeTag | RecipeTool, urlPrefix: UrlPrefixParam) => void;
}

export function RecipePageOrganizers({ recipe, onChange, sx, onItemSelected }: RecipePageOrganizersProps) {
  const { t } = useI18n();
  const { isEditForm } = usePageState(recipe.slug);

  const categories = recipe.recipeCategory ?? [];
  const tags = recipe.tags ?? [];

  return (
    <Box sx={sx}>
      {/* Recipe Categories */}
      {(categories.length > 0 || isEditForm) && (
        <Card sx={{ mt: !isEditForm ? 5 : undefined }}>
          <Typography variant="h6" component="div" sx={{ py: 1, px: 2 }}>
            {t("recipe.categories")}
          </Typography>
          <Divider sx={{ mx: 1 }} />
          <CardContent>
            {isEditForm
              ? (
                  <RecipeOrganizerSelector<RecipeCategory>
                    value={categories}
                    onChange={recipeCategory => onChange(prev => ({ ...prev, recipeCategory: recipeCategory as RecipeModel["recipeCategory"] }))}
                    showAdd
                    selectorType="categories"
                  />
                )
              : (
                  <RecipeChips
                    items={categories}
                    onItemSelected={onItemSelected}
                  />
                )}
          </CardContent>
        </Card>
      )}

      {/* Recipe Tags */}
      {(tags.length > 0 || isEditForm) && (
        <Card sx={{ mt: 2 }}>
          <Typography variant="h6" component="div" sx={{ py: 1, px: 2 }}>
            {t("tag.tags")}
          </Typography>
          <Divider sx={{ mx: 1 }} />
          <CardContent>
            {isEditForm
              ? (
                  <RecipeOrganizerSelector<RecipeTag>
                    value={tags}
                    onChange={recipeTags => onChange(prev => ({ ...prev, tags: recipeTags as RecipeModel["tags"] }))}
                    showAdd
                    selectorType="tags"
                  />
                )
              : (
                  <RecipeChips
                    items={tags}
                    urlPrefix="tags"
                    onItemSelected={onItemSelected}
                  />
                )}
          </CardContent>
        </Card>
      )}

      {/* Recipe Tools Edit */}
      {isEditForm && (
        <Card sx={{ mt: 2 }}>
          <Typography variant="h6" component="div" sx={{ py: 1, px: 2 }}>
            {t("tool.required-tools")}
          </Typography>
          <Divider sx={{ mx: 1 }} />
          <CardContent>
            <RecipeOrganizerSelector<RecipeTool>
              value={recipe.tools}
              onChange={tools => onChange(prev => ({ ...prev, tools: tools as RecipeModel["tools"] }))}
              selectorType="tools"
            />
          </CardContent>
        </Card>
      )}

      {recipe.settings?.showNutrition && (
        <Box sx={{ mt: 2 }}>
          <RecipeNutrition
            value={recipe.nutrition}
            onChange={nutrition => onChange(prev => ({ ...prev, nutrition: nutrition as RecipeModel["nutrition"] }))}
            edit={isEditForm}
          />
        </Box>
      )}
      {recipe.settings?.showAssets && (
        <RecipeAssets
          value={recipe.assets ?? []}
          onChange={assets => onChange(prev => ({ ...prev, assets: assets as RecipeModel["assets"] }))}
          edit={isEditForm}
          slug={recipe.slug}
          recipeId={recipe.id}
        />
      )}
    </Box>
  );
}
