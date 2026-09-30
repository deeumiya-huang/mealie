import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { Nutrition } from "~/lib/api/types/recipe";
import { parseNutritionValue, useNutritionLabels } from "~/hooks/recipes";
import type { NutritionLabelType } from "~/hooks/recipes/use-recipe-nutrition";
import { useI18n } from "~/hooks/use-global-i18n";
import { NumberInput } from "~/components/global/form";

export function RecipeNutrition({ value, onChange, edit = true, sx }: { value: Nutrition; onChange?: (value: Nutrition) => void; edit?: boolean; sx?: SxProps<Theme> }) {
  const i18n = useI18n();
  const { labels } = useNutritionLabels();
  const record = value as unknown as Record<string, string | null | undefined>;
  const valueNotNull = Object.values(record).some(v => v !== null && v !== undefined);
  const showViewer = !edit && valueNotNull;

  // Only nutritional information that has a value
  const renderedList = Object.entries(labels).reduce((acc: NutritionLabelType, [key, label]) => {
    if (record[key]?.trim()) acc[key] = { ...label, value: record[key] ?? undefined };
    return acc;
  }, {});

  if (!(valueNotNull || edit)) return null;
  return (
    <Box sx={sx}>
      <Card sx={{ mt: 1 }}>
        <Typography variant="h6" sx={{ px: 2, pt: 1 }}>{i18n.t("recipe.nutrition")}</Typography>
        <Divider sx={{ mx: 1, my: 0.5 }} />
        {edit && (
          <CardContent>
            {Object.keys(record).map(key => (
              <NumberInput
                key={key}
                value={parseNutritionValue(record[key])}
                label={labels[key]?.label ?? key}
                suffix={labels[key]?.suffix}
                variant="underlined"
                min={0}
                onChange={v => onChange?.({ ...value, [key]: v?.toString() ?? null })}
              />
            ))}
          </CardContent>
        )}
        {showViewer && (
          <List dense sx={{ mt: 0, pt: 0 }}>
            {Object.entries(renderedList).map(([key, item]) => (
              <ListItem key={key} sx={{ minHeight: 25, py: 0 }}>
                <Box sx={{ pl: 1, display: "flex", width: "100%" }}>
                  <div>{item.label}</div>
                  <Box sx={{ ml: "auto", mr: 0.5 }}>{item.value}</Box>
                  <div>{item.suffix}</div>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    </Box>
  );
}

export default RecipeNutrition;
