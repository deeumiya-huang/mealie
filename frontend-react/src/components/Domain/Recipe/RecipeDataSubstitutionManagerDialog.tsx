// Usage: <RecipeDataSubstitutionManagerDialog open={open} onOpenChange={setOpen} data={food}
//          onSubmit={(substitutions, reverseChanges) => …} onCancel={() => setOpen(false)} />
// Dialog to edit the substitutions of a food, with a per-row choice to also add (or remove) the reverse substitution
// on the other food. Vue `v-model` → `open` + `onOpenChange`; `@submit`/`@cancel` → `onSubmit`/`onCancel`. The rows are
// a local copy that is re-read from `data` each time the dialog opens; `data` itself is never changed.
import { useState } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { BaseDialog } from "@/components/global/BaseDialog";
import { RecipeIngredientSubstitutionEditor, type EditableSubstitution } from "@/components/Domain/Recipe/RecipeIngredientSubstitutionEditor";
import { useFoodStore } from "@/hooks/store";
import { useI18n } from "@/i18n";
import type { IngredientFood, IngredientFoodSubstitution } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

interface SubstitutionRow {
  substituteFoodId: string | null;
  note: string;
  // null means "whatever the other food currently says"; a boolean is an explicit choice
  addReverse: boolean | null;
}

export interface ReverseSubstitutionChanges {
  add: string[];
  remove: string[];
}

interface RecipeDataSubstitutionManagerDialogProps {
  data: IngredientFood;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // reverse substitutions live on the other food, so the page writes them separately
  onSubmit?: (substitutions: IngredientFoodSubstitution[], reverseChanges: ReverseSubstitutionChanges) => void;
  onCancel?: () => void;
}

function newRow(): SubstitutionRow {
  return { substituteFoodId: null, note: "", addReverse: null };
}

function readRows(data: IngredientFood): SubstitutionRow[] {
  const rows = (data.substitutions || []).map((substitution): SubstitutionRow => ({
    substituteFoodId: substitution.substituteFoodId || null,
    note: substitution.note || "",
    addReverse: null,
  }));

  if (!rows.length) {
    rows.push(newRow());
  }
  return rows;
}

export function RecipeDataSubstitutionManagerDialog({
  data,
  open = false,
  onOpenChange,
  onSubmit,
  onCancel,
}: RecipeDataSubstitutionManagerDialogProps) {
  const { t } = useI18n();
  const foodStore = useFoodStore();
  // a food cannot substitute for itself, so it is never offered
  const foodOptions = foodStore.store.filter(food => food.id !== data.id);

  const [substitutions, setSubstitutions] = useState<SubstitutionRow[]>(() => readRows(data));

  // the rows are re-read from `data` whenever the dialog opens (Vue: whenever(dialog))
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSubstitutions(readRows(data));
    }
  }

  function substituteFood(substituteFoodId: string | null) {
    return substituteFoodId ? foodStore.store.find(food => food.id === substituteFoodId) : undefined;
  }

  // the reverse substitution lives on the other food, so it is read back off that food
  function reverseExists(substituteFoodId: string | null) {
    return !!substituteFood(substituteFoodId)?.substitutions?.some(sub => sub.substituteFoodId === data.id);
  }

  // the control is per-row because the dialog mixes saved and unsaved rows; a single checkbox
  // at the bottom couldn't say which of them it meant
  function reverseChecked(index: number) {
    const substitution = substitutions[index];
    return substitution ? (substitution.addReverse ?? reverseExists(substitution.substituteFoodId)) : false;
  }

  // echoes the "in place of" wording of the intro line, read backwards; the checkbox itself
  // carries whether the reverse is already there
  function reverseLabel(index: number) {
    const substitute = substituteFood(substitutions[index]?.substituteFoodId ?? null)?.name || "";
    return t("data-pages.foods.reverse-substitution-add", { food: data.name, substitute });
  }

  function updateRow(index: number, patch: Partial<SubstitutionRow>) {
    setSubstitutions(current => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function changeRow(index: number, patch: Partial<EditableSubstitution>) {
    const rowPatch: Partial<SubstitutionRow> = {};
    if ("substituteFoodId" in patch) {
      rowPatch.substituteFoodId = patch.substituteFoodId ?? null;
    }
    if ("note" in patch) {
      rowPatch.note = patch.note ?? "";
    }
    updateRow(index, rowPatch);
  }

  function createSubstitution() {
    setSubstitutions(current => [...current, newRow()]);
  }

  function deleteSubstitution(index: number) {
    setSubstitutions(current => current.filter((_row, i) => i !== index));
  }

  // a row pointed at a different food has a different reverse to report on, so the choice made
  // about the previous one is dropped rather than carried over
  function resetReverse(index: number) {
    updateRow(index, { addReverse: null });
  }

  function saveSubstitutions() {
    const seenFoodIds: string[] = [];
    const keepRows: SubstitutionRow[] = [];
    const keepSubstitutions: IngredientFoodSubstitution[] = [];
    const reverseChanges: ReverseSubstitutionChanges = { add: [], remove: [] };

    substitutions.forEach((substitution) => {
      const substituteFoodId = substitution.substituteFoodId || null;
      const note = (substitution.note || "").trim() || null;

      // an empty row is a UI artifact rather than something to save, matching the alias dialog
      if (!substituteFoodId && !note) {
        return;
      }

      if (substituteFoodId) {
        if (substituteFoodId === data.id || seenFoodIds.includes(substituteFoodId)) {
          return;
        }
        seenFoodIds.push(substituteFoodId);

        // only a row whose reverse differs from what the other food already has needs a write
        const exists = reverseExists(substituteFoodId);
        const wanted = substitution.addReverse ?? exists;
        if (wanted !== exists) {
          (wanted ? reverseChanges.add : reverseChanges.remove).push(substituteFoodId);
        }
      }

      keepRows.push({ substituteFoodId, note: note || "", addReverse: substitution.addReverse });
      keepSubstitutions.push({ substituteFoodId, note });
    });

    setSubstitutions(keepRows);
    onSubmit?.(keepSubstitutions, reverseChanges);
  }

  return (
    <Box>
      <BaseDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t("data-pages.foods.manage-substitutions")}
        icon={icons.swapHorizontal}
        submitIcon={icons.check}
        submitText={t("general.confirm")}
        canSubmit
        onSubmit={saveSubstitutions}
        onCancel={onCancel}
      >
        <CardContent>
          <Typography component="p" variant="body2" sx={{ pb: 1.5 }}>
            {t("data-pages.foods.substitution-dialog-text", { food: data.name })}
          </Typography>
          <RecipeIngredientSubstitutionEditor
            substitutions={substitutions}
            foods={foodOptions}
            onAdd={createSubstitution}
            onDelete={deleteSubstitution}
            onChange={changeRow}
            onFoodChanged={resetReverse}
            // spelled out rather than tooltipped: this has to read on a phone, where nothing hovers
            renderAfterRow={(substitution, index) => (
              substitution.substituteFoodId
                ? (
                    <FormControlLabel
                      sx={{ ml: 1 }}
                      control={(
                        <Checkbox
                          size="small"
                          checked={reverseChecked(index)}
                          onChange={event => updateRow(index, { addReverse: event.target.checked })}
                        />
                      )}
                      label={reverseLabel(index)}
                    />
                  )
                : null
            )}
          />
        </CardContent>
      </BaseDialog>
    </Box>
  );
}
