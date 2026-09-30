import { useState } from "react";
import Card from "@mui/material/Card";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import type { UnitSystem } from "@mealie-unit-systems";
import { icons } from "~/lib/icons";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe } from "~/lib/api/types/recipe";
import { canConvertIngredient, useUnitSystem } from "~/hooks/recipes";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "~/components/global/Icon";
import { chipSx } from "./RecipeScaleEditButton";

export function RecipeUnitSystemButton({ recipe }: { recipe: NoUndefinedField<Recipe> }) {
  const i18n = useI18n();
  const { unitSystem, setUnitSystem } = useUnitSystem();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  // Readers call US customary "imperial", so that's what the labels say; the stored value stays `us`.
  const options: { key: string; value: UnitSystem | null; text: string }[] = [
    { key: "as-written", value: null, text: i18n.t("recipe.unit-system.as-written") },
    { key: "metric", value: "metric", text: i18n.t("recipe.unit-system.metric-with-hint") },
    { key: "us", value: "us", text: i18n.t("recipe.unit-system.imperial-with-hint") },
  ];
  const activeLabel = unitSystem === "metric"
    ? i18n.t("recipe.unit-system.metric")
    : unitSystem === "us" ? i18n.t("recipe.unit-system.imperial") : i18n.t("recipe.unit-system.as-written");

  // Disabled when nothing on the recipe carries the standardization data conversion needs.
  const hasConvertibleIngredients = recipe.recipeIngredient.some(canConvertIngredient);

  return (
    <>
      <Tooltip title={i18n.t("general.units")} placement="top">
        <Card
          sx={{ ...chipSx, cursor: hasConvertibleIngredients ? "pointer" : "default", opacity: hasConvertibleIngredients ? 1 : 0.6 }}
          onClick={e => hasConvertibleIngredients && setAnchor(e.currentTarget)}
        >
          <Icon path={icons.units} size="small" sx={{ mr: 1 }} />
          <span>{activeLabel}</span>
        </Card>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {options.map(option => (
          <MenuItem
            key={option.key}
            dense
            selected={option.value === unitSystem}
            onClick={() => {
              setUnitSystem(option.value);
              setAnchor(null);
            }}
          >
            {option.text}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default RecipeUnitSystemButton;
