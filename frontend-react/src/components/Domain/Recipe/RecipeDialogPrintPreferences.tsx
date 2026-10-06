// Usage: <RecipeDialogPrintPreferences open={open} onOpenChange={setOpen} recipe={recipe} />
// Dialog to choose what the printed recipe contains (image position, description, notes, nutrition, linked
// ingredients, substitutions); the choices are saved in local storage and previewed live below.
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { ImagePosition, useUserPrintPreferences, type UserPrintPreferences } from "@/hooks/use-users/preferences";
import { useI18n } from "@/i18n";
import type { Recipe } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipePrintView } from "./RecipePrintView";

interface RecipeDialogPrintPreferencesProps {
  recipe?: Recipe;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type SwitchKey = "showDescription" | "showNotes" | "showNutrition" | "expandChildRecipes" | "showLinkedIngredients" | "showSubstitutions";

export function RecipeDialogPrintPreferences({ recipe, open = false, onOpenChange }: RecipeDialogPrintPreferencesProps) {
  const { t } = useI18n();
  const [preferences, setPreferences] = useUserPrintPreferences();

  function update(patch: Partial<UserPrintPreferences>) {
    setPreferences({ ...preferences, ...patch });
  }

  function renderSwitch(key: SwitchKey, label: string): ReactNode {
    return (
      <FormControlLabel
        control={(
          <Switch
            color="primary"
            checked={preferences[key]}
            onChange={(_event, checked) => update({ [key]: checked })}
          />
        )}
        label={label}
      />
    );
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={icons.printerSettings}
      title={t("general.print-preferences")}
      width="70%"
      maxWidth="816px"
    >
      <Box sx={{ p: 3 }}>
        <Box className="print-config" sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 1.5, p: 0 }}>
          <Box sx={{ alignSelf: "center", textAlign: "center" }}>
            <Typography variant="subtitle2" sx={{ textAlign: "center" }}>
              {t("recipe.recipe-image")}
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={preferences.imagePosition}
              // mandatory="force": one option is always selected
              onChange={(_event, value: string | null) => {
                if (value) update({ imagePosition: value });
              }}
              sx={{ width: "fit-content" }}
            >
              <ToggleButton value={ImagePosition.left}>
                <MdiIcon path={icons.dockLeft} />
              </ToggleButton>
              <ToggleButton value={ImagePosition.right}>
                <MdiIcon path={icons.dockRight} />
              </ToggleButton>
              <ToggleButton value={ImagePosition.hidden}>
                <MdiIcon path={icons.windowClose} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", alignSelf: "flex-start" }}>
            {renderSwitch("showDescription", t("recipe.description"))}
            {renderSwitch("showNotes", t("recipe.notes"))}
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", alignSelf: "flex-start" }}>
            {renderSwitch("showNutrition", t("recipe.nutrition"))}
            {renderSwitch("expandChildRecipes", t("recipe.include-linked-recipe-ingredients"))}
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", alignSelf: "flex-start" }}>
            {renderSwitch("showLinkedIngredients", t("recipe.linked-ingredients"))}
            {renderSwitch("showSubstitutions", t("recipe.substitutions"))}
          </Box>
        </Box>
        <Card className="print-preview" sx={{ height: "fit-content", maxHeight: "40vh", width: "100%", overflowY: "auto" }}>
          {recipe && <RecipePrintView recipe={recipe} />}
        </Card>
      </Box>
    </BaseDialog>
  );
}
