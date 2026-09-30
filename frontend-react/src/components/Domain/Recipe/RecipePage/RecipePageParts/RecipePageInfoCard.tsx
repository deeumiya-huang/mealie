import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import type { Recipe } from "~/lib/api/types/recipe";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { SafeMarkdown } from "~/components/global/SafeMarkdown";
import { RecipeLastMade } from "../../RecipeLastMade";
import { RecipeRating } from "../../RecipeRating";
import { RecipeTimeCard } from "../../RecipeTimeCard";
import { RecipeYield } from "../../RecipeYield";
import { RecipePageInfoCardImage } from "./RecipePageInfoCardImage";

export function RecipePageInfoCard({ recipe, recipeScale = 1, landscape }: { recipe: NoUndefinedField<Recipe>; recipeScale?: number; landscape: boolean }) {
  const { isOwnGroup } = useLoggedInState();
  const { prepTime, totalTime, performTime, prepTimeSeconds, totalTimeSeconds, performTimeSeconds } = recipe;
  const hasTime = [prepTime, totalTime, performTime, prepTimeSeconds, totalTimeSeconds, performTimeSeconds].some(x => !!x);

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", alignItems: "stretch" }}>
      {landscape && recipe.image && <RecipePageInfoCardImage recipe={recipe} />}
      <Card elevation={0} sx={{ width: landscape || !recipe.image ? "100%" : "50%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <CardContent sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Typography variant="h5" sx={{ p: 0, whiteSpace: "normal", textAlign: "center", opacity: 0.8 }}>{recipe.name}</Typography>
            <RecipeRating key={recipe.slug} value={recipe.rating} recipeId={recipe.id} slug={recipe.slug} />
          </Box>
          <Divider sx={{ my: 1 }} />
          <SafeMarkdown source={recipe.description} sx={{ my: 1.5 }} />
          {recipe.description && <Divider />}
          <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", pt: 2 }}>
            <Box sx={{ mx: 3 }}>
              {(recipe.recipeYieldQuantity || recipe.recipeYield) && (
                <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                  <Box sx={{ mb: 2 }}>
                    <RecipeYield yieldQuantity={recipe.recipeYieldQuantity} yieldText={recipe.recipeYield} scale={recipeScale} />
                  </Box>
                </Box>
              )}
              <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                {isOwnGroup && <Box sx={{ mb: 2 }}><RecipeLastMade recipe={recipe} /></Box>}
              </Box>
            </Box>
            {hasTime && (
              <Box sx={{ mx: 3, mb: 2 }}>
                <RecipeTimeCard
                  prepTime={recipe.prepTime}
                  totalTime={recipe.totalTime}
                  performTime={recipe.performTime}
                  prepTimeSeconds={recipe.prepTimeSeconds}
                  totalTimeSeconds={recipe.totalTimeSeconds}
                  performTimeSeconds={recipe.performTimeSeconds}
                />
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
      {!landscape && recipe.image && <RecipePageInfoCardImage recipe={recipe} maxWidth="50%" sx={{ my: "auto" }} />}
    </Box>
  );
}

export default RecipePageInfoCard;
