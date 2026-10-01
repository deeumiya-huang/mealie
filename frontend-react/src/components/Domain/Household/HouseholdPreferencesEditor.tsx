import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { DocLink } from "~/components/global/DocLink";
import { SelectInput } from "~/components/global/form";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";
import type { ReadHouseholdPreferences } from "~/lib/api/types/household";

type BooleanPreference
  = | "privateHousehold"
    | "lockRecipeEditsFromOtherHouseholds"
    | "showAnnouncements"
    | "recipePublic"
    | "recipeShowNutrition"
    | "recipeShowAssets"
    | "recipeLandscapeView"
    | "recipeDisableComments";

export function HouseholdPreferencesEditor({ value: preferences, onChange }: { value: ReadHouseholdPreferences; onChange: (value: ReadHouseholdPreferences) => void }) {
  const i18n = useI18n();

  const checkbox = (key: BooleanPreference, label: string) => (
    <FormControlLabel
      control={<Checkbox size="small" checked={!!preferences[key]} onChange={e => onChange({ ...preferences, [key]: e.target.checked })} />}
      label={label}
    />
  );
  const description = (text: string) => <Typography variant="subtitle2" sx={{ my: 0, py: 0 }}>{text}</Typography>;

  const recipePreferences: { key: BooleanPreference; label: string; description: string }[] = [
    { key: "recipePublic", label: i18n.t("group.allow-users-outside-of-your-group-to-see-your-recipes"), description: i18n.t("group.allow-users-outside-of-your-group-to-see-your-recipes-description") },
    { key: "recipeShowNutrition", label: i18n.t("group.show-nutrition-information"), description: i18n.t("group.show-nutrition-information-description") },
    { key: "recipeShowAssets", label: i18n.t("group.show-recipe-assets"), description: i18n.t("group.show-recipe-assets-description") },
    { key: "recipeLandscapeView", label: i18n.t("group.default-to-landscape-view"), description: i18n.t("group.default-to-landscape-view-description") },
    { key: "recipeDisableComments", label: i18n.t("group.disable-users-from-commenting-on-recipes"), description: i18n.t("group.disable-users-from-commenting-on-recipes-description") },
  ];

  const allDays = [
    { name: i18n.t("general.sunday"), value: 0 },
    { name: i18n.t("general.monday"), value: 1 },
    { name: i18n.t("general.tuesday"), value: 2 },
    { name: i18n.t("general.wednesday"), value: 3 },
    { name: i18n.t("general.thursday"), value: 4 },
    { name: i18n.t("general.friday"), value: 5 },
    { name: i18n.t("general.saturday"), value: 6 },
  ];

  return (
    <div>
      <BaseCardSectionTitle title={i18n.t("household.household-preferences")} />
      <Box sx={{ mb: 3 }}>
        {checkbox("privateHousehold", i18n.t("household.private-household"))}
        <Box sx={{ ml: 4 }}>
          {description(i18n.t("household.private-household-description"))}
          <Box sx={{ mt: 1 }}><DocLink link="/documentation/getting-started/faq/#how-do-private-groups-and-recipes-work" /></Box>
        </Box>
      </Box>
      <Box sx={{ mb: 3 }}>
        {checkbox("lockRecipeEditsFromOtherHouseholds", i18n.t("household.lock-recipe-edits-from-other-households"))}
        <Box sx={{ ml: 4 }}>{description(i18n.t("household.lock-recipe-edits-from-other-households-description"))}</Box>
      </Box>
      <Box sx={{ mb: 3 }}>
        {checkbox("showAnnouncements", i18n.t("announcements.show-announcements-from-mealie"))}
        <Box sx={{ ml: 4 }}>{description(i18n.t("announcements.show-announcements-setting-description"))}</Box>
      </Box>
      <SelectInput
        value={preferences.firstDayOfWeek}
        onChange={v => onChange({ ...preferences, firstDayOfWeek: v as number })}
        prependIcon={icons.calendarWeekBegin}
        items={allDays}
        itemTitle="name"
        itemValue="value"
        label={i18n.t("settings.first-day-of-week")}
        variant="underlined"
      />

      <Box sx={{ mt: 2.5 }}>
        <BaseCardSectionTitle title={i18n.t("household.household-recipe-preferences")}>
          {i18n.t("household.default-recipe-preferences-description")}
        </BaseCardSectionTitle>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxWidth: 600 }}>
        {recipePreferences.map(p => (
          <div key={p.key}>
            {checkbox(p.key, p.label)}
            <Box sx={{ ml: 4 }}>{description(p.description)}</Box>
          </div>
        ))}
      </Box>
    </div>
  );
}

export default HouseholdPreferencesEditor;
