// Usage: <RecipeRating value={recipe.rating} recipeId={recipe.id} slug={recipe.slug} /> — the five-star rating of a
// recipe. A member of the recipe's group sets their own rating (clicking it again clears it); others see it read-only,
// with the group average in grey when they have no rating of their own. (Vue `v-model` → `value`; the group average is
// never written back.)
import { useState, type SyntheticEvent } from "react";
import Box from "@mui/material/Box";
import Rating from "@mui/material/Rating";
import { useMediaQuery } from "@mui/material";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useUserSelfRatings } from "@/hooks/use-users";
import { useI18n } from "@/i18n";

interface RecipeRatingProps {
  readonly?: boolean;
  recipeId?: string;
  slug?: string;
  small?: boolean;
  value?: number | null;
  className?: string;
}

export function RecipeRating({ readonly = false, recipeId = "", slug = "", small = false, value, className }: RecipeRatingProps) {
  const { t } = useI18n();
  const groupRating = value ?? 0;

  const { isOwnGroup } = useLoggedInState();
  const isReadonly = readonly || !isOwnGroup;
  const { userRatings, setRating } = useUserSelfRatings();

  // on touch devices a tap fires mouseenter without a matching mouseleave, which leaves the rating
  // rendering the stuck hover value instead of the model value
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  const userRating = userRatings.find(r => r.recipeId === recipeId)?.rating ?? null;

  const [localUserRating, setLocalUserRating] = useState(userRating);
  // while a write is in flight a refetch may still report the pre-click value, so ignore it
  const [pendingWrites, setPendingWrites] = useState(0);
  const [prevUserRating, setPrevUserRating] = useState(userRating);
  if (userRating !== prevUserRating) {
    setPrevUserRating(userRating);
    if (!pendingWrites) {
      setLocalUserRating(userRating);
    }
  }

  // only fall back to the group average when we can't offer the user their own rating,
  // and only when there's actually a group average to show. An unset rating may be null or 0
  const showGroupAverage = isReadonly && !localUserRating && !!groupRating;

  const displayRating = showGroupAverage ? groupRating : (localUserRating || 0);

  async function updateRating(val?: number | null) {
    if (isReadonly) {
      return;
    }

    // user ratings are always whole stars; MUI reports a click on the current value as null (clear)
    let rating = Math.round(val ?? localUserRating ?? 0);
    if (rating === localUserRating) {
      rating = 0;
    }

    setLocalUserRating(rating);

    setPendingWrites(n => n + 1);
    try {
      await setRating(slug, rating, null);
    }
    finally {
      setPendingWrites(n => n - 1);
    }
  }

  return (
    <Box className={className} onClick={(e: SyntheticEvent) => e.preventDefault()}>
      <Rating
        value={displayRating}
        max={5}
        precision={showGroupAverage ? 0.5 : 1}
        size={small ? "small" : "medium"}
        readOnly={isReadonly}
        onChange={(_event, newValue) => void updateRating(newValue)}
        onChangeActive={canHover ? undefined : () => undefined}
        getLabelText={rating => `${t("general.rating")} ${rating}`}
        emptyLabelText={t("general.none")}
        sx={{
          "& .MuiRating-iconFilled": { color: showGroupAverage ? "grey.600" : "secondary.main" },
          "& .MuiRating-iconHover": { color: "secondary.main" },
          "& .MuiRating-iconEmpty": { color: "secondary.light" },
          "py": small ? 0 : 0.5,
        }}
      />
    </Box>
  );
}
