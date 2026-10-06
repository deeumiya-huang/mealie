// Usage: <RecipeCardRating value={recipe.rating} recipeId={recipe.id} /> — read-only star display; shows the
// user's own rating, or else the group average in grey. (Vue `modelValue` → `value`.)
import Box from "@mui/material/Box";
import { useUserSelfRatings } from "@/hooks/use-users";

type Star = "full" | "half" | "empty";

interface RecipeCardRatingProps {
  value?: number;
  recipeId?: string;
  className?: string;
}

export function RecipeCardRating({ value = 0, recipeId = "", className }: RecipeCardRatingProps) {
  const { userRatings } = useUserSelfRatings();

  const userRating = userRatings.find(r => r.recipeId === recipeId)?.rating ?? null;

  // this display is always readonly, so we show the user's own rating if they have one,
  // and otherwise fall back to the group average (in grey), if there is one.
  // An unset rating may be null or 0
  const showGroupAverage = !userRating && !!value;
  const ratingValue = (showGroupAverage ? value : userRating) || 0;

  const ratingDisplay: Star[] = [];
  for (let i = 0; i < 5; i++) {
    const diff = ratingValue - i;
    if (diff >= 1) {
      ratingDisplay.push("full");
    }
    else if (diff >= 0.25) { // round to half star if rating is at least 0.25 but not quite a full star
      ratingDisplay.push("half");
    }
    else {
      ratingDisplay.push("empty");
    }
  }

  return (
    <Box className={className} sx={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>
      {ratingDisplay.map((star, index) => (
        <Box
          key={index}
          component="span"
          className={star === "half" ? "star star-half" : "star"}
          sx={{
            color: showGroupAverage ? "grey.600" : "secondary.main",
            fontSize: 18,
            transition: "color 0.2s ease",
            userSelect: "none",
            position: "relative",
            display: "inline-block",
          }}
        >
          {/* We render both the full and empty stars for "half" stars because they're layered over each other */}
          {(star === "empty" || star === "half") && (
            <span className="star-empty">☆</span>
          )}
          {(star === "full" || star === "half") && (
            <Box
              component="span"
              className="star-full"
              sx={star === "half" ? { position: "absolute", left: 0, top: 0, width: "50%", overflow: "hidden" } : undefined}
            >
              ★
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
