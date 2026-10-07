// Usage: <RecipePrintContainer recipe={recipe} scale={scale} /> — the print layout of a recipe, hidden on screen and
// shown only when the page is printed (the rest of the recipe page is `display: none` in print).
import Box from "@mui/material/Box";
import GlobalStyles from "@mui/material/GlobalStyles";
import { RecipePrintView } from "@/components/Domain/Recipe/RecipePrintView";
import type { Recipe } from "@/lib/api/types/recipe";

interface RecipePrintContainerProps {
  recipe: Recipe;
  scale?: number;
}

// Vue's unscoped print rules (`.v-main` is the layout's <main> here)
const printStyles = {
  "@media print": {
    "body, html": {
      marginTop: "0 !important",
    },
    "main": {
      display: "block",
      padding: "0 !important",
      margin: "0 !important",
    },
  },
};

export function RecipePrintContainer({ recipe, scale = 1 }: RecipePrintContainerProps) {
  return (
    <Box className="print-container" sx={{ "display": "none", "@media print": { display: "block !important" } }}>
      <GlobalStyles styles={printStyles} />
      <RecipePrintView
        recipe={recipe}
        scale={scale}
        dense
      />
    </Box>
  );
}
