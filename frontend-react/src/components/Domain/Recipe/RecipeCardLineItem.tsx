// Usage: <RecipeCardLineItem recipe={recipe} active subtitle={…} append={…} /> — a compact list row (thumbnail,
// name, optional subtitle / trailing content) linking to the recipe unless `disableLink`.
// The Vue `#subtitle` / `#append` slots are the `subtitle` / `append` props.
import type { ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { Link, useParams } from "react-router";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import type { RecipeSummary } from "@/lib/api/types/recipe";
import { RecipeCardImage } from "./RecipeCardImage";

interface RecipeCardLineItemProps {
  recipe: RecipeSummary;
  active?: boolean;
  disableLink?: boolean;
  subtitle?: ReactNode;
  append?: ReactNode;
  /** Vue `@click` on the item (falls through to the list item). */
  onClick?: () => void;
}

export function RecipeCardLineItem({ recipe, active = false, disableLink = false, subtitle, append, onClick }: RecipeCardLineItemProps) {
  const auth = useMealieAuth();
  const params = useParams();

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const recipeRoute = disableLink || !recipe.slug ? undefined : `/g/${groupSlug}/r/${recipe.slug}`;

  const body = (
    <>
      <ListItemAvatar sx={{ minWidth: 72 }}>
        <Avatar
          className="recipe-thumbnail"
          variant="rounded"
          // the image sizes itself from its own aspect ratio, so stretch it to cover the thumbnail
          sx={{ "width": 56, "height": 40, "borderRadius": 2, "& > div": { width: "100%", height: "100%" } }}
        >
          <RecipeCardImage
            tiny
            recipeId={recipe.id ?? ""}
            slug={recipe.slug}
            imageVersion={recipe.image}
            height="40"
            minHeight="0"
            iconSize={24}
          />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={recipe.name}
        secondary={subtitle}
        slotProps={{ primary: { noWrap: true }, secondary: { component: "div" } }}
      />
    </>
  );

  return (
    <ListItem disablePadding secondaryAction={append}>
      {recipeRoute
        ? <ListItemButton component={Link} to={recipeRoute} selected={active} onClick={onClick}>{body}</ListItemButton>
        : <ListItemButton selected={active} sx={{ cursor: "pointer" }} onClick={onClick}>{body}</ListItemButton>}
    </ListItem>
  );
}
