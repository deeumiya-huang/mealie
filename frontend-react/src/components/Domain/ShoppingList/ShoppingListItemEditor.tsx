import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import type { SxProps, Theme } from "@mui/material/styles";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { InputLabelType } from "~/components/global/InputLabelType";
import { useI18n } from "~/hooks/use-global-i18n";
import { applyItemEdit, useShoppingListItemEditor } from "~/hooks/shopping-list-page/use-shopping-list-item-editor";
import type { ShoppingListItemOut } from "~/lib/api/types/household";
import type { MultiPurposeLabelOut } from "~/lib/api/types/labels";
import type { IngredientFood, IngredientUnit } from "~/lib/api/types/recipe";
import { icons } from "~/lib/icons";
import { useModelRef } from "~/lib/observable";
import { ShoppingListItemDetails } from "./ShoppingListItemDetails";

export interface ShoppingListItemEditorProps {
  value: ShoppingListItemOut;
  onChange: (value: ShoppingListItemOut) => void;
  labels: MultiPurposeLabelOut[];
  units: IngredientUnit[];
  foods: IngredientFood[];
  allowDelete?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  sx?: SxProps<Theme>;
}

export function ShoppingListItemEditor({ value: listItem, onChange, labels, units, foods, allowDelete = true, onSave, onCancel, onDelete, sx }: ShoppingListItemEditorProps) {
  const i18n = useI18n();
  const edit = (next: ShoppingListItemOut) => onChange(applyItemEdit(listItem, next));
  const model = useModelRef(listItem, (next, prev) => onChange(applyItemEdit(prev, next)));
  const { createAssignFood } = useShoppingListItemEditor(model);

  const autoFocus = !listItem.food && listItem.note ? "note" : "food";

  return (
    <Paper
      elevation={3}
      sx={[{ p: 1, borderInlineStart: 4, borderInlineStartStyle: "solid", borderColor: "primary.main" }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <InputLabelType
          value={listItem.food}
          onChange={food => edit({ ...listItem, food: food ?? undefined, foodId: food?.id ?? undefined })}
          items={foods}
          label={i18n.t("shopping-list.food")}
          icon={icons.foods}
          autoFocus={autoFocus === "food"}
          create
          onCreate={val => void createAssignFood(val)}
        />
        <ShoppingListItemDetails value={listItem} onChange={edit} labels={labels} units={units} onSave={onSave} />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <BaseButtonGroup
          buttons={[
            ...(allowDelete ? [{ icon: icons.delete, text: i18n.t("general.delete"), event: "delete" }] : []),
            { icon: icons.close, text: i18n.t("general.cancel"), event: "cancel" },
            { icon: icons.save, text: i18n.t("general.save"), event: "save" },
          ]}
          onEvent={(event) => {
            if (event === "save") onSave?.();
            else if (event === "cancel") onCancel?.();
            else if (event === "delete") onDelete?.();
          }}
        />
      </Box>
    </Paper>
  );
}

export default ShoppingListItemEditor;
