// Usage: <RecipeCardMobile name slug recipeId description rating image tags height={150} vertical isFlat
//   contextMenuLeadingItems contextMenuAppendItems onSelected onDelete onMealplanRemove onMealplanEdit
//   avatar={node} actions={node} contextMenu={node}>overlay children</RecipeCardMobile>
// The compact horizontal recipe card (image on the left, or on top when `vertical`; name, description, tags and a
// footer with favourite, rating and the actions menu). It links to the recipe unless `onSelected` is given, in
// which case a click only calls `onSelected` (search dialog, meal planner). `avatar`, `actions` and `contextMenu`
// replace the matching Vue slots; `children` are drawn on the card.
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import { Link, useParams } from "react-router";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import type { RecipeCategory, RecipeTag, RecipeTool } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeCardImage } from "./RecipeCardImage";
import { RecipeCardRating } from "./RecipeCardRating";
import { RecipeChips, type UrlPrefixParam } from "./RecipeChips";
import { RecipeContextMenu, type ContextMenuItem } from "./RecipeContextMenu/RecipeContextMenu";
import { RecipeFavoriteBadge } from "./RecipeFavoriteBadge";

interface RecipeCardMobileProps {
  name: string;
  slug: string;
  description: string;
  rating?: number;
  image?: unknown;
  tags?: RecipeCategory[] | RecipeTag[] | RecipeTool[];
  recipeId: string;
  vertical?: boolean;
  isFlat?: boolean;
  height?: number;
  disableHighlight?: boolean;
  contextMenuAppendItems?: ContextMenuItem[];
  contextMenuLeadingItems?: ContextMenuItem[];
  className?: string;
  avatar?: ReactNode;
  actions?: ReactNode;
  contextMenu?: ReactNode;
  children?: ReactNode;
  onMealplanRemove?: () => void;
  onMealplanEdit?: () => void;
  onSelected?: () => void;
  onDelete?: (slug: string) => void;
  /** Chip clicks (Vue forwarded the `item-selected` listener to the chips through `$attrs`). */
  onItemSelected?: (item: RecipeCategory | RecipeTag | RecipeTool, urlPrefix: UrlPrefixParam) => void;
}

const NO_TAGS: RecipeTag[] = [];

export function RecipeCardMobile({
  name,
  slug,
  description,
  rating = 0,
  image,
  tags = NO_TAGS,
  recipeId,
  vertical = false,
  isFlat = false,
  height = 150,
  disableHighlight = false,
  contextMenuAppendItems,
  contextMenuLeadingItems,
  className,
  avatar,
  actions,
  contextMenu,
  children,
  onMealplanRemove,
  onMealplanEdit,
  onSelected,
  onDelete,
  onItemSelected,
}: RecipeCardMobileProps) {
  const auth = useMealieAuth();
  const { isOwnGroup } = useLoggedInState();
  const params = useParams();

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const showRecipeContent = !!(recipeId && slug);
  const recipeRoute = showRecipeContent ? `/g/${groupSlug}/r/${slug}` : "";

  const cardSx = {
    cursor: showRecipeContent ? "pointer" : "auto",
    height: "100%",
    mx: "auto",
    display: "block",
    color: "inherit",
    textDecoration: "none",
    position: "relative",
    overflow: "hidden",
    ...(isFlat ? { boxShadow: "none !important", bgcolor: "transparent !important" } : {}),
    // Vuetify's hover overlay (switched off by `disableHighlight`)
    ...(disableHighlight ? {} : { "&:hover::after": { content: "\"\"", position: "absolute", inset: 0, bgcolor: "currentColor", opacity: 0.04, pointerEvents: "none" } }),
  } as const;

  const content = (
    <>
      {vertical && (
        <Box sx={{ borderRadius: "2px", overflow: "hidden" }}>
          <RecipeCardImage tiny iconSize={100} slug={slug} recipeId={recipeId} imageVersion={image} height={height} />
        </Box>
      )}
      <Box sx={{ display: "flex", height: "100%", py: 0, px: vertical ? 1 : 0 }}>
        {!vertical && (
          <Box sx={{ height: "100%", flex: "0 0 auto" }}>
            {avatar ?? (
              <Box sx={{ width: 125, height: "100%" }}>
                <RecipeCardImage tiny iconSize={100} slug={slug} recipeId={recipeId} imageVersion={image} height={height} />
              </Box>
            )}
          </Box>
        )}
        <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Box sx={{ pl: 2, pr: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "stretch", minWidth: 0 }}>
            <Box
              sx={{ mt: 1.5, mb: 0.5, alignSelf: "start", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "1rem", fontWeight: 400, lineHeight: 1.5 }}
            >
              {name}
            </Box>
            <Box
              sx={{
                m: 0,
                alignSelf: "start",
                opacity: 0.6,
                fontSize: "0.875rem",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                lineClamp: 2,
              }}
            >
              {description
                ? <SafeMarkdown source={description} />
                : (
                    <p>
                      <br />
                      <br />
                      <br />
                    </p>
                  )}
            </Box>
            <Box sx={{ display: "flex", flexWrap: "nowrap", justifyContent: "flex-start", m: 0, pt: 1, pb: 0, overflow: "hidden", whiteSpace: "nowrap" }}>
              <RecipeChips
                truncate
                items={tags}
                title={false}
                limit={2}
                small
                urlPrefix="tags"
                onItemSelected={onItemSelected}
              />
            </Box>
          </Box>
          {actions ?? (
            <Box sx={{ display: "flex", alignItems: "center", width: "100%", my: 0, px: 0.5, py: 0 }}>
              {isOwnGroup && showRecipeContent
                ? <RecipeFavoriteBadge recipeId={recipeId} showAlways sx={{ m: 0, p: 0 }} />
                : <Box sx={{ my: 0, px: 0.5, py: 0 }} /> /* Empty div to keep the layout consistent */}
              {showRecipeContent && (
                <Box sx={{ ml: -1, pb: isOwnGroup ? 0 : 1 }}>
                  <RecipeCardRating value={rating} recipeId={recipeId} />
                </Box>
              )}

              {/* If we're not logged-in, no items display, so we hide this menu */}
              {/* We also add padding to the rating above to compensate */}
              {contextMenu ?? (isOwnGroup && showRecipeContent && (
                <RecipeContextMenu
                  className="ml-auto"
                  slug={slug}
                  menuIcon={icons.dotsHorizontal}
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
                  leadingItems={contextMenuLeadingItems}
                  appendItems={contextMenuAppendItems}
                  onDeleted={() => onDelete?.(slug)}
                  onMealplanRemove={onMealplanRemove}
                  onMealplanEdit={onMealplanEdit}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
      {children}
    </>
  );

  return (
    <div className={className} style={{ height: `${height}px` }}>
      {onSelected || !recipeRoute
        ? (
            <Card className={isFlat ? "flat" : undefined} sx={cardSx} onClick={() => onSelected?.()}>
              {content}
            </Card>
          )
        : (
            <Card component={Link} to={recipeRoute} className={isFlat ? "flat" : undefined} sx={cardSx}>
              {content}
            </Card>
          )}
    </div>
  );
}
