import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import type { Recipe } from "~/lib/api/types/recipe";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import { useI18n } from "~/hooks/use-global-i18n";
import { ImagePosition, useUserPrintPreferences } from "~/hooks/use-users/preferences";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { SwitchInput } from "~/components/global/form";
import { RecipePrintView } from "./RecipePrintView";

export interface RecipeDialogPrintPreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: NoUndefinedField<Recipe>;
}

export function RecipeDialogPrintPreferences({ open, onOpenChange, recipe }: RecipeDialogPrintPreferencesProps) {
  const i18n = useI18n();
  const [preferences, setPreferences] = useUserPrintPreferences();

  const toggle = (key: "showDescription" | "showNotes" | "showNutrition" | "expandChildRecipes" | "showLinkedIngredients" | "showSubstitutions", label: string) => (
    <SwitchInput hideDetails color="primary" label={label} checked={preferences[key]} onChange={v => setPreferences({ [key]: v })} />
  );

  return (
    <BaseDialog open={open} onOpenChange={onOpenChange} icon={icons.printerSettings} title={i18n.t("general.print-preferences")} width="70%" maxWidth="816px">
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 1.5 }}>
          <Grid size="auto" sx={{ alignSelf: "center", textAlign: "center" }}>
            <Typography variant="subtitle2" sx={{ textAlign: "center" }}>{i18n.t("recipe.recipe-image")}</Typography>
            <ToggleButtonGroup
              exclusive
              value={preferences.imagePosition}
              onChange={(_e, v: string | null) => v && setPreferences({ imagePosition: v })}
            >
              <ToggleButton value={ImagePosition.left}><Icon path={icons.dockLeft} /></ToggleButton>
              <ToggleButton value={ImagePosition.right}><Icon path={icons.dockRight} /></ToggleButton>
              <ToggleButton value={ImagePosition.hidden}><Icon path={icons.windowClose} /></ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid size="auto">
            {toggle("showDescription", i18n.t("recipe.description"))}
            {toggle("showNotes", i18n.t("recipe.notes"))}
          </Grid>
          <Grid size="auto">
            {toggle("showNutrition", i18n.t("recipe.nutrition"))}
            {toggle("expandChildRecipes", i18n.t("recipe.include-linked-recipe-ingredients"))}
          </Grid>
          <Grid size="auto">
            {toggle("showLinkedIngredients", i18n.t("recipe.linked-ingredients"))}
            {toggle("showSubstitutions", i18n.t("recipe.substitutions"))}
          </Grid>
        </Grid>
        <Card sx={{ height: "fit-content", maxHeight: "40vh", width: "100%", overflowY: "auto" }}>
          {recipe && <RecipePrintView recipe={recipe} />}
        </Card>
      </Box>
    </BaseDialog>
  );
}

export default RecipeDialogPrintPreferences;
