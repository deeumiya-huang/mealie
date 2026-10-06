// Usage: <ShoppingListItemEditor listItem={ref} labels={labels} units={units} foods={foods} allowDelete
//          onSave={…} onCancel={…} onDelete={…} /> — the card that edits one shopping list item (food, quantity, unit,
// note, label) with delete / cancel / save buttons. `listItem` is the edited item as a `StateRef` (the Vue `v-model`);
// `sx` is the Vue `class`.
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import type { SxProps, Theme } from "@mui/material/styles";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { InputLabelType } from "@/components/global/InputLabelType";
import type { StateRef } from "@/hooks/shopping-list-page/state-ref";
import { useShoppingListItemEditor } from "@/hooks/shopping-list-page/use-shopping-list-item-editor";
import { useI18n } from "@/i18n";
import type { ShoppingListItemOut } from "@/lib/api/types/household";
import type { MultiPurposeLabelOut } from "@/lib/api/types/labels";
import type { IngredientFood, IngredientUnit } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { ShoppingListItemDetails } from "./ShoppingListItemDetails";
import { patchItem, useListItemWatchers } from "./use-item-watchers";

interface ShoppingListItemEditorProps {
  listItem: StateRef<ShoppingListItemOut>;
  labels: MultiPurposeLabelOut[];
  units: IngredientUnit[];
  foods: IngredientFood[];
  allowDelete?: boolean;
  sx?: SxProps<Theme>;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

export function ShoppingListItemEditor({
  listItem,
  labels,
  units,
  foods,
  allowDelete = true,
  sx,
  onSave,
  onCancel,
  onDelete,
}: ShoppingListItemEditorProps) {
  const { t } = useI18n();
  const { createAssignFood } = useShoppingListItemEditor(listItem);
  useListItemWatchers(listItem);

  const item = listItem.value;
  const autoFocus = !item.food && item.note ? "note" : "food";

  function onAction(event: string) {
    if (event === "save") onSave?.();
    else if (event === "cancel") onCancel?.();
    else if (event === "delete") onDelete?.();
  }

  return (
    <Card
      variant="elevation"
      sx={[{ p: 1, borderLeft: "4px solid", borderLeftColor: "primary.main" }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <InputLabelType
          value={item.food}
          onChange={food => patchItem(listItem, { food: food as IngredientFood | null })}
          itemId={item.foodId}
          onItemIdChange={foodId => patchItem(listItem, { foodId })}
          items={foods}
          label={t("shopping-list.food")}
          icon={icons.foods}
          autoFocus={autoFocus === "food"}
          create
          onCreate={name => void createAssignFood(name)}
        />
        <ShoppingListItemDetails listItem={listItem} labels={labels} units={units} onSave={onSave} />
      </Box>
      <CardActions sx={{ justifyContent: "flex-end", p: 0 }}>
        <BaseButtonGroup
          buttons={[
            ...(allowDelete
              ? [
                  {
                    icon: icons.delete,
                    text: t("general.delete"),
                    event: "delete",
                  },
                ]
              : []),
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
      </CardActions>
    </Card>
  );
}
