// Usage: <RecipeFavoriteBadge recipeId={id} showAlways /> — heart toggle button (tooltip "add to favorites" /
// "remove from favorites"); rendered only when the recipe is a favorite or with `showAlways`.
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useUserSelfRatings } from "@/hooks/use-users";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface RecipeFavoriteBadgeProps {
  recipeId?: string;
  showAlways?: boolean;
  buttonStyle?: boolean;
  className?: string;
  sx?: SxProps<Theme>;
}

export function RecipeFavoriteBadge({ recipeId = "", showAlways = false, buttonStyle = false, className, sx }: RecipeFavoriteBadgeProps) {
  const { t } = useI18n();
  const api = useUserApi();
  const auth = useMealieAuth();
  const { userRatings, refreshUserRatings } = useUserSelfRatings();

  const rating = userRatings.find(r => r.recipeId === recipeId);
  const isFavorite = rating?.isFavorite || false;

  async function toggleFavorite() {
    if (!auth.user) return;
    if (!isFavorite) {
      await api.users.addFavorite(auth.user.id, recipeId);
    }
    else {
      await api.users.removeFavorite(auth.user.id, recipeId);
    }
    await refreshUserRatings();
  }

  if (!isFavorite && !showAlways) {
    return null;
  }

  const tooltipColor = buttonStyle ? "info.main" : "secondary.main";

  return (
    <Tooltip
      title={isFavorite ? t("recipe.remove-from-favorites") : t("recipe.add-to-favorites")}
      placement="bottom"
      slotProps={{ tooltip: { sx: { bgcolor: tooltipColor, color: "#fff" } }, arrow: { sx: { color: tooltipColor } } }}
    >
      <IconButton
        size="small"
        color={buttonStyle ? "info" : "secondary"}
        className={className}
        sx={[
          buttonStyle && { "bgcolor": "info.main", "&:hover": { bgcolor: "info.dark" } },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        onClick={(event) => {
          event.preventDefault();
          void toggleFavorite();
        }}
      >
        <MdiIcon
          size={buttonStyle ? "x-large" : "default"}
          sx={{ color: buttonStyle ? "#fff" : "secondary.main" }}
          path={isFavorite ? icons.heart : icons.heartOutline}
        />
      </IconButton>
    </Tooltip>
  );
}
