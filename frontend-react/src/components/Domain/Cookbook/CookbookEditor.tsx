import { useMemo } from "react";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { HelpIcon } from "~/components/global/HelpIcon";
import { TextInput } from "~/components/global/form";
import { QueryFilterBuilder } from "~/components/Domain/QueryFilterBuilder";
import { useI18n } from "~/hooks/use-global-i18n";
import type { FieldDefinition } from "~/hooks/use-query-filter-builder";
import { Organizer } from "~/lib/api/types/non-generated";
import type { ReadCookBook } from "~/lib/api/types/cookbook";

export interface CookbookEditorProps {
  value: ReadCookBook;
  /** Functional update, so the debounced query filter never overwrites newer edits. */
  onChange: (update: (prev: ReadCookBook) => ReadCookBook) => void;
}

export function CookbookEditor({ value: cookbook, onChange }: CookbookEditorProps) {
  const i18n = useI18n();

  const fieldDefs = useMemo<FieldDefinition[]>(() => [
    { name: "recipe_category.id", label: i18n.t("category.categories"), type: Organizer.Category },
    { name: "tags.id", label: i18n.t("tag.tags"), type: Organizer.Tag },
    { name: "recipe_ingredient.food.id", label: i18n.t("recipe.ingredients"), type: Organizer.Food },
    { name: "recipe_ingredient.food.label_id", label: i18n.t("data-pages.foods.food-label"), type: Organizer.Label },
    { name: "tools.id", label: i18n.t("tool.tools"), type: Organizer.Tool },
    { name: "household_id", label: i18n.t("household.households"), type: Organizer.Household },
    { name: "user_id", label: i18n.t("user.users"), type: Organizer.User },
    { name: "rating", label: i18n.t("general.rating"), type: "number" },
    { name: "total_time_seconds", label: i18n.t("recipe.total-time"), type: "duration" },
    { name: "created_at", label: i18n.t("general.date-created"), type: "date" },
    { name: "updated_at", label: i18n.t("general.date-updated"), type: "date" },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- labels follow the locale
  ], [i18n.locale]);

  return (
    <Box sx={{ px: 0.5, py: 2 }}>
      <TextInput
        value={cookbook.name}
        label={i18n.t("cookbook.cookbook-name")}
        variant="underlined"
        onChange={name => onChange(prev => ({ ...prev, name }))}
      />
      <TextInput
        value={cookbook.description}
        label={i18n.t("recipe.description")}
        variant="underlined"
        multiline
        autoGrow
        rows={2}
        onChange={description => onChange(prev => ({ ...prev, description }))}
      />
      <QueryFilterBuilder
        fieldDefs={fieldDefs}
        initialQueryFilter={cookbook.queryFilter}
        onInput={qf => onChange(prev => ({ ...prev, queryFilterString: qf || "" }))}
      />
      <FormControlLabel
        control={<Switch checked={!!cookbook.public} onChange={e => onChange(prev => ({ ...prev, public: e.target.checked }))} />}
        label={(
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
            {i18n.t("cookbook.public-cookbook")}
            <HelpIcon small right>{i18n.t("cookbook.public-cookbook-description")}</HelpIcon>
          </Box>
        )}
      />
    </Box>
  );
}

export default CookbookEditor;
