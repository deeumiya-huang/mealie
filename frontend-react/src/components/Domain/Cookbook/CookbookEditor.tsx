// Usage: <CookbookEditor value={cookbook} onChange={setCookbook} />
// Form for a cookbook: name, description, the recipe query filter and the public switch. Vue edited the
// `v-model` object in place; here every edit reports a copy through `onChange(value)`.
import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { HelpIcon } from "@/components/global/HelpIcon";
import { QueryFilterBuilder } from "@/components/Domain/QueryFilterBuilder";
import type { FieldDefinition } from "@/hooks/use-query-filter-builder";
import { useI18n } from "@/i18n";
import type { ReadCookBook } from "@/lib/api/types/cookbook";
import { Organizer } from "@/lib/api/types/non-generated";

interface CookbookEditorProps {
  value: ReadCookBook;
  onChange: (value: ReadCookBook) => void;
}

export function CookbookEditor({ value: cookbook, onChange }: CookbookEditorProps) {
  const { t } = useI18n();

  // the query filter reports after a debounce, so it must apply to the cookbook as it is by then
  const latest = useRef({ cookbook, onChange });
  useEffect(() => {
    latest.current = { cookbook, onChange };
  });

  function handleInput(value: string | undefined) {
    const current = latest.current;
    current.onChange({ ...current.cookbook, queryFilterString: value || "" });
  }

  const fieldDefs: FieldDefinition[] = [
    {
      name: "recipe_category.id",
      label: t("category.categories"),
      type: Organizer.Category,
    },
    {
      name: "tags.id",
      label: t("tag.tags"),
      type: Organizer.Tag,
    },
    {
      name: "recipe_ingredient.food.id",
      label: t("recipe.ingredients"),
      type: Organizer.Food,
    },
    {
      name: "recipe_ingredient.food.label_id",
      label: t("data-pages.foods.food-label"),
      type: Organizer.Label,
    },
    {
      name: "tools.id",
      label: t("tool.tools"),
      type: Organizer.Tool,
    },
    {
      name: "household_id",
      label: t("household.households"),
      type: Organizer.Household,
    },
    {
      name: "user_id",
      label: t("user.users"),
      type: Organizer.User,
    },
    {
      name: "rating",
      label: t("general.rating"),
      type: "number",
    },
    {
      name: "total_time_seconds",
      label: t("recipe.total-time"),
      type: "duration",
    },
    {
      name: "created_at",
      label: t("general.date-created"),
      type: "date",
    },
    {
      name: "updated_at",
      label: t("general.date-updated"),
      type: "date",
    },
  ];

  return (
    <div>
      <CardContent sx={{ px: 0.5 }}>
        <TextField
          fullWidth
          variant="standard"
          color="primary"
          value={cookbook.name}
          label={t("cookbook.cookbook-name")}
          onChange={event => onChange({ ...cookbook, name: event.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          variant="standard"
          color="primary"
          value={cookbook.description ?? ""}
          label={t("recipe.description")}
          onChange={event => onChange({ ...cookbook, description: event.target.value })}
          sx={{ mb: 2 }}
        />
        <QueryFilterBuilder
          fieldDefs={fieldDefs}
          initialQueryFilter={cookbook.queryFilter}
          onInput={handleInput}
        />
        <FormControlLabel
          control={(
            <Switch
              color="primary"
              checked={!!cookbook.public}
              onChange={event => onChange({ ...cookbook, public: event.target.checked })}
            />
          )}
          label={(
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {t("cookbook.public-cookbook")}
              <Box sx={{ ml: 1 }}>
                <HelpIcon small right>
                  {t("cookbook.public-cookbook-description")}
                </HelpIcon>
              </Box>
            </Box>
          )}
        />
      </CardContent>
    </div>
  );
}
