import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { BaseDialog } from "~/components/global/BaseDialog";
import { useFoodStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";
import type { IngredientFood, IngredientFoodSubstitution } from "~/lib/api/types/recipe";
import { RecipeIngredientSubstitutionEditor } from "./RecipeIngredientSubstitutionEditor";

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

export interface RecipeDataSubstitutionManagerDialogProps {
  data: IngredientFood;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  // reverse substitutions live on the other food, so the page writes them separately
  onSubmit?: (substitutions: IngredientFoodSubstitution[], reverseChanges: ReverseSubstitutionChanges) => void;
  onCancel?: () => void;
}

const emptyRow = (): SubstitutionRow => ({ substituteFoodId: null, note: "", addReverse: null });

function initialRows(data: IngredientFood): SubstitutionRow[] {
  const rows = (data.substitutions || []).map(substitution => ({
    substituteFoodId: substitution.substituteFoodId || null,
    note: substitution.note || "",
    addReverse: null,
  }));
  return rows.length ? rows : [emptyRow()];
}

export function RecipeDataSubstitutionManagerDialog({ data, open, onOpenChange, onSubmit, onCancel }: RecipeDataSubstitutionManagerDialogProps) {
  const i18n = useI18n();
  const foodStore = useFoodStore();
  // a food cannot substitute for itself, so it is never offered
  const foodOptions = foodStore.store.filter(food => food.id !== data.id);

  const [substitutions, setSubstitutions] = useState<SubstitutionRow[]>(() => initialRows(data));

  useEffect(() => {
    if (open) {
      setSubstitutions(initialRows(data));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-initialise when opened (Vue `whenever(dialog)`)
  }, [open]);

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
    return i18n.t("data-pages.foods.reverse-substitution-add", { food: data.name, substitute });
  }

  function setReverse(index: number, addReverse: boolean | null) {
    setSubstitutions(prev => prev.map((row, i) => (i === index ? { ...row, addReverse } : row)));
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
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={i18n.t("data-pages.foods.manage-substitutions")}
      icon={icons.swapHorizontal}
      submitIcon={icons.check}
      submitText={i18n.t("general.confirm")}
      canSubmit
      onSubmit={saveSubstitutions}
      onCancel={onCancel}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ pb: 1.5 }}>
          {i18n.t("data-pages.foods.substitution-dialog-text", { food: data.name })}
        </Typography>
        <RecipeIngredientSubstitutionEditor
          substitutions={substitutions}
          foods={foodOptions}
          onChangeRow={(index, row) => setSubstitutions(prev => prev.map((r, i) => (i === index ? row : r)))}
          onAdd={() => setSubstitutions(prev => [...prev, emptyRow()])}
          onDelete={index => setSubstitutions(prev => prev.filter((_, i) => i !== index))}
          // a row pointed at a different food has a different reverse to report on, so the choice
          // made about the previous one is dropped rather than carried over
          onFoodChanged={index => setReverse(index, null)}
          // spelled out rather than tooltipped: this has to read on a phone, where nothing hovers
          afterRow={(substitution, index) => substitution.substituteFoodId && (
            <FormControlLabel
              sx={{ ml: 1 }}
              control={<Checkbox size="small" checked={reverseChecked(index)} onChange={e => setReverse(index, e.target.checked)} />}
              label={reverseLabel(index)}
            />
          )}
        />
      </Box>
    </BaseDialog>
  );
}

export default RecipeDataSubstitutionManagerDialog;
