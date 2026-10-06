// Usage: <ShoppingListAddItemForm listItem={ref} labels={labels} units={units} foods={foods} onSave={…} onCancel={…} />
// The "add item" drawer of small screens: a bottom sheet that is collapsed to one "Add item" field (the `rail`) and
// expands to the full item form when the field is pressed; pressing outside collapses it again. `listItem` is the new
// item as a `StateRef` (the Vue `v-model`); `sx` is the Vue `class`.
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import type { SxProps, Theme } from "@mui/material/styles";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { InputLabelType, type InputLabelTypeHandle } from "@/components/global/InputLabelType";
import type { StateRef } from "@/hooks/shopping-list-page/state-ref";
import { useShoppingListItemEditor } from "@/hooks/shopping-list-page/use-shopping-list-item-editor";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { ShoppingListItemOut } from "@/lib/api/types/household";
import type { MultiPurposeLabelOut } from "@/lib/api/types/labels";
import type { IngredientFood, IngredientUnit } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { ShoppingListItemDetails } from "./ShoppingListItemDetails";
import { patchItem, useListItemWatchers } from "./use-item-watchers";

interface ShoppingListAddItemFormProps {
  listItem: StateRef<ShoppingListItemOut>;
  labels: MultiPurposeLabelOut[];
  units: IngredientUnit[];
  foods: IngredientFood[];
  sx?: SxProps<Theme>;
  onSave?: () => void;
  onCancel?: () => void;
}

export function ShoppingListAddItemForm({ listItem, labels, units, foods, sx, onSave, onCancel }: ShoppingListAddItemFormProps) {
  const { t } = useI18n();
  const { createAssignFood } = useShoppingListItemEditor(listItem);
  useListItemWatchers(listItem);

  const { smAndDown } = useDisplay();
  const menuLocation = smAndDown ? "top" : "bottom";

  const foodInputRef = useRef<InputLabelTypeHandle>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const [rail, setRail] = useState(true);
  // the drawer is fixed to the bottom of the screen, so the page keeps room for it (a Vuetify layout item)
  const [drawerHeight, setDrawerHeight] = useState(0);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => setDrawerHeight(target.offsetHeight));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Autocomplete menus are rendered outside the drawer, so selecting an item
  // would otherwise register as an outside click and collapse the form
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element) || targetRef.current?.contains(target)) {
        return;
      }
      if (target.closest(".MuiPopper-root, .MuiPopover-root, .MuiModal-root")) {
        return;
      }
      setRail(true);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function expandAndFocus() {
    setRail(false);
    setTimeout(() => {
      foodInputRef.current?.focus();
    }, 200);
  }

  function onAction(event: string) {
    if (event === "save") {
      onSave?.();
    }
    else if (event === "cancel") {
      setRail(true);
      onCancel?.();
    }
  }

  const item = listItem.value;

  return (
    <>
      <Box aria-hidden sx={{ height: drawerHeight }} />
      <Paper
        ref={targetRef}
        elevation={4}
        sx={[
          {
            position: "fixed",
            insetInline: 0,
            bottom: 0,
            zIndex: theme => theme.zIndex.appBar,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            p: 2,
            pt: 1,
            mb: 0,
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", p: 0 }}>
            <Box sx={{ position: "relative", flex: 1 }}>
              <InputLabelType
                ref={foodInputRef}
                value={item.food}
                onChange={food => patchItem(listItem, { food: food as IngredientFood | null })}
                itemId={item.foodId}
                onItemIdChange={foodId => patchItem(listItem, { foodId })}
                items={foods}
                label={rail ? t("shopping-list.add-item") : t("shopping-list.food")}
                icon={icons.foods}
                sx={rail ? { mx: "3px" } : undefined}
                search={rail}
                menuLocation={menuLocation}
                create
                onCreate={name => void createAssignFood(name)}
              />
              {/* Intercept clicks when collapsed so the drawer expands before the autocomplete opens */}
              {rail && (
                <Box
                  sx={{ position: "absolute", inset: 0, cursor: "text" }}
                  onClick={expandAndFocus}
                />
              )}
            </Box>
            {!rail && (
              <BaseButtonGroup
                buttons={[
                  {
                    icon: icons.close,
                    text: t("general.cancel"),
                    event: "cancel",
                  },
                  {
                    icon: icons.save,
                    text: t("general.save"),
                    event: "save",
                  },
                ]}
                onAction={onAction}
              />
            )}
          </Box>

          {!rail && (
            <ShoppingListItemDetails listItem={listItem} labels={labels} units={units} onSave={onSave} />
          )}
        </Box>
      </Paper>
    </>
  );
}
