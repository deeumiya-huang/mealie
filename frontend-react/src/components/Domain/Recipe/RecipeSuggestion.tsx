import { useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Icon } from "~/components/global/Icon";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";
import type {
  IngredientFood,
  IngredientFoodSummary,
  RecipeSuggestionSubstitutedFood,
  RecipeSummary,
  RecipeTool,
} from "~/lib/api/types/recipe";
import { RecipeCardMobile } from "./RecipeCardMobile";

export interface RecipeSuggestionProps {
  recipe: RecipeSummary;
  missingFoods?: IngredientFood[] | null;
  missingTools?: RecipeTool[] | null;
  substitutedFoods?: RecipeSuggestionSubstitutedFood[] | null;
  disableCheckbox?: boolean;
  onAddFood?: (food: IngredientFood) => void;
  onRemoveFood?: (food: IngredientFood) => void;
  onAddTool?: (tool: RecipeTool) => void;
  onRemoveTool?: (tool: RecipeTool) => void;
}

// same label rule the missing-food chips use
function foodLabel(food: IngredientFood | IngredientFoodSummary) {
  return food.pluralName || food.name;
}

const rowSx = { display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", pt: 1 } as const;

export function RecipeSuggestion({
  recipe, missingFoods = null, missingTools = null, substitutedFoods = null, disableCheckbox = false,
  onAddFood, onRemoveFood, onAddTool, onRemoveTool,
}: RecipeSuggestionProps) {
  const i18n = useI18n();
  // Checked state per missing item (the Vue component kept a reactive `selected` per chip)
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const missingOrganizers = [
    {
      type: "food" as const,
      show: !!missingFoods?.length,
      items: (missingFoods ?? []).map(food => ({ id: food.id, label: food.pluralName || food.name, item: food })),
    },
    {
      type: "tool" as const,
      show: !!missingTools?.length,
      items: (missingTools ?? []).map(tool => ({ id: tool.id, label: tool.name, item: tool })),
    },
  ];

  function handleCheckbox(type: "food" | "tool", id: string, item: IngredientFood | RecipeTool) {
    if (disableCheckbox) {
      return;
    }
    const key = `${type}-${id}`;
    const isSelected = !selected[key];
    setSelected(prev => ({ ...prev, [key]: isSelected }));
    if (isSelected) {
      if (type === "food") onAddFood?.(item as IngredientFood);
      else onAddTool?.(item as RecipeTool);
    }
    else {
      if (type === "food") onRemoveFood?.(item as IngredientFood);
      else onRemoveTool?.(item as RecipeTool);
    }
  }

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <RecipeCardMobile
        name={recipe.name || ""}
        description={recipe.description || ""}
        slug={recipe.slug || ""}
        rating={recipe.rating ?? undefined}
        image={recipe.image}
        recipeId={recipe.id || ""}
      />
      {missingOrganizers.map(organizer => organizer.show && (
        <Box key={organizer.type} sx={rowSx}>
          <Typography variant="body2" sx={{ pl: 0.5, pr: 1 }}>
            {i18n.t("recipe-finder.missing")}
            :
          </Typography>
          {organizer.items.map(({ id, label, item }) => (
            <Chip
              key={id}
              color="secondary"
              sx={{ mr: 1, my: 0.5, pl: 0.5, borderRadius: 1 }}
              onClick={() => handleCheckbox(organizer.type, id, item)}
              label={(
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
                  <Checkbox
                    size="small"
                    disableRipple
                    checked={!!selected[`${organizer.type}-${id}`]}
                    sx={{ "p": 0, "mr": 0.5, "color": "inherit", "&.Mui-checked": { color: "inherit" } }}
                    tabIndex={-1}
                  />
                  {label}
                </Box>
              )}
            />
          ))}
        </Box>
      ))}
      {/* foods the recipe calls for that the user doesn't have, and what covers them. no
          checkbox: the point is that nothing needs adding to the search */}
      {!!substitutedFoods?.length && (
        <Box sx={rowSx}>
          <Typography variant="body2" sx={{ pl: 0.5, pr: 1 }}>
            {i18n.t("recipe-finder.substituting")}
            :
          </Typography>
          {substitutedFoods.map((substituted, idx) => (
            <Chip
              key={idx}
              color="info"
              sx={{ mr: 1, my: 0.5, borderRadius: 1 }}
              icon={<Icon path={icons.swapHorizontal} />}
              label={i18n.t("recipe-finder.substitute-for-food", {
                substitute: foodLabel(substituted.substituteFood),
                food: foodLabel(substituted.food),
              })}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}

export default RecipeSuggestion;
