// Usage: <RecipeIngredientHtml ingredient={ing} scale={2} /> — an ingredient line (quantity, unit, food, then the note) as
// sanitized markdown with links disabled (used as a checkbox label in the step reference linker).
import Box from "@mui/material/Box";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { useIngredientTextParser } from "@/hooks/recipes";
import type { RecipeIngredient } from "@/lib/api/types/recipe";

interface RecipeIngredientHtmlProps {
  ingredient?: RecipeIngredient;
  scale?: number;
}

export function RecipeIngredientHtml({ ingredient, scale = 1 }: RecipeIngredientHtmlProps) {
  const { getParsedIngredientText } = useIngredientTextParser();

  let baseText = "";
  if (ingredient) {
    const parsed = getParsedIngredientText(ingredient, scale);
    baseText = [parsed.quantity, parsed.unit, parsed.name].filter(Boolean).join(" ").trim();
  }

  return (
    <Box
      className="ingredient-link-label links-disabled"
      sx={{
        "display": "block",
        "lineHeight": 1.25,
        "wordBreak": "break-word",
        "fontSize": "0.95rem",
        "& a": {
          pointerEvents: "none",
          cursor: "default",
          color: "primary.main",
          textDecoration: "none",
        },
      }}
    >
      {baseText && <SafeMarkdown source={baseText} />}
      {ingredient?.note && (
        <Box sx={{ "display": "inline", "& > *": { display: "inline" } }}>
          <SafeMarkdown source={` ${ingredient.note}`} />
        </Box>
      )}
    </Box>
  );
}
