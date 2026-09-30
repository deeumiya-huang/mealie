import Box from "@mui/material/Box";
import type { RecipeIngredient } from "~/lib/api/types/recipe";
import { useIngredientTextParser } from "~/hooks/recipes";
import { SafeMarkdown } from "~/components/global/SafeMarkdown";

export function RecipeIngredientHtml({ ingredient, scale = 1 }: { ingredient?: RecipeIngredient; scale?: number }) {
  const { useParsedIngredientText: parsedIngredientText } = useIngredientTextParser();
  let baseText = "";
  if (ingredient) {
    const parsed = parsedIngredientText(ingredient, scale);
    baseText = [parsed.quantity, parsed.unit, parsed.name].filter(Boolean).join(" ").trim();
  }

  return (
    <Box
      className="ingredient-link-label links-disabled"
      sx={{
        display: "block",
        lineHeight: 1.25,
        wordBreak: "break-word",
        fontSize: "0.95rem",
        "& a": { pointerEvents: "none", cursor: "default", color: "primary.main", textDecoration: "none" },
      }}
    >
      {baseText && <SafeMarkdown source={baseText} />}
      {ingredient?.note && <SafeMarkdown inline source={` ${ingredient.note}`} />}
    </Box>
  );
}

export default RecipeIngredientHtml;
