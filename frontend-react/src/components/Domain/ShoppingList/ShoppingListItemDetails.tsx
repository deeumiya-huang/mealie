import Box from "@mui/material/Box";
import { BaseButton } from "~/components/global/BaseButton";
import { InputLabelType } from "~/components/global/InputLabelType";
import { NumberInput, TextInput } from "~/components/global/form";
import { useI18n } from "~/hooks/use-global-i18n";
import { useShoppingListItemEditor } from "~/hooks/shopping-list-page/use-shopping-list-item-editor";
import type { ShoppingListItemOut } from "~/lib/api/types/household";
import type { MultiPurposeLabelOut } from "~/lib/api/types/labels";
import type { IngredientUnit } from "~/lib/api/types/recipe";
import { icons } from "~/lib/icons";
import { useModelRef } from "~/lib/observable";

export interface ShoppingListItemDetailsProps {
  value: ShoppingListItemOut;
  onChange: (value: ShoppingListItemOut) => void;
  labels: MultiPurposeLabelOut[];
  units: IngredientUnit[];
  onSave?: () => void;
}

/** Quantity, unit, note and label fields shared by the item editor and the add-item form. */
export function ShoppingListItemDetails({ value: listItem, onChange, labels, units, onSave }: ShoppingListItemDetailsProps) {
  const i18n = useI18n();
  const model = useModelRef(listItem, onChange);
  const { assignLabelToFood, createAssignUnit } = useShoppingListItemEditor(model);

  const update = (patch: Partial<ShoppingListItemOut>) => onChange({ ...listItem, ...patch });

  return (
    <>
      <Box sx={{ display: "flex", gap: 1.5 }}>
        <NumberInput
          value={listItem.quantity}
          onChange={quantity => update({ quantity: quantity ?? undefined })}
          hideDetails
          label={i18n.t("form.quantity-label-abbreviated")}
          min={0}
          precision={null}
          sx={{ flex: 5 }}
        />
        <InputLabelType
          value={listItem.unit}
          onChange={unit => update({ unit: unit ?? undefined, unitId: unit?.id ?? undefined })}
          items={units}
          label={i18n.t("recipe.unit")}
          icon={icons.units}
          sx={{ flex: 7 }}
          create
          onCreate={val => void createAssignUnit(val)}
        />
      </Box>
      <TextInput
        value={listItem.note}
        onChange={note => update({ note })}
        clearable
        hideDetails
        label={i18n.t("shopping-list.note")}
        multiline
        rows={1}
        autoGrow
        inputProps={{ autoCapitalize: "none" }}
        onKeyDown={(event) => {
          // Save on Enter
          if (!event.shiftKey && event.key === "Enter") {
            event.preventDefault();
            onSave?.();
          }
        }}
      />
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 1.5 }}>
        <InputLabelType
          value={listItem.label}
          onChange={label => update({ label, labelId: label?.id ?? null })}
          items={labels}
          label={i18n.t("shopping-list.label")}
          sx={{ flex: "1 0 200px" }}
        />
        {listItem.labelId && listItem.food && listItem.labelId !== listItem.food.labelId && (
          <BaseButton
            small
            color="info"
            icon={icons.tagArrowRight}
            text={i18n.t("shopping-list.save-label")}
            sx={{ mt: 1, flexGrow: 0 }}
            onClick={() => void assignLabelToFood()}
          />
        )}
      </Box>
    </>
  );
}

export default ShoppingListItemDetails;
