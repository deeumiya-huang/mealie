// Usage: <RecipeCard name slug recipeId description rating image tags imageHeight={200} onClick onDelete actions={node}>
//   overlay children </RecipeCard>
// The recipe tile: image (with the description sliding over it on hover), name, tag chips and a footer with the
// favourite heart, rating and the actions menu. The whole card links to the recipe. `actions` replaces the footer
// row (Vue `#actions` slot); `children` are drawn on the card (Vue default slot).
import { useState, type MouseEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Collapse from "@mui/material/Collapse";
import { Link, useParams } from "react-router";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import type { RecipeCategory, RecipeTag, RecipeTool } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeCardImage } from "./RecipeCardImage";
import { RecipeCardRating } from "./RecipeCardRating";
import { RecipeChips, type UrlPrefixParam } from "./RecipeChips";
import { RecipeContextMenu } from "./RecipeContextMenu/RecipeContextMenu";
import { RecipeFavoriteBadge } from "./RecipeFavoriteBadge";

interface RecipeCardProps {
  name: string;
  slug: string;
  description?: string | null;
  rating?: number;
  ratingColor?: string;
  image?: unknown;
  tags?: RecipeCategory[] | RecipeTag[] | RecipeTool[];
  recipeId: string;
  imageHeight?: number;
  actions?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  onDelete?: (slug: string) => void;
  /** Chip clicks (Vue forwarded the `item-selected` listener to the chips through `$attrs`). */
  onItemSelected?: (item: RecipeCategory | RecipeTag | RecipeTool, urlPrefix: UrlPrefixParam) => void;
}

const NO_TAGS: RecipeTag[] = [];

export function RecipeCard({
  name,
  slug,
  description = null,
  rating = 0,
  image,
  tags = NO_TAGS,
  recipeId,
  imageHeight = 200,
  actions,
  children,
  onClick,
  onDelete,
  onItemSelected,
}: RecipeCardProps) {
  const auth = useMealieAuth();
  const { isOwnGroup } = useLoggedInState();
  const params = useParams();
  const [isHovering, setIsHovering] = useState(false);

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const showRecipeContent = !!(recipeId && slug);
  const recipeRoute = showRecipeContent ? `/g/${groupSlug}/r/${slug}` : "";

  const cardContent = (
    <>
      <RecipeCardImage
        small
        iconSize={imageHeight}
        height={imageHeight}
        slug={slug}
        recipeId={recipeId}
        imageVersion={image}
      >
        {description && (
          <Collapse in={isHovering} unmountOnExit sx={{ position: "absolute", bottom: 0, width: "100%", zIndex: 1 }}>
            <Box
              className="v-card--reveal"
              sx={{ display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "secondary.main", color: "secondary.contrastText", opacity: 0.8 }}
            >
              <CardContent className="v-card--text-show" sx={{ opacity: "1 !important", color: "inherit" }}>
                <Box
                  className="descriptionWrapper"
                  sx={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 8,
                    lineClamp: 8,
                    overflow: "hidden",
                    overflowWrap: "anywhere",
                  }}
                >
                  <SafeMarkdown source={description} />
                </Box>
              </CardContent>
            </Box>
          </Collapse>
        )}
      </RecipeCardImage>
      <Box sx={{ px: 2, py: 1, fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {name}
      </Box>

      <Box
        className={tags.length === 0 ? "recipe-card-footer recipe-card-footer--no-tags" : "recipe-card-footer"}
        sx={{ display: "flex", flexDirection: "column", justifyContent: tags.length === 0 ? "center" : "flex-end", minHeight: 84 }}
      >
        {tags.length > 0 && (
          <Box
            className="recipe-card-tags"
            sx={{
              "px": 2,
              "display": "flex",
              "flexWrap": "nowrap",
              "gap": "4px",
              "minWidth": 0,
              "overflow": "hidden",
              "& .MuiChip-root": { flex: "0 1 auto", m: "0 !important" },
              "& .MuiChip-label": { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
            }}
          >
            <RecipeChips
              truncate={false}
              items={tags}
              title={false}
              limit={2}
              small
              urlPrefix="tags"
              onItemSelected={onItemSelected}
            />
          </Box>
        )}

        {actions ?? (showRecipeContent && (
          <CardActions className="recipe-card-actions" sx={{ px: 0.5, py: 0, width: "100%" }}>
            {isOwnGroup ? <RecipeFavoriteBadge recipeId={recipeId} showAlways /> : <Box sx={{ px: 0.5 }} />}

            <RecipeCardRating value={rating} recipeId={recipeId} />
            <Box sx={{ flexGrow: 1 }} />
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
    </>
  );

  const cardSx = {
    "cursor": showRecipeContent ? "pointer" : "auto",
    "minHeight": imageHeight + 75,
    "position": "relative",
    "display": "block",
    "color": "inherit",
    "textDecoration": "none",
    "transition": "box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": { boxShadow: 12 },
  } as const;

  return (
    // Wrap with a div to provide a proper DOM element for the transition
    <div>
      {recipeRoute
        ? (
            <Card
              component={Link}
              to={recipeRoute}
              elevation={2}
              className={isHovering ? "on-hover" : undefined}
              sx={cardSx}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={(event: MouseEvent) => {
                if (event.target === event.currentTarget) onClick?.();
              }}
            >
              {cardContent}
            </Card>
          )
        : (
            <Card
              elevation={2}
              className={isHovering ? "on-hover" : undefined}
              sx={cardSx}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={(event) => {
                if (event.target === event.currentTarget) onClick?.();
              }}
            >
              {cardContent}
            </Card>
          )}
    </div>
  );
}
