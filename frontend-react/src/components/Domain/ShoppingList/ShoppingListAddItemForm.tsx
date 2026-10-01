import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Paper from "@mui/material/Paper";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { InputLabelType } from "~/components/global/InputLabelType";
import type { InputLabelTypeHandle } from "~/components/global/InputLabelType";
import { useI18n } from "~/hooks/use-global-i18n";
import { applyItemEdit, useShoppingListItemEditor } from "~/hooks/shopping-list-page/use-shopping-list-item-editor";
import type { ShoppingListItemOut } from "~/lib/api/types/household";
import type { MultiPurposeLabelOut } from "~/lib/api/types/labels";
import type { IngredientFood, IngredientUnit } from "~/lib/api/types/recipe";
import { icons } from "~/lib/icons";
import { useModelRef } from "~/lib/observable";
import { ShoppingListItemDetails } from "./ShoppingListItemDetails";

export interface ShoppingListAddItemFormProps {
  value: ShoppingListItemOut;
  onChange: (value: ShoppingListItemOut) => void;
  labels: MultiPurposeLabelOut[];
  units: IngredientUnit[];
  foods: IngredientFood[];
  onSave?: () => void;
  onCancel?: () => void;
}

/**
 * The phone layout's "add item" form: a bottom sheet that rests collapsed (a "rail" showing just
 * the food search) and expands to the full editor when tapped.
 */
export function ShoppingListAddItemForm({ value: listItem, onChange, labels, units, foods, onSave, onCancel }: ShoppingListAddItemFormProps) {
  const i18n = useI18n();
  const edit = (next: ShoppingListItemOut) => onChange(applyItemEdit(listItem, next));
  const model = useModelRef(listItem, (next, prev) => onChange(applyItemEdit(prev, next)));
  const { createAssignFood } = useShoppingListItemEditor(model);

  const foodInputRef = useRef<InputLabelTypeHandle>(null);
  const [rail, setRail] = useState(true);

  function expandAndFocus() {
    setRail(false);
    setTimeout(() => foodInputRef.current?.focus(), 200);
  }

  return (
    // Autocomplete menus are portalled outside the sheet, but React events still bubble through
    // the portal, so picking an option doesn't count as a click away and collapse the form.
    <ClickAwayListener onClickAway={() => setRail(true)}>
      <Paper
        elevation={4}
        sx={{
          position: "fixed",
          insetInline: 0,
          bottom: 0,
          zIndex: theme => theme.zIndex.appBar - 1,
          height: rail ? 85 : 300,
          overflowY: "auto",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          p: 2,
          pt: 1,
          transition: "height 0.2s ease",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ position: "relative", flex: 1 }}>
              <InputLabelType
                ref={foodInputRef}
                value={listItem.food}
                onChange={food => edit({ ...listItem, food: food ?? undefined, foodId: food?.id ?? undefined })}
                items={foods}
                label={rail ? i18n.t("shopping-list.add-item") : i18n.t("shopping-list.food")}
                icon={icons.foods}
                sx={rail ? { marginInline: "3px" } : undefined}
                search={rail}
                create
                onCreate={val => void createAssignFood(val)}
              />
              {/* Intercept clicks when collapsed so the sheet expands before the autocomplete opens */}
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
                  { icon: icons.close, text: i18n.t("general.cancel"), event: "cancel" },
                  { icon: icons.save, text: i18n.t("general.save"), event: "save" },
                ]}
                onEvent={(event) => {
                  if (event === "save") {
                    onSave?.();
                  }
                  else {
                    setRail(true);
                    onCancel?.();
                  }
                }}
              />
            )}
          </Box>

          {!rail && (
            <ShoppingListItemDetails value={listItem} onChange={edit} labels={labels} units={units} onSave={onSave} />
          )}
        </Box>
      </Paper>
    </ClickAwayListener>
  );
}

export default ShoppingListAddItemForm;
