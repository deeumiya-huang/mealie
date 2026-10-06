// Usage: <RecipeIngredientListItem ingredient={ing} scale={2} showSubstitutions /> — one ingredient line:
// quantity, unit, food/note/linked recipe (markdown), the substitutions menu (opt-in: the shopping list and the
// add-to-list dialog reuse this row, and a menu button is noise in both) and the note on a row of its own.
import Box from "@mui/material/Box";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { useIngredientTextParser } from "@/hooks/recipes";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import type { RecipeIngredient } from "@/lib/api/types/household";
import type { RecipeIngredient as RecipeIngredientRecipe } from "@/lib/api/types/recipe";
import { useParams } from "react-router";
import { RecipeIngredientSubstitutions } from "./RecipeIngredientSubstitutions";

interface RecipeIngredientListItemProps {
  ingredient: RecipeIngredient;
  scale?: number;
  showSubstitutions?: boolean;
}

// SafeMarkdown renders its own block; these wrappers make it sit on the line like the Vue classes did
const inlineSx = {
  "display": "inline",
  "& > div": { display: "inline" },
  "& > div > p": { "display": "inline", "&:has(> sub) > sup": { letterSpacing: "-0.05rem" } },
  "&:has(sub):after": { letterSpacing: "-0.2rem" },
  "& sup + span": { letterSpacing: "-0.05rem" },
  "& sup:before": { letterSpacing: "0rem" },
};

const boldSx = { fontWeight: "bold", whiteSpace: "normal", wordBreak: "break-word" };

const noteSx = {
  flexBasis: "100%",
  width: "100%",
  display: "block",
  mt: "2px",
  lineHeight: "1.35em",
  fontSize: "0.85em",
  opacity: 0.7,
  whiteSpace: "normal",
  wordBreak: "break-word",
};

export function RecipeIngredientListItem({ ingredient, scale = 1, showSubstitutions = false }: RecipeIngredientListItemProps) {
  const auth = useMealieAuth();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const { useParsedIngredientText } = useIngredientTextParser();

  // the household and recipe ingredient types describe the same payload
  const parsedIng = useParsedIngredientText(ingredient as RecipeIngredientRecipe, scale, true, groupSlug.toString());

  const substitutions = showSubstitutions
    ? <RecipeIngredientSubstitutions ingredient={ingredient as RecipeIngredientRecipe} scale={scale} />
    : null;

  return (
    <Box
      className="ingredient-item"
      sx={{
        // the subtitle-1 type scale of Vuetify
        "fontSize": "1rem",
        "fontWeight": 400,
        "letterSpacing": "0.009375em",
        "display": "flex",
        "flexWrap": "wrap",
        "alignItems": "baseline",
        // column only: the note takes a flex row of its own, and it reads as belonging to the
        // ingredient above it only if it sits tighter to that line than the rows sit to each other
        "columnGap": "0.25em",
        "lineHeight": 1.5,
        "wordBreak": "break-word",
        "minWidth": 0,
        "& p": { my: 0 },
      }}
    >
      {parsedIng.quantity && (
        <Box className="d-inline" sx={inlineSx}>
          <SafeMarkdown source={parsedIng.quantity} />
        </Box>
      )}
      {parsedIng.unit && parsedIng.unit}
      {parsedIng.note && !parsedIng.name
        ? (
            <>
              <Box className="text-bold d-inline" sx={[inlineSx, boldSx]}>
                <SafeMarkdown source={parsedIng.note} />
              </Box>
              {substitutions}
            </>
          )
        : parsedIng.recipeLink
          ? (
              <>
                <Box className="text-bold d-inline" sx={[inlineSx, boldSx]}>
                  <SafeMarkdown source={parsedIng.recipeLink} />
                </Box>
                {substitutions}
                {parsedIng.note && (
                  <Box className="note" sx={noteSx}>
                    <SafeMarkdown source={parsedIng.note} />
                  </Box>
                )}
              </>
            )
          : (
              <>
                {parsedIng.name && (
                  <Box className="text-bold d-inline" sx={[inlineSx, boldSx]}>
                    <SafeMarkdown source={parsedIng.name} />
                  </Box>
                )}
                {/* sits before the note, which takes a full flex row of its own */}
                {substitutions}
                {parsedIng.note && (
                  <Box className="note" sx={noteSx}>
                    <SafeMarkdown source={parsedIng.note} />
                  </Box>
                )}
              </>
            )}
    </Box>
  );
}
