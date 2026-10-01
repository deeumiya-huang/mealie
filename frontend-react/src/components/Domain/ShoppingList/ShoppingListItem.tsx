import { useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import { Icon } from "~/components/global/Icon";
import type { SortableHandleProps } from "~/components/global/SortableList";
import { RecipeIngredientListItem } from "~/components/Domain/Recipe/RecipeIngredientListItem";
import { RecipeList } from "~/components/Domain/Recipe/RecipeList";
import { useI18n } from "~/hooks/use-global-i18n";
import { useOnline } from "~/hooks/use-online";
import type { ShoppingListItemOut } from "~/lib/api/types/household";
import type { MultiPurposeLabelOut } from "~/lib/api/types/labels";
import type { IngredientFood, IngredientUnit, RecipeIngredient, RecipeSummary } from "~/lib/api/types/recipe";
import { icons } from "~/lib/icons";
import { ShoppingListItemEditor } from "./ShoppingListItemEditor";

export interface ShoppingListItemProps {
  item: ShoppingListItemOut;
  labels: MultiPurposeLabelOut[];
  units: IngredientUnit[];
  foods: IngredientFood[];
  recipes?: Map<string, RecipeSummary>;
  edit?: boolean;
  /** Drag handle from the surrounding SortableList (the up/down button, which also opens the menu). */
  handle?: SortableHandleProps;
  onChecked?: (item: ShoppingListItemOut) => void;
  onSave?: (item: ShoppingListItemOut) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onView?: () => void;
  sx?: SxProps<Theme>;
}

const SWIPE_THRESHOLD = 50;

type SwipeGesture = null | "scroll" | "swipe";
interface SwipeInfo { startX: number; startY: number; endX: number; endY: number; gesture: SwipeGesture }
const NO_SWIPE: SwipeInfo = { startX: 0, startY: 0, endX: 0, endY: 0, gesture: null };

function touchPoint(e: ReactTouchEvent) {
  const touch = e.touches[0] ?? e.changedTouches[0];
  return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
}

/**
 * The editor works on its own copy of the item, taken when editing starts, so a background refresh
 * of the list doesn't interrupt the user.
 */
function LocalItemEditor({ item, onSave, ...props }: Omit<Parameters<typeof ShoppingListItemEditor>[0], "value" | "onChange" | "onSave"> & {
  item: ShoppingListItemOut;
  onSave?: (item: ShoppingListItemOut) => void;
}) {
  const [local, setLocal] = useState(() => ({ ...item }));
  return <ShoppingListItemEditor {...props} value={local} onChange={setLocal} onSave={() => onSave?.(local)} />;
}

export function ShoppingListItem({ item: listItem, labels, units, foods, recipes, edit = false, handle, onChecked, onSave, onDelete, onEdit, onView, sx }: ShoppingListItemProps) {
  const i18n = useI18n();
  const theme = useTheme();
  const isRtl = theme.direction === "rtl";
  const online = useOnline();
  const isOffline = !online;

  const [displayRecipeRefs, setDisplayRecipeRefs] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const contextMenu = [
    { text: i18n.t("general.edit"), event: "edit" },
    { text: i18n.t("general.delete"), event: "delete" },
  ];

  function toggleChecked() {
    onChecked?.({ ...listItem, checked: !listItem.checked });
  }

  // swipe right (left in RTL) to check off an item
  const [swipe, setSwipe] = useState<SwipeInfo>(NO_SWIPE);
  const gestureRef = useRef<SwipeGesture>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // stop the page scrolling sideways while swiping; needs a non-passive native listener
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (gestureRef.current === "swipe") e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [edit]);

  function onSwipeStart(e: ReactTouchEvent) {
    const { x, y } = touchPoint(e);
    gestureRef.current = null;
    setSwipe({ startX: x, startY: y, endX: x, endY: y, gesture: null });
  }

  function onSwipeMove(e: ReactTouchEvent) {
    const { x, y } = touchPoint(e);
    let gesture = swipe.gesture;
    if (!gesture) {
      const deltaX = Math.abs(x - swipe.startX);
      const deltaY = Math.abs(y - swipe.startY);
      if (deltaY > 8 && deltaY > deltaX) {
        gesture = "scroll";
      }
      else if (deltaX > 8 && deltaX > deltaY) {
        gesture = "swipe";
      }
      else if (deltaX > 8 || deltaY > 8) {
        // Diagonal / ambiguous — default to scroll
        gesture = "scroll";
      }
    }
    gestureRef.current = gesture;
    setSwipe({ ...swipe, endX: x, endY: y, gesture });
  }

  const swiping = (() => {
    if (swipe.gesture !== "swipe") return 0;
    const deltaX = isRtl ? swipe.startX - swipe.endX : swipe.endX - swipe.startX;
    return Math.max(0, Math.min(deltaX, 100));
  })();

  function onSwipeEnd() {
    if (swipe.gesture === "swipe" && swiping >= SWIPE_THRESHOLD) {
      toggleChecked();
    }
    gestureRef.current = null;
    setSwipe(NO_SWIPE);
  }

  const recipeList: RecipeSummary[] = [];
  listItem.recipeReferences?.forEach((ref) => {
    const recipe = recipes?.get(ref.recipeId);
    if (recipe) recipeList.push(recipe);
  });

  if (edit) {
    return (
      <Box sx={[{ overflowX: "hidden", mb: 2 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
        <LocalItemEditor
          item={listItem}
          labels={labels}
          units={units}
          foods={foods}
          sx={{ m: 1 }}
          onSave={onSave}
          onCancel={onView}
          onDelete={onDelete}
        />
      </Box>
    );
  }

  return (
    <Box sx={[{ overflowX: "hidden" }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      <Box
        sx={{
          transform: `translateX(${isRtl ? -swiping : swiping}px)`,
          transition: swiping === 0 ? "transform 0.2s ease" : "none",
          opacity: swiping >= SWIPE_THRESHOLD ? 0.5 : 1,
        }}
      >
        <Box
          ref={rowRef}
          sx={{ display: "flex", flexWrap: "nowrap", alignItems: "center", touchAction: "pan-y" }}
          onTouchStart={onSwipeStart}
          onTouchMove={onSwipeMove}
          onTouchEnd={onSwipeEnd}
          onTouchCancel={onSwipeEnd}
        >
          {/* the text takes every pixel the action buttons don't, so a long name only wraps
              once the row is genuinely full rather than at an arbitrary half-way point */}
          <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "flex", alignItems: "center", flexWrap: "nowrap" }}>
            <Checkbox
              checked={!!listItem.checked}
              size="small"
              sx={{ "p": 0.5, "flexShrink": 0, "color": "inherit", "&.Mui-checked": { color: "inherit" } }}
              onChange={toggleChecked}
            />
            <Box
              className="shopping-list-item__text"
              sx={{
                "ml": 1,
                "flex": "1 1 auto",
                "minWidth": 0,
                "overflow": "hidden",
                "textOverflow": "ellipsis",
                ...(listItem.checked ? { textDecoration: "line-through" } : {}),
                // Let a long name shrink and wrap in place instead of jumping to a new line and
                // leaving the quantity on a line of its own, unless less than half the row is left
                // for it. The note keeps its own full-width line.
                "& .ingredient-item > .text-bold": { flex: "1 1 0", minWidth: "50%" },
                // ...and when it does wrap, the quantity and unit stay on its first line
                "& .ingredient-item": { alignItems: "baseline" },
              }}
            >
              <RecipeIngredientListItem ingredient={listItem as RecipeIngredient} />
            </Box>
          </Box>
          <Box sx={{ flexShrink: 0, textAlign: "right" }}>
            {!listItem.checked && (
              <Box sx={{ "minWidth": 72, "display": "flex", "justifyContent": "flex-end", "& .MuiIconButton-root .MuiSvgIcon-root": { opacity: 0.55 }, "& .MuiIconButton-root:hover .MuiSvgIcon-root, & .MuiIconButton-root:focus-visible .MuiSvgIcon-root": { opacity: 1 } }}>
                {recipeList.length > 0 && (
                  <Tooltip title="Toggle Recipes" enterDelay={200} placement="right">
                    <IconButton size="small" onClick={() => setDisplayRecipeRefs(!displayRecipeRefs)}>
                      <Icon path={icons.silverwareForkKnife} />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton size="small" onClick={onEdit} aria-label={i18n.t("general.edit")}>
                  <Icon path={icons.edit} />
                </IconButton>
                <IconButton
                  size="small"
                  ref={handle?.ref}
                  {...handle?.attributes}
                  {...handle?.listeners}
                  sx={{ cursor: "grab", touchAction: "none" }}
                  onClick={e => setMenuAnchor(e.currentTarget)}
                >
                  <Icon path={icons.arrowUpDown} />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={!!menuAnchor}
                  onClose={() => setMenuAnchor(null)}
                  anchorOrigin={{ vertical: "top", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  slotProps={{ paper: { sx: { minWidth: 125 } } }}
                >
                  {contextMenu.map(action => (
                    <MenuItem
                      key={action.event}
                      dense
                      onClick={() => {
                        setMenuAnchor(null);
                        if (action.event === "edit") onEdit?.();
                        else onDelete?.();
                      }}
                    >
                      {action.text}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            )}
          </Box>
        </Box>
        {!listItem.checked && recipeList.length > 0 && displayRecipeRefs && (
          <RecipeList recipes={recipeList} listItem={listItem} disabled={isOffline} tile />
        )}
        {listItem.checked && (
          <Typography variant="caption" component="div" sx={{ fontWeight: 300, fontStyle: "italic" }}>
            {i18n.t("shopping-list.completed-on", {
              date: listItem.updatedAt ? i18n.d(new Date(listItem.updatedAt)) : "",
            })}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default ShoppingListItem;
