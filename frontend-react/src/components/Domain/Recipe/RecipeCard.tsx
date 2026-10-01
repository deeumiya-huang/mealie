import { useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import { useNavigate, useParams } from "react-router";
import { icons } from "~/lib/icons";
import type { RecipeTag } from "~/lib/api/types/recipe";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { SafeMarkdown } from "~/components/global/SafeMarkdown";
import { RecipeCardImage } from "./RecipeCardImage";
import { RecipeCardRating } from "./RecipeCardRating";
import { RecipeChips } from "./RecipeChips";
import type { RecipeChipsProps } from "./RecipeChips";
import { RecipeContextMenu } from "./RecipeContextMenu/RecipeContextMenu";
import { RecipeFavoriteBadge } from "./RecipeFavoriteBadge";

export interface RecipeCardProps {
  name: string;
  slug: string;
  description?: string | null;
  rating?: number | null;
  ratingColor?: string;
  image?: unknown;
  tags?: RecipeTag[] | null;
  recipeId: string;
  imageHeight?: number;
  onClick?: () => void;
  onDelete?: (slug: string) => void;
  onItemSelected?: RecipeChipsProps["onItemSelected"];
  /** Replaces the action row (the Vue `#actions` slot). */
  actions?: ReactNode;
  children?: ReactNode;
}

export function RecipeCard(props: RecipeCardProps) {
  const { name, slug, description = null, rating = 0, image, tags, recipeId, imageHeight = 200, onClick, onDelete, onItemSelected, actions, children } = props;
  const tagList = tags ?? [];
  const auth = useMealieAuth();
  const { isOwnGroup } = useLoggedInState();
  const params = useParams();
  const navigate = useNavigate();
  const [hovering, setHovering] = useState(false);
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const showRecipeContent = !!(recipeId && slug);
  const recipeRoute = showRecipeContent ? `/g/${groupSlug}/r/${slug}` : "";

  return (
    <div>
      <Card
        elevation={hovering ? 12 : 2}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClick?.();
          if (recipeRoute) void navigate(recipeRoute);
        }}
        sx={{ cursor: showRecipeContent ? "pointer" : "auto", minHeight: imageHeight + 75, transition: "box-shadow 200ms" }}
      >
        <RecipeCardImage small iconSize={imageHeight} height={imageHeight} slug={slug} recipeId={recipeId} imageVersion={image}>
          {description && (
            <Collapse in={hovering} sx={{ height: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "secondary.main", opacity: 0.8, position: "absolute", bottom: 0, width: "100%", height: imageHeight }}>
                <Box sx={{ p: 2, color: "#fff", opacity: 1 }}>
                  <Box sx={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 8, overflow: "hidden", overflowWrap: "anywhere" }}>
                    <SafeMarkdown source={description} />
                  </Box>
                </Box>
              </Box>
            </Collapse>
          )}
        </RecipeCardImage>
        <Typography sx={{ px: 2, py: 1.5, fontSize: "1.25rem" }}>{name}</Typography>

        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: tagList.length === 0 ? "center" : "flex-end", minHeight: 84 }}>
          {tagList.length > 0 && (
            <Box sx={{ "px": 2, "display": "flex", "flexWrap": "nowrap", "gap": "4px", "minWidth": 0, "overflow": "hidden", "& .MuiChip-root": { m: "0 !important", flex: "0 1 auto" } }}>
              <RecipeChips truncate={false} items={tagList} title={false} limit={2} small urlPrefix="tags" onItemSelected={onItemSelected} />
            </Box>
          )}
          {actions ?? (showRecipeContent && (
            <CardActions sx={{ width: "100%", px: 0.5, py: 0 }}>
              {isOwnGroup ? <RecipeFavoriteBadge recipeId={recipeId} showAlways /> : <Box sx={{ px: 0.5 }} /> /* keeps the layout consistent */}
              <RecipeCardRating value={rating} recipeId={recipeId} />
              <Box sx={{ flex: 1 }} />
              {/* If we're not logged-in, no items display, so we hide this menu */}
              {isOwnGroup && showRecipeContent && (
                <RecipeContextMenu
                  color="grey-darken-2"
                  slug={slug}
                  menuIcon={icons.dotsVertical}
                  name={name}
                  recipeId={recipeId}
                  useItems={{
                    delete: false,
                    edit: false,
                    download: true,
                    mealplanner: true,
                    shoppingList: true,
                    print: false,
                    printPreferences: false,
                    share: true,
                  }}
                  onDeleted={() => onDelete?.(slug)}
                />
              )}
            </CardActions>
          ))}
        </Box>
        {children}
      </Card>
    </div>
  );
}

export default RecipeCard;
