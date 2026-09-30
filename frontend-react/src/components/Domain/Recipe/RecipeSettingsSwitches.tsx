import type { RecipeSettings } from "~/lib/api/types/recipe";
import { useI18n } from "~/hooks/use-global-i18n";
import { SwitchInput } from "~/components/global/form";

export function RecipeSettingsSwitches({ value, onChange, isOwner }: { value: RecipeSettings; onChange: (value: RecipeSettings) => void; isOwner?: boolean }) {
  const i18n = useI18n();
  const labels: Record<keyof RecipeSettings, string> = {
    public: i18n.t("recipe.public-recipe"),
    showNutrition: i18n.t("recipe.show-nutrition-values"),
    showAssets: i18n.t("asset.show-assets"),
    landscapeView: i18n.t("recipe.landscape-view-coming-soon"),
    disableComments: i18n.t("recipe.disable-comments"),
    locked: i18n.t("recipe.locked"),
  };
  return (
    <div>
      {(Object.keys(value) as (keyof RecipeSettings)[]).map(key => (
        <SwitchInput
          key={key}
          checked={!!value[key]}
          onChange={v => onChange({ ...value, [key]: v })}
          color="primary"
          density="compact"
          disabled={key === "locked" && !isOwner}
          sx={{ my: 0.5 }}
          label={labels[key]}
          hideDetails
        />
      ))}
    </div>
  );
}

export default RecipeSettingsSwitches;
