import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
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
import type { ContextMenuItem } from "./RecipeContextMenu/RecipeContextMenu";
import { RecipeFavoriteBadge } from "./RecipeFavoriteBadge";

export interface RecipeCardMobileProps {
  name: string;
  slug: string;
  description: string;
  rating?: number;
  image?: unknown;
  tags?: RecipeTag[];
  recipeId: string;
  vertical?: boolean;
  isFlat?: boolean;
  height?: number;
  disableHighlight?: boolean;
  contextMenuAppendItems?: ContextMenuItem[];
  contextMenuLeadingItems?: ContextMenuItem[];
  className?: string;
  /** When set, clicking selects instead of navigating (the Vue `selected` attr/listener). */
  onSelected?: () => void;
  onDelete?: (slug: string) => void;
  onMealplanRemove?: () => void;
  onMealplanEdit?: () => void;
  onItemSelected?: RecipeChipsProps["onItemSelected"];
  /** Replaces the default avatar image (the Vue `#avatar` slot). */
  avatar?: ReactNode;
  /** Replaces the action row (the Vue `#actions` slot). */
  actions?: ReactNode;
  /** Replaces the context menu (the Vue `#context-menu` slot). */
  contextMenu?: ReactNode;
  children?: ReactNode;
}

export function RecipeCardMobile(props: RecipeCardMobileProps) {
  const {
    name, slug, description, rating = 0, image, tags = [], recipeId, vertical = false, isFlat = false, height = 150,
    disableHighlight = false, contextMenuAppendItems, contextMenuLeadingItems, className, onSelected, onDelete, onMealplanRemove,
    onMealplanEdit, onItemSelected, avatar, actions, contextMenu, children,
  } = props;
  const auth = useMealieAuth();
  const { isOwnGroup } = useLoggedInState();
  const params = useParams();
  const navigate = useNavigate();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const showRecipeContent = !!(recipeId && slug);
  const recipeRoute = showRecipeContent ? `/g/${groupSlug}/r/${slug}` : "";

  return (
    <Box className={className} sx={{ height }}>
      <Card
        className={isFlat ? "flat" : undefined}
        elevation={isFlat ? 0 : 1}
        sx={{
          mx: "auto",
          height: "100%",
          cursor: showRecipeContent ? "pointer" : "auto",
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          ...(isFlat ? { bgcolor: "transparent", boxShadow: "none" } : {}),
          ...(!disableHighlight ? { "&:hover": { boxShadow: 4 } } : {}),
        }}
        onClick={() => {
          if (onSelected) {
            onSelected();
            return;
          }
          if (recipeRoute) void navigate(recipeRoute);
        }}
      >
        {vertical && (
          <Box sx={{ borderRadius: 1, overflow: "hidden" }}>
            <RecipeCardImage tiny iconSize={100} slug={slug} recipeId={recipeId} imageVersion={image} height={height} />
          </Box>
        )}
        {!vertical && (
          <Box sx={{ height: "100%", flexShrink: 0 }}>
            {avatar ?? <RecipeCardImage tiny iconSize={100} slug={slug} recipeId={recipeId} imageVersion={image} width="125" height={height} />}
          </Box>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, px: vertical ? 1 : 0 }}>
          <Box sx={{ pl: 2, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "stretch", pr: 1, flex: 1, minHeight: 0 }}>
            <Typography sx={{ mt: 1.5, mb: 0.5, width: "100%" }} noWrap>{name}</Typography>
            <Box sx={{ m: 0, color: "text.secondary", fontSize: "0.875rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {description ? <SafeMarkdown source={description} /> : <p><br /><br /><br /></p>}
            </Box>
            <Box sx={{ display: "flex", flexWrap: "nowrap", justifyContent: "flex-start", m: 0, pt: 1, pb: 0, overflow: "hidden", whiteSpace: "nowrap" }}>
              <RecipeChips truncate items={tags} title={false} limit={2} small urlPrefix="tags" onItemSelected={onItemSelected} />
            </Box>
          </Box>
          {actions ?? (
            <CardActions sx={{ width: "100%", my: 0, px: 0.5, py: 0 }}>
              {isOwnGroup && showRecipeContent
                ? <RecipeFavoriteBadge recipeId={recipeId} showAlways sx={{ m: 0, p: 0 }} />
                : <Box sx={{ my: 0, px: 0.5, py: 0 }} /> /* Empty box keeps the layout consistent */}
              {showRecipeContent && <RecipeCardRating className={!isOwnGroup ? "pb-2" : undefined} value={rating} recipeId={recipeId} />}
              {/* If we're not logged-in, no items display, so we hide this menu */}
              {contextMenu ?? (isOwnGroup && showRecipeContent && (
                <Box sx={{ ml: "auto" }}>
                  <RecipeContextMenu
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
                </Box>
              ))}
            </CardActions>
          )}
        </Box>
        {children}
      </Card>
    </Box>
  );
}

export default RecipeCardMobile;
