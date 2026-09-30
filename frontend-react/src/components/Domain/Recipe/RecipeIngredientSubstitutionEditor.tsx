import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { icons } from "~/lib/icons";
import type { IngredientFood } from "~/lib/api/types/recipe";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { normalizeFilter } from "~/hooks/use-utils";
import { Icon } from "~/components/global/Icon";
import { AutocompleteInput, TextInput } from "~/components/global/form";

/** The shape both substitution tiers share. Callers own the rows and add/remove them. */
export interface EditableSubstitution {
  substituteFoodId?: string | null;
  note?: string | null;
}

export interface RecipeIngredientSubstitutionEditorProps<S extends EditableSubstitution> {
  substitutions: S[];
  foods: IngredientFood[];
  /** A row was edited in place. */
  onChangeRow: (index: number, row: S) => void;
  onAdd?: () => void;
  onDelete?: (index: number) => void;
  onFoodChanged?: (index: number) => void;
  /** Extra content under each row (the Vue `#after-row` slot). */
  afterRow?: (substitution: S, index: number) => ReactNode;
}

export function RecipeIngredientSubstitutionEditor<S extends EditableSubstitution>({ substitutions, foods, onChangeRow, onAdd, onDelete, onFoodChanged, afterRow }: RecipeIngredientSubstitutionEditorProps<S>) {
  const i18n = useI18n();
  const display = useDisplay();
  return (
    <div>
      {substitutions.map((substitution, i) => (
        <Box key={i} sx={{ mb: 1 }}>
          {/* wraps rather than stacking: on a narrow screen the food takes its own line and the note keeps the delete button company */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Box sx={{ flex: display.mdAndDown ? "1 1 100%" : "6 0 50px" }}>
              <AutocompleteInput<IngredientFood>
                value={substitution.substituteFoodId ?? null}
                onChange={(id: string | null) => {
                  onChangeRow(i, { ...substitution, substituteFoodId: id });
                  onFoodChanged?.(i);
                }}
                items={foods}
                customFilter={(title, query) => normalizeFilter(title, query)}
                itemValue="id"
                itemTitle="name"
                placeholder={i18n.t("recipe.choose-substitute-food")}
                variant="filled"
                clearable
                hideDetails
              />
            </Box>
            <Box sx={{ flex: display.mdAndDown ? "1 1 0" : "4 0 50px" }}>
              <TextInput value={substitution.note ?? ""} onChange={note => onChangeRow(i, { ...substitution, note })} placeholder={i18n.t("recipe.note")} variant="filled" hideDetails />
            </Box>
            <IconButton title={i18n.t("general.delete")} onClick={() => onDelete?.(i)}>
              <Icon path={icons.delete} />
            </IconButton>
          </Box>
          {afterRow?.(substitution, i)}
        </Box>
      ))}
      <Button variant="text" color="primary" onClick={() => onAdd?.()} startIcon={<Icon path={icons.create} />}>
        {i18n.t("general.add")}
      </Button>
    </div>
  );
}

export default RecipeIngredientSubstitutionEditor;
