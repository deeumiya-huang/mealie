// Usage: <ShoppingListItem item={item} onChange={replaceItem} labels={labels} units={units} foods={foods}
//          recipes={recipeMap} edit={editing} onChecked={…} onSave={…} onDelete={…} onEdit={…} onView={…} />
// One row of a shopping list: checkbox, the ingredient text, and (while unchecked) the recipe toggle, edit button and the
// drag handle that opens the edit / delete menu; swiping a row to the right checks it. With `edit` the row is the
// `ShoppingListItemEditor` instead. Vue `v-model` → `item` + `onChange(item)` (the checkbox replaces the item with a
// checked copy); the emitted events are `onChecked` / `onSave` (with the item), `onDelete` / `onEdit` / `onView`.
import { useEffect, useRef, useState, type TouchEvent } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import type { SxProps, Theme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { MdiIcon } from "@/components/global/MdiIcon";
import { RecipeList } from "@/components/Domain/Recipe/RecipeList";
import { useStateRef } from "@/hooks/shopping-list-page/state-ref";
import { useOnline } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { ShoppingListItemOut } from "@/lib/api/types/household";
import type { MultiPurposeLabelOut } from "@/lib/api/types/labels";
import type { IngredientFood, IngredientUnit, RecipeSummary } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeIngredientListItem } from "../Recipe/RecipeIngredientListItem";
import { ShoppingListItemEditor } from "./ShoppingListItemEditor";

interface ShoppingListItemProps {
  item: ShoppingListItemOut;
  onChange?: (item: ShoppingListItemOut) => void;
  labels: MultiPurposeLabelOut[];
  units: IngredientUnit[];
  foods: IngredientFood[];
  recipes?: Map<string, RecipeSummary>;
  edit?: boolean;
  sx?: SxProps<Theme>;
  onChecked?: (item: ShoppingListItemOut) => void;
  onSave?: (item: ShoppingListItemOut) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onView?: () => void;
}

const SWIPE_THRESHOLD = 50;

type SwipeGesture = null | "scroll" | "swipe";

interface SwipeInfo {
  touchstartX: number;
  touchstartY: number;
  touchendX: number;
  touchendY: number;
  gesture: SwipeGesture;
}

const NO_SWIPE: SwipeInfo = { touchstartX: 0, touchstartY: 0, touchendX: 0, touchendY: 0, gesture: null };

function getSwipePoint(event: TouchEvent) {
  const touch = event.touches[0] ?? event.changedTouches[0];
  return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
}

// The Vue app never mirrored its layout for right-to-left locales (see D32), so swipes always go to the right.
const isRtl = false;

export function ShoppingListItem({
  item,
  onChange,
  labels,
  units,
  foods,
  recipes,
  edit = false,
  sx,
  onChecked,
  onSave,
  onDelete,
  onEdit,
  onView,
}: ShoppingListItemProps) {
  const { t, d } = useI18n();
  const online = useOnline();
  const isOffline = online === false;

  const [displayRecipeRefs, setDisplayRecipeRefs] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // copy of the item so a refresh doesn't interrupt the user
  const localListItem = useStateRef<ShoppingListItemOut>(() => ({ ...item }));

  const contextMenu = [
    { text: t("general.edit"), event: "edit" },
    { text: t("general.delete"), event: "delete" },
  ];

  function onMenuAction(event: string) {
    setMenuAnchor(null);
    if (event === "edit") onEdit?.();
    else if (event === "delete") onDelete?.();
  }

  function toggleChecked() {
    const updated = { ...item, checked: !item.checked } as ShoppingListItemOut;
    onChange?.(updated);
    onChecked?.(updated);
  }

  function save() {
    onSave?.(localListItem.value);
  }

  // ---- swiping a row to the right checks it
  const [swipeInfo, setSwipeInfo] = useState<SwipeInfo>(NO_SWIPE);
  const swipeRowRef = useRef<HTMLDivElement>(null);
  const swipeGesture = useRef<SwipeGesture>(null);

  useEffect(() => {
    swipeGesture.current = swipeInfo.gesture;
  }, [swipeInfo.gesture]);

  // React registers touch listeners as passive, which cannot stop the page from scrolling during a swipe
  useEffect(() => {
    const el = swipeRowRef.current;
    if (!el) return;
    function onTouchMove(event: globalThis.TouchEvent) {
      if (swipeGesture.current === "swipe") {
        event.preventDefault();
      }
    }
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [edit]);

  const swiping = (() => {
    if (swipeInfo.gesture !== "swipe") {
      return 0;
    }
    const deltaX = isRtl
      ? swipeInfo.touchstartX - swipeInfo.touchendX
      : swipeInfo.touchendX - swipeInfo.touchstartX;
    return Math.max(0, Math.min(deltaX, 100));
  })();

  function onSwipeStart(event: TouchEvent) {
    const { x, y } = getSwipePoint(event);
    setSwipeInfo({ touchstartX: x, touchstartY: y, touchendX: x, touchendY: y, gesture: null });
  }

  function onSwipeMove(event: TouchEvent) {
    const { x, y } = getSwipePoint(event);
    setSwipeInfo((info) => {
      const next = { ...info, touchendX: x, touchendY: y };
      if (!next.gesture) {
        const deltaX = Math.abs(x - next.touchstartX);
        const deltaY = Math.abs(y - next.touchstartY);
        if (deltaY > 8 && deltaY > deltaX) {
          next.gesture = "scroll";
        }
        else if (deltaX > 8 && deltaX > deltaY) {
          next.gesture = "swipe";
        }
        else if (deltaX > 8 || deltaY > 8) {
          // Diagonal / ambiguous — default to scroll
          next.gesture = "scroll";
        }
      }
      return next;
    });
  }

  function onSwipeEnd() {
    if (swipeInfo.gesture === "swipe" && swiping >= SWIPE_THRESHOLD) {
      toggleChecked();
    }
    setSwipeInfo(NO_SWIPE);
  }

  const recipeList: RecipeSummary[] = [];
  item.recipeReferences?.forEach((recipeReference) => {
    const recipe = recipes?.get(recipeReference.recipeId);
    if (recipe) recipeList.push(recipe);
  });

  return (
    <Box sx={[{ overflowX: "hidden" }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {!edit && (
        <Box
          sx={{
            ml: 1,
            p: 0,
            transform: `translateX(${isRtl ? -swiping : swiping}px)`,
            transition: swiping === 0 ? "transform 0.2s ease" : "none",
            opacity: swiping >= SWIPE_THRESHOLD ? 0.5 : 1,
          }}
        >
          <Box
            ref={swipeRowRef}
            sx={{ display: "flex", flexWrap: "nowrap", alignItems: "center", touchAction: "pan-y" }}
            onTouchStart={onSwipeStart}
            onTouchMove={onSwipeMove}
            onTouchEnd={onSwipeEnd}
          >
            {/* the text takes every pixel the action buttons don't, so a long name only wraps
                once the row is genuinely full rather than at an arbitrary half-way point */}
            <Box sx={{ flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "nowrap" }}>
                <Checkbox
                  checked={!!item.checked}
                  onChange={toggleChecked}
                  size="small"
                  color="default"
                  sx={{ mt: 0, flexShrink: 0, p: 0.5 }}
                />
                <Box
                  className="shopping-list-item__text"
                  sx={{
                    "ml": 1,
                    "minWidth": 0,
                    // truncated text of Vuetify's `text-truncate`
                    "overflow": "hidden",
                    "textOverflow": "ellipsis",
                    "textDecoration": item.checked ? "line-through" : undefined,
                    // The text box must take the whole column, not shrink to its content: the "half the row" rule
                    // below is measured against this box, and a content-sized box would make "1 pound butter"
                    // wrap because "1 pound" alone is more than half of it.
                    "flex": "1 1 auto",
                    // The ingredient text is a wrapping flex row (quantity, unit, name, note). Left alone, a long
                    // name is one unbreakable flex item, so it jumps to a new line and leaves the quantity sitting
                    // on a line of its own. Let the name shrink and wrap in place instead, unless less than half
                    // the row is left for it. The note keeps its own full-width line. When it does wrap, the
                    // quantity and unit stay on its first line instead of floating half-way down the block.
                    "& .ingredient-item": { alignItems: "baseline" },
                    "& .ingredient-item > .text-bold": { flex: "1 1 0", minWidth: "50%" },
                  }}
                >
                  <RecipeIngredientListItem ingredient={item} />
                </Box>
              </Box>
            </Box>
            <Box sx={{ flexShrink: 0, textAlign: "right" }}>
              {!item.checked && (
                <Box sx={{ minWidth: 72 }}>
                  {recipeList.length > 0 && (
                    <Tooltip title="Toggle Recipes" placement="right" enterDelay={200} slotProps={{ tooltip: { sx: { fontSize: "0.75rem" } } }}>
                      <IconButton
                        size="small"
                        sx={{ ml: 1 }}
                        onClick={() => setDisplayRecipeRefs(!displayRecipeRefs)}
                      >
                        <MdiIcon path={icons.silverwareForkKnife} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <IconButton size="small" sx={{ ml: 1 }} onClick={() => onEdit?.()}>
                    <MdiIcon path={icons.edit} />
                  </IconButton>
                  <IconButton
                    size="small"
                    className="handle"
                    sx={{ cursor: "grab" }}
                    onClick={event => setMenuAnchor(event.currentTarget)}
                  >
                    <MdiIcon path={icons.arrowUpDown} />
                  </IconButton>
                  <Menu
                    anchorEl={menuAnchor}
                    open={menuAnchor !== null}
                    onClose={() => setMenuAnchor(null)}
                    slotProps={{ paper: { sx: { minWidth: 125 } } }}
                    anchorOrigin={{ vertical: "center", horizontal: "left" }}
                    transformOrigin={{ vertical: "center", horizontal: "right" }}
                    disableScrollLock
                  >
                    {contextMenu.map(action => (
                      <MenuItem key={action.event} dense onClick={() => onMenuAction(action.event)}>
                        {action.text}
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
              )}
            </Box>
          </Box>
          {!item.checked && recipeList.length > 0 && displayRecipeRefs && (
            <Box sx={{ p: 0 }}>
              <RecipeList
                recipes={recipeList}
                listItem={item}
                disabled={isOffline}
                tile
              />
            </Box>
          )}
          {item.checked && (
            <Box sx={{ display: "flex", mb: 1 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 300, fontStyle: "italic" }}
              >
                {t("shopping-list.completed-on", {
                  date: item.updatedAt ? d(new Date(item.updatedAt)) : "",
                })}
              </Typography>
            </Box>
          )}
        </Box>
      )}
      {edit && (
        <Box sx={{ mb: 2 }}>
          <ShoppingListItemEditor
            listItem={localListItem}
            labels={labels}
            units={units}
            foods={foods}
            sx={{ m: 1 }}
            onSave={save}
            onCancel={onView}
            onDelete={onDelete}
          />
        </Box>
      )}
    </Box>
  );
}
