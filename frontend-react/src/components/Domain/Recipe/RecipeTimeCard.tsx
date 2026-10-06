// Usage: <RecipeTimeCard totalTime={recipe.totalTime} totalTimeSeconds={recipe.totalTimeSeconds} prepTime=… performTime=… small />
// Total / prep / perform time of a recipe with icons; renders nothing when none of the times is set.
// (`color` is accepted for parity with the Vue props but, as there, has no effect.)
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useRecipeTime } from "@/hooks/recipes";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface RecipeTimeCardProps {
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

export function RecipeTimeCard({
  prepTime: prepTimeText = null,
  totalTime: totalTimeText = null,
  performTime: performTimeText = null,
  prepTimeSeconds = null,
  totalTimeSeconds = null,
  performTimeSeconds = null,
  small = false,
  className,
}: RecipeTimeCardProps) {
  const { t } = useI18n();
  const { smAndDown } = useDisplay();
  const { recipeTimeDisplay } = useRecipeTime();

  const totalTime = recipeTimeDisplay(totalTimeSeconds, totalTimeText);
  const prepTime = recipeTimeDisplay(prepTimeSeconds, prepTimeText);
  const performTime = recipeTimeDisplay(performTimeSeconds, performTimeText);

  if (![prepTime, totalTime, performTime].some(x => !!x)) {
    return null;
  }

  const validateTotalTime = totalTime ? { name: t("recipe.total-time"), value: totalTime } : null;
  const validatePrepTime = prepTime ? { name: t("recipe.prep-time"), value: prepTime } : null;
  const validatePerformTime = performTime ? { name: t("recipe.perform-time"), value: performTime } : null;

  const fontSize = small ? "smaller" : "larger";
  const stacked = smAndDown ? { width: "100%", textAlign: "start" } as const : {};

  return (
    <Box className={className} sx={{ textAlign: "center", mx: "auto", fontSize: "smaller", width: "fit-content" }}>
      {/* Total Time */}
      {validateTotalTime && (
        <Box sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", flexWrap: "nowrap", alignItems: "center", justifyContent: smAndDown ? undefined : "center", fontSize, ...stacked }}>
            <MdiIcon path={icons.clockOutline} size={small ? "default" : "x-large"} sx={{ color: "primary.main", mr: 1 }} />
            <Box component="p" sx={{ my: 0, whiteSpace: "nowrap" }}>
              <Box component="span" sx={{ fontWeight: "bold", opacity: 0.8 }}>{validateTotalTime.name}</Box>
              <br />
              {validateTotalTime.value}
            </Box>
          </Box>
        </Box>
      )}
      {validateTotalTime && (validatePrepTime || validatePerformTime) && (
        <Divider sx={{ my: 1 }} />
      )}
      {/* Prep Time & Perform Time */}
      {(validatePrepTime || validatePerformTime) && (
        <Box sx={{ width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "nowrap",
              flexDirection: smAndDown ? "column" : "row",
              justifyContent: "center",
              alignItems: smAndDown ? "stretch" : "center",
              width: "100%",
              fontSize,
            }}
          >
            {validatePrepTime && (
              <Box sx={{ display: "flex", flexWrap: "nowrap", my: 0.5, alignItems: "center", ...stacked }}>
                <MdiIcon path={icons.knife} size={small ? "small" : "large"} sx={{ color: "primary.main", mr: 1 }} />
                <Box component="p" sx={{ my: 0, whiteSpace: "nowrap" }}>
                  <Box component="span" sx={{ fontWeight: "bold", opacity: 0.8 }}>{validatePrepTime.name}</Box>
                  <br />
                  {validatePrepTime.value}
                </Box>
              </Box>
            )}
            {validatePrepTime && validatePerformTime && !smAndDown && (
              <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            )}
            {validatePerformTime && (
              <Box sx={{ display: "flex", flexWrap: "nowrap", my: 0.5, alignItems: "center", ...stacked }}>
                <MdiIcon path={icons.potSteam} size={small ? "small" : "large"} sx={{ color: "primary.main", mr: 1 }} />
                <Box component="p" sx={{ my: 0, whiteSpace: "nowrap" }}>
                  <Box component="span" sx={{ fontWeight: "bold", opacity: 0.8 }}>{validatePerformTime.name}</Box>
                  <br />
                  {validatePerformTime.value}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
