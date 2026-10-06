// Usage: <RecipeList recipes={recipes} listItem={item} tile showDescription disabled
//          renderActions={(recipe, index) => <Buttons />} />
// A list of recipe rows (`RecipeCardLineItem`), each on its own elevated sheet. With `listItem` (a shopping list item
// that comes from several recipes) a row also shows how much of the item that recipe contributes. `tile` lays the
// sheets out in two columns on sm and up. The Vue `#actions-<recipe id>` slots are `renderActions(recipe, index)`.
import type { ReactNode } from "react";
import DOMPurify from "dompurify";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import { useFraction } from "@/hooks/recipes/use-fraction";
import { useDisplay } from "@/hooks/utils";
import type { ShoppingListItemOut } from "@/lib/api/types/household";
import type { RecipeSummary } from "@/lib/api/types/recipe";
import { RecipeCardLineItem } from "./RecipeCardLineItem";

interface RecipeListProps {
  recipes: RecipeSummary[];
  listItem?: ShoppingListItemOut;
  tile?: boolean;
  showDescription?: boolean;
  disabled?: boolean;
  renderActions?: (recipe: RecipeSummary, index: number) => ReactNode;
}

function sanitizeHTML(rawHtml: string) {
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ["strong", "sup"],
  });
}

export function RecipeList({
  recipes,
  listItem,
  tile = false,
  showDescription = false,
  disabled = false,
  renderActions,
}: RecipeListProps) {
  const { frac } = useFraction();
  const display = useDisplay();

  // Determine if we should show tiles based on screen size and number of recipes
  const shouldShowTiles = tile && display.smAndUp;

  function listItemDescription(index: number): string {
    if (
      recipes.length === 1 // we don't need to specify details if there's only one recipe ref
      || !listItem?.recipeReferences
      || listItem.recipeReferences.length !== recipes.length
    ) {
      return "";
    }

    const itemRef = listItem.recipeReferences[index]!;
    const quantity = (itemRef.recipeQuantity || 1) * (itemRef.recipeScale || 1);

    let description = "";
    if (listItem.unit?.fraction) {
      const fraction = frac(quantity, 10, true);
      if (fraction[0] !== undefined && fraction[0] > 0) {
        description += fraction[0];
      }

      if (fraction[1] > 0) {
        description += ` <sup>${fraction[1]}</sup>&frasl;<sub>${fraction[2]}</sub>`;
      }
      else {
        description = (quantity).toString();
      }
    }
    else {
      description = (Math.round(quantity * 100) / 100).toString();
    }

    if (listItem.unit) {
      const unitDisplay = listItem.unit.useAbbreviation && listItem.unit.abbreviation
        ? listItem.unit.abbreviation
        : listItem.unit.name;

      description += ` ${unitDisplay}`;
    }
    if (listItem.food) {
      const foodName = listItem.food.name;
      description += ` ${foodName}`;
    }

    if (itemRef.recipeNote) {
      description += `, ${itemRef.recipeNote}`;
    }

    return sanitizeHTML(description);
  }

  return (
    <List
      component="div"
      sx={shouldShowTiles
        ? { display: "flex", flexWrap: "wrap" }
        : { bgcolor: "transparent" }}
    >
      {recipes.map((recipe, index) => {
        const itemDescription = listItem ? listItemDescription(index) : "";
        const actions = renderActions?.(recipe, index);
        return (
          <Paper
            key={recipe.id || recipe.slug}
            component="ul"
            elevation={2}
            sx={[
              { listStyle: "none", m: 0, p: 0 },
              shouldShowTiles
                ? { flexGrow: 0, flexShrink: 0, mb: 1, mr: 1.5, flexBasis: "calc(50% - 12px)", width: "calc(50% - 12px)" }
                : tile ? { mb: 1, mx: 1 } : { mb: 0.5 },
            ]}
          >
            <Box
              sx={{
                // room for the actions the row appends (they sit over its right edge)
                "& .MuiListItemButton-root": { px: 2, py: 1, ...(actions ? { pr: 20 } : {}) },
              }}
            >
              <RecipeCardLineItem
                recipe={recipe}
                disableLink={disabled}
                subtitle={showDescription || itemDescription
                  ? (
                      <>
                        {showDescription && <Box>{recipe.description}</Box>}
                        {itemDescription && <Box dangerouslySetInnerHTML={{ __html: itemDescription }} />}
                      </>
                    )
                  : undefined}
                append={actions}
              />
            </Box>
          </Paper>
        );
      })}
    </List>
  );
}
