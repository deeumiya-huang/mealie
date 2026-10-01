import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";
import { icons } from "~/lib/icons";
import { userApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { getAuthBackend } from "~/hooks/use-auth-backend";
import { useUserSelfRatings } from "~/hooks/use-users/user-ratings";
import { Icon } from "~/components/global/Icon";

export interface RecipeFavoriteBadgeProps {
  recipeId?: string;
  showAlways?: boolean;
  buttonStyle?: boolean;
  sx?: SxProps<Theme>;
  className?: string;
}

export function RecipeFavoriteBadge({ recipeId = "", showAlways = false, buttonStyle = false, sx, className }: RecipeFavoriteBadgeProps) {
  const i18n = useI18n();
  const { userRatings, refreshUserRatings } = useUserSelfRatings();
  const isFavorite = userRatings.find(r => r.recipeId === recipeId)?.isFavorite || false;

  async function toggleFavorite() {
    const user = getAuthBackend().getUser();
    if (!user) return;
    if (!isFavorite) await userApi().users.addFavorite(user.id, recipeId);
    else await userApi().users.removeFavorite(user.id, recipeId);
    await refreshUserRatings();
  }

  if (!isFavorite && !showAlways) return null;
  return (
    <Tooltip title={isFavorite ? i18n.t("recipe.remove-from-favorites") : i18n.t("recipe.add-to-favorites")} placement="bottom">
      <IconButton
        size="small"
        className={className}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void toggleFavorite();
        }}
        sx={[
          buttonStyle ? { "bgcolor": "info.main", "color": "#fff", "&:hover": { bgcolor: "info.dark" } } : { color: "secondary.main" },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        <Icon path={isFavorite ? icons.heart : icons.heartOutline} size={buttonStyle ? "x-large" : undefined} />
      </IconButton>
    </Tooltip>
  );
}

export default RecipeFavoriteBadge;
