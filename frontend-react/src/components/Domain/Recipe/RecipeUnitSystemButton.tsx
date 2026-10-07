// Usage: <RecipeUnitSystemButton recipe={recipe} /> — the "units" chip above the ingredients: shows the unit system
// quantities are displayed in and opens a menu to pick another one (as written / metric / imperial). Disabled when no
// ingredient carries the data a conversion needs.
import { useState, type MouseEvent } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { MdiIcon } from "@/components/global/MdiIcon";
import { canConvertIngredient, useUnitSystem } from "@/hooks/recipes";
import type { UnitSystem } from "@/hooks/recipes/unit-systems";
import { useI18n } from "@/i18n";
import type { NoUndefinedField } from "@/lib/api/types/non-generated";
import type { Recipe } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

interface RecipeUnitSystemButtonProps {
  recipe: NoUndefinedField<Recipe>;
}

export function RecipeUnitSystemButton({ recipe }: RecipeUnitSystemButtonProps) {
  const { t } = useI18n();
  const { unitSystem, setUnitSystem } = useUnitSystem();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  /**
   * Readers call US customary "imperial", so that's what the labels say. The stored value stays
   * `us`, which is what the units actually are, and leaves `imperial` free should a genuine
   * imperial ladder ever be added.
   */
  const options: { key: string; value: UnitSystem | null; text: string }[] = [
    { key: "as-written", value: null, text: t("recipe.unit-system.as-written") },
    { key: "metric", value: "metric", text: t("recipe.unit-system.metric-with-hint") },
    { key: "us", value: "us", text: t("recipe.unit-system.imperial-with-hint") },
  ];

  let activeLabel: string;
  switch (unitSystem) {
    case "metric":
      activeLabel = t("recipe.unit-system.metric");
      break;
    case "us":
      activeLabel = t("recipe.unit-system.imperial");
      break;
    default:
      activeLabel = t("recipe.unit-system.as-written");
  }

  // Disabled when nothing on the recipe carries the standardization data conversion needs, so the
  // control stays in place — the reader can see units are a thing here — but never does nothing
  // when used.
  const hasConvertibleIngredients = (recipe.recipeIngredient ?? []).some(canConvertIngredient);

  return (
    <>
      <Tooltip title={t("general.units")} placement="top">
        {/* span: a tooltip on a disabled control needs an element that receives pointer events */}
        <span>
          <ButtonBase
            disabled={!hasConvertibleIngredients}
            aria-haspopup="menu"
            aria-expanded={!!anchor}
            onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
            sx={theme => ({
              py: 0.5,
              px: 1,
              borderRadius: 1,
              fontSize: "0.875rem",
              bgcolor: "secondary.dark",
              color: theme.palette.secondary.contrastText,
              boxShadow: 1,
              opacity: hasConvertibleIngredients ? 1 : 0.6,
            })}
          >
            <MdiIcon path={icons.units} size="small" sx={{ mr: 1 }} />
            <span>{activeLabel}</span>
          </ButtonBase>
        </span>
      </Tooltip>
      <Menu
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ list: { dense: true } }}
      >
        {options.map(option => (
          <MenuItem
            key={option.key}
            selected={option.value === unitSystem}
            onClick={() => {
              setUnitSystem(option.value);
              setAnchor(null);
            }}
          >
            <ListItemText>{option.text}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
