import { useEffect, useRef, useState } from "react";
import Rating from "@mui/material/Rating";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useUserSelfRatings } from "~/hooks/use-users/user-ratings";

export interface RecipeRatingProps {
  readonly?: boolean;
  recipeId?: string;
  slug?: string;
  small?: boolean;
  /** Group average rating (v-model in the Vue component). */
  value?: number | null;
}

export function RecipeRating({ readonly = false, recipeId = "", slug = "", small = false, value: groupRating = 0 }: RecipeRatingProps) {
  const { isOwnGroup } = useLoggedInState();
  const isReadonly = readonly || !isOwnGroup;
  const { userRatings, setRating } = useUserSelfRatings();
  // on touch devices a tap fires mouseenter without a matching mouseleave, leaving a stuck hover value
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  const userRating = userRatings.find(r => r.recipeId === recipeId)?.rating ?? null;
  const [localUserRating, setLocalUserRating] = useState<number | null>(userRating);

  // while a write is in flight a refetch may still report the pre-click value, so ignore it
  const pendingWrites = useRef(0);
  useEffect(() => {
    if (!pendingWrites.current) setLocalUserRating(userRating);
  }, [userRating]);

  // only fall back to the group average when we can't offer the user their own rating
  const showGroupAverage = isReadonly && !localUserRating && !!groupRating;
  const displayRating = showGroupAverage ? groupRating : (localUserRating || 0);

  async function updateRating(val: number | null) {
    if (isReadonly) return;
    // user ratings are always whole stars
    let rating = Math.round(val ?? 0);
    if (rating === localUserRating) rating = 0;
    setLocalUserRating(rating);

    pendingWrites.current++;
    try {
      await setRating(slug, rating, null);
    }
    finally {
      pendingWrites.current--;
    }
  }

  return (
    <div onClick={e => e.preventDefault()}>
      <Rating
        value={displayRating ?? 0}
        max={5}
        precision={showGroupAverage ? 0.5 : 1}
        size={small ? "small" : "medium"}
        readOnly={isReadonly}
        onChange={(_e, v) => void updateRating(v)}
        onChangeActive={canHover ? undefined : () => {}}
        sx={{ color: showGroupAverage ? "grey.600" : "secondary.main" }}
      />
    </div>
  );
}

export default RecipeRating;
