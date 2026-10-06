// Usage: <RecipeIngredientSubstitutionEditor substitutions={rows} foods={foods} onAdd={…} onDelete={i => …}
//   onChange={(i, patch) => …} onFoodChanged={i => …} renderAfterRow={(row, i) => …} />
// Rows of "substitute food + note" with a delete button each and an add button. The rows are owned by the caller
// (Vue mutated them in place; here every edit is reported through `onChange(index, patch)` and the caller
// stores it), because the caller alone knows what a new row contains and what it tracks beside each one.
import type { ReactNode } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { MdiIcon } from "@/components/global/MdiIcon";
import { normalizeFilter } from "@/hooks/use-utils";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { IngredientFood } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

/**
 * The shape both tiers share. Callers hold richer rows of their own -- the food dialog tracks a
 * reverse-substitution choice alongside each one.
 */
export interface EditableSubstitution {
  substituteFoodId?: string | null;
  note?: string | null;
}

interface RecipeIngredientSubstitutionEditorProps<T extends EditableSubstitution> {
  substitutions: T[];
  foods: IngredientFood[];
  // left unset inside a dialog, so the menu stays in the dialog's overlay stack rather than being
  // attached to another element and risking a render behind the dialog
  menuAttachTarget?: string;
  /** Vue `#after-row` slot. */
  renderAfterRow?: (substitution: T, index: number) => ReactNode;
  onAdd?: () => void;
  onDelete?: (index: number) => void;
  /** Reports an edit of row `index`; the caller applies it to its own row. */
  onChange?: (index: number, patch: Partial<EditableSubstitution>) => void;
  onFoodChanged?: (index: number) => void;
}

export function RecipeIngredientSubstitutionEditor<T extends EditableSubstitution>({
  substitutions,
  foods,
  menuAttachTarget,
  renderAfterRow,
  onAdd,
  onDelete,
  onChange,
  onFoodChanged,
}: RecipeIngredientSubstitutionEditorProps<T>) {
  const { t } = useI18n();
  const { mdAndDown } = useDisplay();

  const container = menuAttachTarget ? document.querySelector<HTMLElement>(menuAttachTarget) : null;

  return (
    <Box>
      {substitutions.map((substitution, i) => (
        <Box key={i} sx={{ mb: 1 }}>
          {/* wraps rather than stacking: on a narrow screen the food takes its own line and the
              note keeps the delete button company, instead of stranding it on a line of its own */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Autocomplete<IngredientFood>
              options={foods}
              value={foods.find(food => food.id === substitution.substituteFoodId) ?? null}
              getOptionLabel={food => food.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options, { inputValue }) => options.filter(food => normalizeFilter(food.name, inputValue))}
              onChange={(_event, food) => {
                onChange?.(i, { substituteFoodId: food?.id ?? null });
                onFoodChanged?.(i);
              }}
              size="small"
              slotProps={{
                listbox: { sx: { maxHeight: 250 } },
                ...(container ? { popper: { container } } : {}),
              }}
              sx={{ flex: mdAndDown ? "1 1 100%" : "6 0 50px" }}
              renderInput={params => (
                <TextField
                  {...params}
                  variant="filled"
                  hiddenLabel
                  placeholder={t("recipe.choose-substitute-food")}
                />
              )}
            />
            <TextField
              value={substitution.note ?? ""}
              onChange={event => onChange?.(i, { note: event.target.value })}
              placeholder={t("recipe.note")}
              variant="filled"
              size="small"
              hiddenLabel
              sx={{ flex: mdAndDown ? "1 1 0" : "4 0 50px" }}
            />
            {/* left at the default size: an icon button is a 36px touch target everywhere else in
                the app, and the smaller sizes fall under the 24px accessible minimum */}
            <IconButton title={t("general.delete")} aria-label={t("general.delete")} onClick={() => onDelete?.(i)}>
              <MdiIcon path={icons.delete} />
            </IconButton>
          </Box>
          {renderAfterRow?.(substitution, i)}
        </Box>
      ))}
      <Button variant="text" color="primary" startIcon={<MdiIcon path={icons.create} />} onClick={() => onAdd?.()}>
        {t("general.add")}
      </Button>
    </Box>
  );
}
