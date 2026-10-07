// Usage: <RecipeNutrition value={recipe.nutrition} onChange={n => …} edit={isEditForm} /> — the nutrition card: number
// fields while editing, else the list of the values that are set. (Vue `v-model` → `value` + `onChange`.)
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import { BaseNumberInput } from "@/components/global/BaseNumberInput";
import { parseNutritionValue, useNutritionLabels } from "@/hooks/recipes";
import type { NutritionLabelType } from "@/hooks/recipes/use-recipe-nutrition";
import { useI18n } from "@/i18n";
import type { Nutrition } from "@/lib/api/types/recipe";

interface RecipeNutritionProps {
  value: Nutrition;
  onChange?: (value: Nutrition) => void;
  edit?: boolean;
  className?: string;
}

export function RecipeNutrition({ value: modelValue, onChange, edit = true, className }: RecipeNutritionProps) {
  const { t } = useI18n();
  const { labels } = useNutritionLabels();

  const nutrition = (modelValue ?? {}) as Record<string, string | null | undefined>;
  const valueNotNull = Object.keys(nutrition).some(key => nutrition[key] !== null);

  const showViewer = !edit && valueNotNull;

  function updateValue(key: string, value: number | null) {
    onChange?.({ ...modelValue, [key]: value?.toString() ?? null });
  }

  // Build a new list that only contains nutritional information that has a value
  const renderedList = Object.entries(labels).reduce((item: NutritionLabelType, [key, label]) => {
    if (nutrition[key]?.trim()) {
      item[key] = {
        ...label,
        value: nutrition[key] ?? undefined,
      };
    }
    return item;
  }, {});

  if (!(valueNotNull || edit)) {
    return null;
  }

  return (
    <div className={className}>
      <Card sx={{ mt: 1 }}>
        <Typography variant="h6" component="div" sx={{ pt: 1, pb: 0, px: 2 }}>
          {t("recipe.nutrition")}
        </Typography>
        <Divider sx={{ mx: 1, my: 0.5 }} />
        {edit && (
          <CardContent>
            {Object.keys(nutrition).filter(key => labels[key]).map(key => (
              <div key={key}>
                <BaseNumberInput
                  value={parseNutritionValue(nutrition[key])}
                  label={labels[key]!.label}
                  suffix={labels[key]!.suffix}
                  density="compact"
                  autoComplete="off"
                  variant="underlined"
                  inset
                  precision={null}
                  min={0}
                  fullWidth
                  onChange={v => updateValue(key, v)}
                />
              </div>
            ))}
          </CardContent>
        )}
        {showViewer && (
          <List dense sx={{ mt: 0, pt: 0 }}>
            {Object.entries(renderedList).map(([key, item]) => (
              <ListItem key={key} sx={{ minHeight: 25 }}>
                <Box sx={{ pl: 1, display: "flex", width: "100%" }}>
                  <div>{item.label}</div>
                  <Box sx={{ ml: "auto", mr: 0.5 }}>
                    {item.value}
                  </Box>
                  <div>{item.suffix}</div>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    </div>
  );
}
