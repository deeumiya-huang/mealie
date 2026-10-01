import { useMemo } from "react";
import type { ReactNode } from "react";
import DOMPurify from "dompurify";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { useDisplay } from "~/hooks/use-display";
import { getFraction } from "~/hooks/recipes/use-fraction";
import type { ShoppingListItemOut } from "~/lib/api/types/household";
import type { RecipeSummary } from "~/lib/api/types/recipe";
import { RecipeCardLineItem } from "./RecipeCardLineItem";

export interface RecipeListProps {
  recipes: RecipeSummary[];
  listItem?: ShoppingListItemOut;
  tile?: boolean;
  showDescription?: boolean;
  disabled?: boolean;
  /** The `actions-<recipe id>` slots of the Vue component. */
  renderActions?: (recipe: RecipeSummary) => ReactNode;
}

const { frac } = getFraction();

function sanitizeHTML(rawHtml: string) {
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ["strong", "sup"],
  });
}

/** How much of `listItem` each recipe contributed, when the item comes from several recipes. */
function getListItemDescriptions(recipes: RecipeSummary[], listItem?: ShoppingListItemOut): string[] {
  if (
    recipes.length === 1 // we don't need to specify details if there's only one recipe ref
    || !listItem?.recipeReferences
    || listItem.recipeReferences.length !== recipes.length
  ) {
    return recipes.map(() => "");
  }

  const descriptions: string[] = [];
  for (let i = 0; i < recipes.length; i++) {
    const itemRef = listItem.recipeReferences[i]!;
    const quantity = (itemRef.recipeQuantity || 1) * (itemRef.recipeScale || 1);

    let description = "";
    if (listItem.unit?.fraction) {
      const fraction = frac(quantity, 10, true);
      if (fraction[0] !== undefined && fraction[0] > 0) {
        description += fraction[0];
      }

      if (fraction[1]! > 0) {
        description += ` <sup>${fraction[1]}</sup>&frasl;<sub>${fraction[2]}</sub>`;
      }
      else {
        description = quantity.toString();
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
      description += ` ${listItem.food.name}`;
    }

    if (itemRef.recipeNote) {
      description += `, ${itemRef.recipeNote}`;
    }

    descriptions.push(sanitizeHTML(description));
  }

  return descriptions;
}

export function RecipeList({ recipes, listItem, tile = false, showDescription = false, disabled = false, renderActions }: RecipeListProps) {
  const display = useDisplay();
  // tiles side by side on wider screens, a plain list otherwise
  const showTiles = tile && display.smAndUp;
  const descriptions = useMemo(() => getListItemDescriptions(recipes, listItem), [recipes, listItem]);

  return (
    <Box sx={showTiles ? { display: "flex", flexWrap: "wrap", py: 1 } : { py: 1 }}>
      {recipes.map((recipe, index) => {
        const showSubtitle = showDescription || (listItem && descriptions[index]);
        return (
          <Paper
            key={recipe.id || recipe.slug}
            elevation={2}
            sx={showTiles
              ? { flex: "0 0 calc(50% - 12px)", width: "calc(50% - 12px)", mb: 1, marginInlineEnd: 1.5 }
              : tile ? { mb: 1, mx: 1 } : { mb: 0.5 }}
          >
            <RecipeCardLineItem
              recipe={recipe}
              disableLink={disabled}
              subtitle={showSubtitle
                ? (
                    <>
                      {showDescription && <div>{recipe.description}</div>}
                      {listItem && descriptions[index] && <div dangerouslySetInnerHTML={{ __html: descriptions[index] }} />}
                    </>
                  )
                : undefined}
              append={renderActions?.(recipe)}
            />
          </Paper>
        );
      })}
    </Box>
  );
}

export default RecipeList;
