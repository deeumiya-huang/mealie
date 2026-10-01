import type { ReactNode } from "react";
import { Link as RouterLink, useParams } from "react-router";
import Box from "@mui/material/Box";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import type { RecipeSummary } from "~/lib/api/types/recipe";
import { RecipeCardImage } from "./RecipeCardImage";

export interface RecipeCardLineItemProps {
  recipe: RecipeSummary;
  active?: boolean;
  disableLink?: boolean;
  subtitle?: ReactNode;
  append?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function RecipeCardLineItem({ recipe, active = false, disableLink = false, subtitle, append, onClick, className }: RecipeCardLineItemProps) {
  const auth = useMealieAuth();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const recipeRoute = disableLink || !recipe.slug ? undefined : `/g/${groupSlug}/r/${recipe.slug}`;
  const linkProps = recipeRoute ? { component: RouterLink, to: recipeRoute } : {};

  return (
    <ListItemButton {...linkProps} selected={active} onClick={onClick} className={className} sx={{ gap: 2, py: 1 }}>
      <Box sx={{ "width": 56, "height": 40, "borderRadius": 2, "overflow": "hidden", "flexShrink": 0, "& img": { width: "100%", height: "100%", objectFit: "cover" } }}>
        <RecipeCardImage tiny recipeId={recipe.id!} slug={recipe.slug} imageVersion={recipe.image} height={40} minHeight={0} iconSize={24} />
      </Box>
      <ListItemText
        primary={recipe.name}
        secondary={subtitle}
        slotProps={{ primary: { noWrap: true } }}
      />
      {append}
    </ListItemButton>
  );
}

export default RecipeCardLineItem;
