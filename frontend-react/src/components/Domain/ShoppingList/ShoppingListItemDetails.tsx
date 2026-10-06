// Usage: <ShoppingListItemDetails listItem={ref} labels={labels} units={units} onSave={save} /> — the quantity / unit /
// note / label fields shared by the item editor and the "add item" drawer. `listItem` is the edited item as a
// `StateRef` (the Vue `v-model`): the fields change it in place and notify (`patchItem`).
import { useState, type KeyboardEvent } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseNumberInput } from "@/components/global/BaseNumberInput";
import { InputLabelType } from "@/components/global/InputLabelType";
import { MdiIcon } from "@/components/global/MdiIcon";
import type { StateRef } from "@/hooks/shopping-list-page/state-ref";
import { useShoppingListItemEditor } from "@/hooks/shopping-list-page/use-shopping-list-item-editor";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { ShoppingListItemOut } from "@/lib/api/types/household";
import type { MultiPurposeLabelOut } from "@/lib/api/types/labels";
import type { IngredientUnit } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { patchItem } from "./use-item-watchers";

interface ShoppingListItemDetailsProps {
  listItem: StateRef<ShoppingListItemOut>;
  labels: MultiPurposeLabelOut[];
  units: IngredientUnit[];
  onSave?: () => void;
}

export function ShoppingListItemDetails({ listItem, labels, units, onSave }: ShoppingListItemDetailsProps) {
  const { t } = useI18n();
  const { assignLabelToFood, createAssignUnit } = useShoppingListItemEditor(listItem);
  const { smAndDown } = useDisplay();
  const menuLocation = smAndDown ? "top" : "bottom";

  const item = listItem.value;
  // the clear button of the note field shows while the field has the focus
  const [noteFocused, setNoteFocused] = useState(false);

  function handleNoteKeyPress(event: KeyboardEvent) {
    // Save on Enter
    if (!event.shiftKey && event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSave?.();
    }
  }

  return (
    <>
      <Box sx={{ display: "flex", gap: 1.5 }}>
        <BaseNumberInput
          value={item.quantity}
          onChange={quantity => patchItem(listItem, { quantity: quantity ?? undefined })}
          hideDetails
          label={t("form.quantity-label-abbreviated")}
          min={0}
          precision={null}
          inset
          sx={{ flex: 5 }}
        />
        <InputLabelType
          value={item.unit}
          onChange={unit => patchItem(listItem, { unit: unit as IngredientUnit | null })}
          itemId={item.unitId}
          onItemIdChange={unitId => patchItem(listItem, { unitId })}
          items={units}
          label={t("recipe.unit")}
          icon={icons.units}
          menuLocation={menuLocation}
          sx={{ flex: 7 }}
          create
          onCreate={name => void createAssignUnit(name)}
        />
      </Box>
      <TextField
        value={item.note ?? ""}
        onChange={event => patchItem(listItem, { note: event.target.value })}
        onKeyDown={handleNoteKeyPress}
        onFocus={() => setNoteFocused(true)}
        onBlur={() => setNoteFocused(false)}
        label={t("shopping-list.note")}
        multiline
        minRows={1}
        fullWidth
        slotProps={{
          htmlInput: { autoCapitalize: "none" },
          input: {
            endAdornment: item.note && noteFocused
              ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label={t("general.clear")}
                      // keep the focus in the field (and the clear button) while it is pressed
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => patchItem(listItem, { note: null })}
                    >
                      <MdiIcon path={icons.close} size="small" />
                    </IconButton>
                  </InputAdornment>
                )
              : undefined,
          },
        }}
      />
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 1.5 }}>
        <InputLabelType
          value={item.label}
          onChange={label => patchItem(listItem, { label: label as ShoppingListItemOut["label"] })}
          itemId={item.labelId}
          onItemIdChange={labelId => patchItem(listItem, { labelId })}
          items={labels}
          label={t("shopping-list.label")}
          menuLocation={menuLocation}
          sx={{ flex: "1 0 200px" }}
        />
        {item.labelId && item.food && item.labelId !== item.food.labelId && (
          <BaseButton
            small
            color="info"
            icon={icons.tagArrowRight}
            text={t("shopping-list.save-label")}
            sx={{ mt: 1, flexGrow: 0 }}
            onClick={() => void assignLabelToFood()}
          />
        )}
        <Box sx={{ flexGrow: 1 }} />
      </Box>
    </>
  );
}
