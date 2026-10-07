// Usage: <RecipeSuggestion recipe={item.recipe} missingFoods={item.missingFoods} missingTools={item.missingTools}
//   substitutedFoods={item.substitutedFoods} disableCheckbox={loading}
//   onAddFood={addFood} onRemoveFood={removeFood} onAddTool={addTool} onRemoveTool={removeTool} />
// A recipe suggested by the recipe finder: its mobile card, the foods / tools it still needs (a checkbox on each adds
// it to the finder's selection, unchecking removes it again) and the foods that are covered by a substitute.
import { useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import type {
  IngredientFood,
  IngredientFoodSummary,
  RecipeSuggestionSubstitutedFood,
  RecipeSummary,
  RecipeTool,
} from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeCardMobile } from "./RecipeCardMobile";

interface Organizer {
  type: "food" | "tool";
  item: IngredientFood | RecipeTool;
}

interface RecipeSuggestionProps {
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

export function RecipeSuggestion({
  recipe,
  missingFoods = null,
  missingTools = null,
  substitutedFoods = null,
  disableCheckbox = false,
  onAddFood,
  onRemoveFood,
  onAddTool,
  onRemoveTool,
}: RecipeSuggestionProps) {
  const { t } = useI18n();

  const missingOrganizers = [
    {
      type: "food" as const,
      show: !!missingFoods?.length,
      items: (missingFoods ?? []).map((food): Organizer => ({ type: "food", item: food })),
      getLabel: (item: IngredientFood | RecipeTool) => (item as IngredientFood).pluralName || item.name,
    },
    {
      type: "tool" as const,
      show: !!missingTools?.length,
      items: (missingTools ?? []).map((tool): Organizer => ({ type: "tool", item: tool })),
      getLabel: (item: IngredientFood | RecipeTool) => item.name,
    },
  ];

  // which missing items are ticked; a new set of missing items starts unticked (Vue rebuilt its `selected` flags)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [lastFoods, setLastFoods] = useState(missingFoods);
  const [lastTools, setLastTools] = useState(missingTools);
  if (missingFoods !== lastFoods || missingTools !== lastTools) {
    setLastFoods(missingFoods);
    setLastTools(missingTools);
    setSelected(new Set());
  }

  function handleCheckbox(organizer: Organizer) {
    if (disableCheckbox) {
      return;
    }

    const key = `${organizer.type}:${organizer.item.id}`;
    const nowSelected = !selected.has(key);
    setSelected((current) => {
      const next = new Set(current);
      if (nowSelected) {
        next.add(key);
      }
      else {
        next.delete(key);
      }
      return next;
    });

    if (organizer.type === "food") {
      (nowSelected ? onAddFood : onRemoveFood)?.(organizer.item as IngredientFood);
    }
    else {
      (nowSelected ? onAddTool : onRemoveTool)?.(organizer.item as RecipeTool);
    }
  }

  return (
    <Container sx={{ boxShadow: 3 }}>
      <Box>
        <RecipeCardMobile
          name={recipe.name ?? ""}
          description={recipe.description ?? ""}
          slug={recipe.slug ?? ""}
          rating={recipe.rating ?? undefined}
          image={recipe.image}
          recipeId={recipe.id ?? ""}
        />
      </Box>
      {missingOrganizers.map(organizer => organizer.show && (
        <Box key={organizer.type}>
          <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", pt: 1 }}>
            <MdiIcon sx={{ m: 0, p: 0 }} />
            <Typography sx={{ mr: 0, my: 0, pl: 0.5, py: 0, flexGrow: 0, width: "max-content" }}>
              {`${t("recipe-finder.missing")}:`}
            </Typography>
            {organizer.items.map(item => (
              <Chip
                key={item.item.id}
                color="secondary"
                variant="filled"
                sx={{ mr: 1, my: 0.5, pl: 0.5, borderRadius: 1, height: "auto", py: 0.25 }}
                label={(
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={(
                      <Checkbox
                        size="small"
                        disableRipple
                        sx={{ "color": "inherit", "&.Mui-checked": { color: "inherit" } }}
                        checked={selected.has(`${item.type}:${item.item.id}`)}
                        onChange={() => handleCheckbox(item)}
                      />
                    )}
                    label={organizer.getLabel(item.item)}
                  />
                )}
              />
            ))}
          </Box>
        </Box>
      ))}
      {/* foods the recipe calls for that the user doesn't have, and what covers them. no
           checkbox: the point is that nothing needs adding to the search */}
      {!!substitutedFoods?.length && (
        <Box>
          <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", pt: 1 }}>
            <MdiIcon sx={{ m: 0, p: 0 }} />
            <Typography sx={{ mr: 0, my: 0, pl: 0.5, py: 0, flexGrow: 0, width: "max-content" }}>
              {`${t("recipe-finder.substituting")}:`}
            </Typography>
            {substitutedFoods.map((substituted, idx) => (
              <Chip
                key={idx}
                color="info"
                variant="filled"
                sx={{ mr: 1, my: 0.5, borderRadius: 1 }}
                icon={<MdiIcon path={icons.swapHorizontal} />}
                label={t("recipe-finder.substitute-for-food", {
                  substitute: foodLabel(substituted.substituteFood),
                  food: foodLabel(substituted.food),
                })}
              />
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );
}
