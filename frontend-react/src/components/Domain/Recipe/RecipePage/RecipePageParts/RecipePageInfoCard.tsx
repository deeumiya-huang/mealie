// Usage: <RecipePageInfoCard recipe={recipe} recipeScale={scale} landscape={landscape} /> — the top of the recipe page:
// name, rating, description, yield, last made (members of the group) and times, beside or below the photo.
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { RecipeLastMade } from "@/components/Domain/Recipe/RecipeLastMade";
import { RecipeRating } from "@/components/Domain/Recipe/RecipeRating";
import { RecipeTimeCard } from "@/components/Domain/Recipe/RecipeTimeCard";
import { RecipeYield } from "@/components/Domain/Recipe/RecipeYield";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import type { RecipeModel } from "../recipe-model";
import { RecipePageInfoCardImage } from "./RecipePageInfoCardImage";

interface RecipePageInfoCardProps {
  recipe: RecipeModel;
  recipeScale?: number;
  landscape: boolean;
}

export function RecipePageInfoCard({ recipe, recipeScale = 1, landscape }: RecipePageInfoCardProps) {
  const { isOwnGroup } = useLoggedInState();

  const { prepTime, totalTime, performTime, prepTimeSeconds, totalTimeSeconds, performTimeSeconds } = recipe;
  const hasTime = [prepTime, totalTime, performTime, prepTimeSeconds, totalTimeSeconds, performTimeSeconds].some(x => !!x);

  return (
    <div>
      <Box sx={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", alignItems: "stretch" }}>
        {landscape && !!recipe.image && (
          <RecipePageInfoCardImage recipe={recipe} />
        )}
        <Card
          elevation={0}
          sx={{
            width: landscape || !recipe.image ? "100%" : "50%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CardContent sx={{ width: "100%" }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 400, p: 0, textAlign: "center", opacity: 0.8, overflowWrap: "anywhere" }}>
                {recipe.name}
              </Typography>
              <RecipeRating
                key={recipe.slug}
                value={recipe.rating}
                recipeId={recipe.id}
                slug={recipe.slug}
              />
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ my: 1.5 }}>
              <SafeMarkdown source={recipe.description} />
            </Box>
            {!!recipe.description && <Divider />}
            <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", p: 2 }}>
              <Box sx={{ mx: 3 }}>
                {!!(recipe.recipeYieldQuantity || recipe.recipeYield) && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                    <Box sx={{ mb: 2 }}>
                      <RecipeYield
                        yieldQuantity={recipe.recipeYieldQuantity}
                        yieldText={recipe.recipeYield}
                        scale={recipeScale}
                      />
                    </Box>
                  </Box>
                )}
                <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                  {isOwnGroup && (
                    <Box sx={{ mb: 2 }}>
                      <RecipeLastMade recipe={recipe} />
                    </Box>
                  )}
                </Box>
              </Box>
              {hasTime && (
                <Box sx={{ mx: 3 }}>
                  <Box sx={{ mb: 2 }}>
                    <RecipeTimeCard
                      prepTime={recipe.prepTime}
                      totalTime={recipe.totalTime}
                      performTime={recipe.performTime}
                      prepTimeSeconds={recipe.prepTimeSeconds}
                      totalTimeSeconds={recipe.totalTimeSeconds}
                      performTimeSeconds={recipe.performTimeSeconds}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
        {!landscape && !!recipe.image && (
          <RecipePageInfoCardImage
            recipe={recipe}
            maxWidth="50%"
            sx={{ my: "auto" }}
          />
        )}
      </Box>
    </div>
  );
}
