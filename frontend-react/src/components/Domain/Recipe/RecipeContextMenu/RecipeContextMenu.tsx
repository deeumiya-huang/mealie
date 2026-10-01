import { lazy, Suspense, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import { icons } from "~/lib/icons";
import type { Recipe } from "~/lib/api/types/recipe";
import { Icon } from "~/components/global/Icon";
import { DEFAULT_CONTEXT_MENU_ITEMS } from "./types";
import type { ContextMenuIncludes, ContextMenuItem } from "./types";

export type { ContextMenuIncludes, ContextMenuItem } from "./types";

// Loaded on first open: it pulls in several dialogs a card grid doesn't otherwise need.
const RecipeContextMenuContent = lazy(() => import("./RecipeContextMenuContent"));

export interface RecipeContextMenuProps {
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
  onMealplanEdit?: () => void;
  onMealplanRemove?: () => void;
  /** Custom leading/append item events (the Vue component emitted them by name). */
  onEvent?: (event: string) => void;
}

export function RecipeContextMenu(props: RecipeContextMenuProps) {
  const { useItems, menuTop = true, fab = false, menuIcon = null, className, onPrint, onDeleted, onMealplanEdit, onMealplanRemove, onEvent, ...contentProps } = props;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [isMenuContentLoaded, setLoaded] = useState(false);

  // Vue withDefaults replaced the whole object when useItems was passed; keep that semantics.
  const items: ContextMenuIncludes = useItems ? { ...DEFAULT_CONTEXT_MENU_ITEMS, ...Object.fromEntries(Object.keys(DEFAULT_CONTEXT_MENU_ITEMS).map(k => [k, false])), ...useItems } : DEFAULT_CONTEXT_MENU_ITEMS;

  const handleEvent = (event: string, payload?: unknown) => {
    switch (event) {
      case "print":
        onPrint?.();
        break;
      case "deleted":
        onDeleted?.(payload as string);
        break;
      case "mealplanEdit":
        onMealplanEdit?.();
        break;
      case "mealplanRemove":
        onMealplanRemove?.();
        break;
      default:
        onEvent?.(event);
    }
  };

  return (
    <Box className={["d-print-none", className].filter(Boolean).join(" ")} sx={{ textAlign: "center" }}>
      <IconButton
        size={fab ? "small" : "medium"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAnchor(e.currentTarget);
          setLoaded(true);
        }}
        sx={fab ? { "bgcolor": "info.main", "color": "#fff", "&:hover": { bgcolor: "info.dark" } } : { color: "secondary.main" }}
      >
        <Icon path={menuIcon || icons.dotsVertical} size={fab ? "x-large" : undefined} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        onClick={e => e.stopPropagation()}
        keepMounted={isMenuContentLoaded}
        anchorOrigin={{ vertical: menuTop ? "top" : "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: menuTop ? "bottom" : "top", horizontal: "left" }}
      >
        {isMenuContentLoaded && (
          <Suspense fallback={null}>
            <RecipeContextMenuContent {...contentProps} useItems={items} onClose={() => setAnchor(null)} onEvent={handleEvent} />
          </Suspense>
        )}
      </Menu>
    </Box>
  );
}

export default RecipeContextMenu;
