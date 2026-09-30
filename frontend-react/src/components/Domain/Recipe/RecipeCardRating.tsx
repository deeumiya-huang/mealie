import Box from "@mui/material/Box";
import { useUserSelfRatings } from "~/hooks/use-users/user-ratings";

type Star = "full" | "half" | "empty";

export function RecipeCardRating({ value = 0, recipeId = "", className }: { value?: number | null; recipeId?: string; className?: string }) {
  const { userRatings } = useUserSelfRatings();
  const userRating = userRatings.find(r => r.recipeId === recipeId)?.rating ?? null;

  // this display is always readonly, so we show the user's own rating if they have one,
  // and otherwise fall back to the group average (in grey), if there is one.
  // An unset rating may be null or 0
  const showGroupAverage = !userRating && !!value;
  const ratingValue = (showGroupAverage ? value : userRating) || 0;
  const stars: Star[] = [];
  for (let i = 0; i < 5; i++) {
    const diff = ratingValue - i;
    // round to half star if rating is at least 0.25 but not quite a full star
    stars.push(diff >= 1 ? "full" : diff >= 0.25 ? "half" : "empty");
  }

  return (
    <Box className={className} sx={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>
      {stars.map((star, index) => (
        <Box
          key={index}
          component="span"
          sx={{
            fontSize: 18,
            userSelect: "none",
            position: "relative",
            display: "inline-block",
            color: showGroupAverage ? "grey.600" : "secondary.main",
            ...(star === "half" ? { "& .star-full": { position: "absolute", left: 0, top: 0, width: "50%", overflow: "hidden" } } : {}),
          }}
        >
          {/* Both the full and empty stars render for "half" stars, layered over each other */}
          {(star === "empty" || star === "half") && <span className="star-empty">☆</span>}
          {(star === "full" || star === "half") && <span className="star-full">★</span>}
        </Box>
      ))}
    </Box>
  );
}

export default RecipeCardRating;
