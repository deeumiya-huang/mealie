// Usage: <RecipePageIngredientToolsView recipe={displayedRecipe} scale={scale} isCookMode={false} ingredientStorageKey={key} />
// The ingredient checklist plus the "Required Tools" list; members of the recipe's group tick the tools their
// household has on hand (saved to the tool).
import { useId, useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { RecipeIngredients } from "@/components/Domain/Recipe/RecipeIngredients";
import { usePageState, usePageUser } from "@/hooks/recipe-page/shared-state";
import { useToolStore } from "@/hooks/store";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useI18n } from "@/i18n";
import type { RecipeTool } from "@/lib/api/types/recipe";
import type { RecipeModel } from "../recipe-model";

interface RecipeToolWithOnHand extends RecipeTool {
  onHand: boolean;
}

interface RecipePageIngredientToolsViewProps {
  recipe: RecipeModel;
  scale: number;
  isCookMode?: boolean;
  ingredientStorageKey?: string;
  sx?: SxProps<Theme>;
}

type UpdateTool = (tool: RecipeTool) => unknown;

interface RequiredToolsProps {
  tools: RecipeTool[];
  /** Saves a tool; null when the reader is not a member of the recipe's group (Vue: no tool store then). */
  updateOne: UpdateTool | null;
}

function RequiredTools({ tools, updateOne }: RequiredToolsProps) {
  const { t } = useI18n();
  const { user } = usePageUser();
  const idPrefix = useId();

  function withOnHand(list: RecipeTool[]): RecipeToolWithOnHand[] {
    if (!(user.householdSlug && updateOne)) {
      return list.map(tool => ({ ...tool, onHand: false }));
    }
    return list.map((tool) => {
      const onHand = tool.householdsWithTool?.includes(user.householdSlug) || false;
      return { ...tool, onHand };
    });
  }

  // Vue: watch(() => props.recipe.tools, …, { immediate: true })
  const [recipeTools, setRecipeTools] = useState(() => withOnHand(tools));
  const [prevTools, setPrevTools] = useState(tools);
  if (prevTools !== tools) {
    setPrevTools(tools);
    setRecipeTools(withOnHand(tools));
  }

  function updateTool(index: number, onHand: boolean) {
    const current = recipeTools[index];
    if (!current) {
      return;
    }
    let tool: RecipeToolWithOnHand = { ...current, onHand };

    if (user.id && user.householdSlug && updateOne) {
      if (tool.onHand && !tool.householdsWithTool?.includes(user.householdSlug)) {
        tool = { ...tool, householdsWithTool: [...(tool.householdsWithTool ?? []), user.householdSlug] };
      }
      else if (!tool.onHand && tool.householdsWithTool?.includes(user.householdSlug)) {
        tool = { ...tool, householdsWithTool: tool.householdsWithTool.filter(household => household !== user.householdSlug) };
      }

      setRecipeTools(list => list.map((item, i) => (i === index ? tool : item)));
      void updateOne(tool);
    }
    else {
      setRecipeTools(list => list.map((item, i) => (i === index ? tool : item)));
      console.log("no user, skipping server update");
    }
  }

  return (
    <div>
      <Typography variant="h5" component="h2" sx={{ mt: 4, fontWeight: 500, opacity: 0.8 }}>
        {t("tool.required-tools")}
      </Typography>
      <List dense>
        {tools.map((tool, index) => (
          <ListItem key={index} dense sx={{ px: 0.5 }}>
            <Checkbox
              checked={recipeTools[index]?.onHand ?? false}
              color="secondary"
              size="small"
              sx={{ pt: 0, my: "auto" }}
              slotProps={{ input: { "aria-labelledby": `${idPrefix}-${index}` } }}
              onChange={event => updateTool(index, event.target.checked)}
            />
            <ListItemText id={`${idPrefix}-${index}`} primary={tool.name} />
          </ListItem>
        ))}
      </List>
    </div>
  );
}

/** The tool list with the shared tool store (only mounted for members of the recipe's group). */
function RequiredToolsWithStore({ tools }: { tools: RecipeTool[] }) {
  const toolStore = useToolStore();
  return <RequiredTools tools={tools} updateOne={tool => toolStore.actions.updateOne(tool)} />;
}

export function RecipePageIngredientToolsView({
  recipe,
  scale,
  isCookMode = false,
  ingredientStorageKey = undefined,
  sx,
}: RecipePageIngredientToolsViewProps) {
  const { isOwnGroup } = useLoggedInState();
  const { isEditMode } = usePageState(recipe.slug);

  return (
    <Box sx={sx}>
      <RecipeIngredients
        value={recipe.recipeIngredient}
        scale={scale}
        isCookMode={isCookMode}
        storageKey={ingredientStorageKey}
      />
      {!isEditMode && recipe.tools && recipe.tools.length > 0 && (
        isOwnGroup
          ? <RequiredToolsWithStore tools={recipe.tools} />
          : <RequiredTools tools={recipe.tools} updateOne={null} />
      )}
    </Box>
  );
}
