// Usage: <RecipeSettingsSwitches value={settings} onChange={setSettings} isOwner={isOwner} />
// One compact switch per recipe setting (public, nutrition, assets, landscape, comments, locked); `locked` is
// only enabled for the recipe owner. Vue `v-model` → `value` + `onChange`.
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useI18n } from "@/i18n";
import type { RecipeSettings } from "@/lib/api/types/recipe";

interface RecipeSettingsSwitchesProps {
  value: RecipeSettings;
  onChange: (value: RecipeSettings) => void;
  isOwner?: boolean;
}

export function RecipeSettingsSwitches({ value, onChange, isOwner }: RecipeSettingsSwitchesProps) {
  const { t } = useI18n();
  const labels: Record<keyof RecipeSettings, string> = {
    public: t("recipe.public-recipe"),
    showNutrition: t("recipe.show-nutrition-values"),
    showAssets: t("asset.show-assets"),
    landscapeView: t("recipe.landscape-view-coming-soon"),
    disableComments: t("recipe.disable-comments"),
    locked: t("recipe.locked"),
  };

  return (
    <Box>
      {(Object.keys(value) as (keyof RecipeSettings)[]).map(key => (
        <Box key={key}>
          <FormControlLabel
            sx={{ my: 0.5, ml: 0 }}
            label={labels[key]}
            disabled={key === "locked" && !isOwner}
            control={(
              <Switch
                size="small"
                color="primary"
                checked={!!value[key]}
                onChange={event => onChange({ ...value, [key]: event.target.checked })}
              />
            )}
          />
        </Box>
      ))}
    </Box>
  );
}
