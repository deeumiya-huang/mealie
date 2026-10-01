import Box from "@mui/material/Box";
import { useParams } from "react-router";
import type { RecipeIngredient } from "~/lib/api/types/household";
import { useIngredientTextParser } from "~/hooks/recipes";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { SafeMarkdown } from "~/components/global/SafeMarkdown";
import { RecipeIngredientSubstitutions } from "./RecipeIngredientSubstitutions";

export interface RecipeIngredientListItemProps {
  ingredient: RecipeIngredient;
  scale?: number;
  /**
   * off by default: the shopping list and the add-to-list dialog reuse this row, and a menu button
   * is noise in both. the recipe renderer opts in
   */
  showSubstitutions?: boolean;
}

export const ingredientItemSx = {
  "display": "flex",
  "flexWrap": "wrap",
  "alignItems": "baseline",
  // column only: the note takes a flex row of its own
  "columnGap": "0.25em",
  "lineHeight": 1.5,
  "wordBreak": "break-word",
  "minWidth": 0,
  "fontSize": "1rem",
  "& .d-inline > p": { display: "inline" },
  "& .d-inline > p:has(> sub) > sup": { letterSpacing: "-0.05rem" },
  "& .d-inline sup + span": { letterSpacing: "-0.05rem" },
  "& .text-bold": { fontWeight: "bold", whiteSpace: "normal", wordBreak: "break-word" },
  "& .note": {
    flexBasis: "100%",
    width: "100%",
    display: "block",
    mt: "2px",
    lineHeight: "1.35em",
    fontSize: "0.85em",
    opacity: 0.7,
    whiteSpace: "normal",
    wordBreak: "break-word",
  },
} as const;

export function RecipeIngredientListItem({ ingredient, scale = 1, showSubstitutions = false }: RecipeIngredientListItemProps) {
  const params = useParams();
  const auth = useMealieAuth();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const { getParsedIngredientText: parsedIngredientText } = useIngredientTextParser();
  const parsedIng = parsedIngredientText(ingredient, scale, true, groupSlug.toString());
  const subs = showSubstitutions ? <RecipeIngredientSubstitutions ingredient={ingredient} scale={scale} /> : null;

  return (
    <Box className="ingredient-item" sx={ingredientItemSx}>
      {parsedIng.quantity && <SafeMarkdown inline source={parsedIng.quantity} />}
      {parsedIng.unit && <span>{parsedIng.unit}</span>}
      {parsedIng.note && !parsedIng.name
        ? (
            <>
              <SafeMarkdown inline className="text-bold" source={parsedIng.note} />
              {subs}
            </>
          )
        : parsedIng.recipeLink
          ? (
              <>
                <SafeMarkdown inline className="text-bold" source={parsedIng.recipeLink} />
                {subs}
                {parsedIng.note && <SafeMarkdown className="note" source={parsedIng.note} />}
              </>
            )
          : (
              <>
                {parsedIng.name && <SafeMarkdown inline className="text-bold" source={parsedIng.name} />}
                {/* sits before the note, which takes a full flex row of its own */}
                {subs}
                {parsedIng.note && <SafeMarkdown className="note" source={parsedIng.note} />}
              </>
            )}
    </Box>
  );
}

export default RecipeIngredientListItem;
