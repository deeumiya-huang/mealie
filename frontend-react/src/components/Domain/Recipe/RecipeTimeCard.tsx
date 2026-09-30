import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { icons } from "~/lib/icons";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useRecipeTime } from "~/hooks/recipes";
import { Icon } from "~/components/global/Icon";

export interface RecipeTimeCardProps {
  prepTime?: string | null;
  totalTime?: string | null;
  performTime?: string | null;
  prepTimeSeconds?: number | null;
  totalTimeSeconds?: number | null;
  performTimeSeconds?: number | null;
  color?: string;
  small?: boolean;
  className?: string;
}

function TimeEntry({ icon, name, value, small, stacked }: { icon: string; name: string; value: string; small: boolean; stacked: boolean }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "nowrap", my: 0.5, alignItems: "center", ...(stacked ? { width: "100%", textAlign: "start" } : {}) }}>
      <Icon path={icon} size={small ? "small" : "large"} start color="primary" />
      <p style={{ margin: 0, whiteSpace: "nowrap" }}>
        <span style={{ fontWeight: "bold", opacity: 0.8 }}>{name}</span>
        <br />
        {value}
      </p>
    </Box>
  );
}

export function RecipeTimeCard(props: RecipeTimeCardProps) {
  const { prepTime = null, totalTime = null, performTime = null, prepTimeSeconds = null, totalTimeSeconds = null, performTimeSeconds = null, small = false, className } = props;
  const i18n = useI18n();
  const display = useDisplay();
  const { recipeTimeDisplay } = useRecipeTime();

  const total = recipeTimeDisplay(totalTimeSeconds, totalTime);
  const prep = recipeTimeDisplay(prepTimeSeconds, prepTime);
  const perform = recipeTimeDisplay(performTimeSeconds, performTime);

  if (![prep, total, perform].some(x => !!x)) return null;

  const validateTotalTime = total ? { name: i18n.t("recipe.total-time"), value: total } : null;
  const validatePrepTime = prep ? { name: i18n.t("recipe.prep-time"), value: prep } : null;
  const validatePerformTime = perform ? { name: i18n.t("recipe.perform-time"), value: perform } : null;
  const fontSize = small ? "smaller" : "larger";
  const stacked = display.smAndDown;

  return (
    <Box className={className} sx={{ width: "fit-content", mx: "auto", textAlign: "center", fontSize: "smaller" }}>
      {validateTotalTime && (
        <Box sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", flexWrap: "nowrap", alignItems: "center", justifyContent: stacked ? undefined : "center", fontSize, ...(stacked ? { width: "100%", textAlign: "start" } : {}) }}>
            <Icon path={icons.clockOutline} size={small ? undefined : "x-large"} start color="primary" />
            <p style={{ margin: 0, whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: "bold", opacity: 0.8 }}>{validateTotalTime.name}</span>
              <br />
              {validateTotalTime.value}
            </p>
          </Box>
        </Box>
      )}
      {validateTotalTime && (validatePrepTime || validatePerformTime) && <Divider sx={{ my: 1 }} />}
      {(validatePrepTime || validatePerformTime) && (
        <Box sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", flexWrap: "nowrap", justifyContent: "center", alignItems: "center", width: "100%", fontSize, flexDirection: stacked ? "column" : "row" }}>
            {validatePrepTime && <TimeEntry icon={icons.knife} name={validatePrepTime.name} value={validatePrepTime.value} small={small} stacked={stacked} />}
            {validatePrepTime && validatePerformTime && !stacked && <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}
            {validatePerformTime && <TimeEntry icon={icons.potSteam} name={validatePerformTime.name} value={validatePerformTime.value} small={small} stacked={stacked} />}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default RecipeTimeCard;
