import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe, RecipeTool } from "~/lib/api/types/recipe";
import { usePageState, usePageUser } from "~/hooks/recipe-page/shared-state";
import { useToolStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { RecipeIngredients } from "../../RecipeIngredients";

interface RecipeToolWithOnHand extends RecipeTool {
  onHand: boolean;
}

export interface RecipePageIngredientToolsViewProps {
  recipe: NoUndefinedField<Recipe>;
  scale: number;
  isCookMode?: boolean;
  ingredientStorageKey?: string;
  sx?: SxProps<Theme>;
}

export function RecipePageIngredientToolsView({ recipe, scale, isCookMode = false, ingredientStorageKey, sx }: RecipePageIngredientToolsViewProps) {
  const i18n = useI18n();
  const { isOwnGroup } = useLoggedInState();
  const toolStoreHook = useToolStore();
  const toolStore = isOwnGroup ? toolStoreHook : null;
  const { user } = usePageUser();
  const { isEditMode } = usePageState(recipe.slug);
  const [recipeTools, setRecipeTools] = useState<RecipeToolWithOnHand[]>([]);

  useEffect(() => {
    if (!(user.householdSlug && toolStore)) {
      setRecipeTools(recipe.tools.map(tool => ({ ...tool, onHand: false })));
    }
    else {
      setRecipeTools(recipe.tools.map(tool => ({ ...tool, onHand: tool.householdsWithTool?.includes(user.householdSlug) || false })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- watch(recipe.tools, { immediate })
  }, [recipe.tools]);

  function updateTool(index: number, onHand: boolean) {
    const tool = { ...recipeTools[index]!, onHand };
    setRecipeTools(prev => prev.map((t, i) => (i === index ? tool : t)));
    if (user.id && user.householdSlug && toolStore) {
      if (tool.onHand && !tool.householdsWithTool?.includes(user.householdSlug)) {
        tool.householdsWithTool = [...(tool.householdsWithTool ?? []), user.householdSlug];
      }
      else if (!tool.onHand && tool.householdsWithTool?.includes(user.householdSlug)) {
        tool.householdsWithTool = tool.householdsWithTool.filter(household => household !== user.householdSlug);
      }
      void toolStore.actions.updateOne(tool);
    }
    else {
      console.log("no user, skipping server update");
    }
  }

  return (
    <Box sx={sx}>
      <RecipeIngredients value={recipe.recipeIngredient} scale={scale} isCookMode={isCookMode} storageKey={ingredientStorageKey} />
      {!isEditMode && recipe.tools && recipe.tools.length > 0 && (
        <div>
          <Typography variant="h5" component="h2" sx={{ mt: 2, fontWeight: 500, opacity: 0.8 }}>{i18n.t("tool.required-tools")}</Typography>
          <List dense>
            {recipe.tools.map((tool, index) => (
              <ListItem key={index} sx={{ px: 0.5 }}>
                <Checkbox color="secondary" size="small" checked={!!recipeTools[index]?.onHand} onChange={e => updateTool(index, e.target.checked)} />
                <ListItemText primary={tool.name} />
              </ListItem>
            ))}
          </List>
        </div>
      )}
    </Box>
  );
}

export default RecipePageIngredientToolsView;
