// Usage: <RecipeContextMenu slug={recipe.slug} name={recipe.name} recipeId={recipe.id} recipe={recipe}
//   useItems={{ delete: false, … }} onDeleted={slug => …} onPrint={…} /> — the three-dots (or `fab`) button that opens
// the recipe's action menu. The menu content (and the dialogs it opens) loads on the first open.
import { lazy, Suspense, useState, type MouseEvent } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { MdiIcon } from "@/components/global/MdiIcon";
import type { Recipe } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import type { ContextMenuIncludes } from "./RecipeContextMenuContent";

export interface ContextMenuItem {
  title: string;
  icon: string;
  color?: string;
  event: string;
  isPublic: boolean;
}

export type { ContextMenuIncludes };

interface RecipeContextMenuProps {
  useItems?: Partial<ContextMenuIncludes>;
  appendItems?: ContextMenuItem[];
  leadingItems?: ContextMenuItem[];
  menuTop?: boolean;
  fab?: boolean;
  color?: string;
  slug: string;
  menuIcon?: string | null;
  name: string;
  recipe?: Recipe;
  recipeId: string;
  recipeScale?: number;
  className?: string;
  onPrint?: () => void;
  onDeleted?: (slug: string) => void;
  onMealplanRemove?: () => void;
  onMealplanEdit?: () => void;
  /** Any other event of a leading/appended item (Vue emitted it by name). */
  onEvent?: (event: string) => void;
}

// loaded on first open, like Vue's defineAsyncComponent
const RecipeContextMenuContent = lazy(() =>
  import("./RecipeContextMenuContent").then(module => ({ default: module.RecipeContextMenuContent })),
);

export function RecipeContextMenu({
  useItems,
  appendItems,
  leadingItems,
  menuTop = true,
  fab = false,
  color = "primary",
  slug,
  menuIcon = null,
  name,
  recipe,
  recipeId,
  recipeScale = 1,
  className,
  onPrint,
  onDeleted,
  onMealplanRemove,
  onMealplanEdit,
  onEvent,
}: RecipeContextMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [isMenuContentLoaded, setIsMenuContentLoaded] = useState(false);

  const icon = menuIcon || icons.dotsVertical;

  function openMenu(event: MouseEvent<HTMLElement>) {
    // the button often sits on a card that is a link
    event.preventDefault();
    setAnchor(event.currentTarget);
    setIsMenuContentLoaded(true);
  }

  return (
    <Box className={className} sx={{ textAlign: "center" }}>
      <IconButton
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        color={fab ? "info" : "secondary"}
        size={fab ? "small" : "medium"}
        sx={fab ? { "bgcolor": "info.main", "color": "white", "&:hover": { bgcolor: "info.dark" } } : undefined}
        onClick={openMenu}
      >
        <MdiIcon path={icon} size={fab ? "x-large" : "default"} sx={{ color: fab ? "white" : "secondary.main" }} />
      </IconButton>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        // keeps the loaded content (and the dialogs it owns) alive while the menu is closed
        keepMounted={isMenuContentLoaded}
        anchorOrigin={{ vertical: menuTop ? "bottom" : "top", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ displayPrint: "none" }}
        slotProps={{ paper: { sx: { maxHeight: "80vh" } } }}
        // a click inside the menu (or its dialogs) must not reach the card underneath
        onClick={event => event.stopPropagation()}
      >
        {isMenuContentLoaded && (
          <Suspense fallback={null}>
            <RecipeContextMenuContent
              slug={slug}
              name={name}
              recipe={recipe}
              recipeId={recipeId}
              recipeScale={recipeScale}
              useItems={useItems}
              appendItems={appendItems}
              leadingItems={leadingItems}
              menuTop={menuTop}
              fab={fab}
              color={color}
              menuIcon={menuIcon}
              onClose={() => setAnchor(null)}
              onPrint={onPrint}
              onDeleted={onDeleted}
              onMealplanEdit={onMealplanEdit}
              onMealplanRemove={onMealplanRemove}
              onEvent={onEvent}
            />
          </Suspense>
        )}
      </Popover>
    </Box>
  );
}
