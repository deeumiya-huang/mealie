// Usage: <HouseholdPreferencesEditor value={preferences} onChange={setPreferences} /> — household privacy,
// announcements, first day of the week and the default recipe preferences. Vue `v-model` → `value` + `onChange`
// (called with the edited copy).
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { DocLink } from "@/components/global/DocLink";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import type { ReadHouseholdPreferences } from "@/lib/api/types/household";
import { icons } from "@/lib/icons";

interface HouseholdPreferencesEditorProps {
  value: ReadHouseholdPreferences | null | undefined;
  onChange: (value: ReadHouseholdPreferences) => void;
}

type BooleanPreference = Exclude<{
  [K in keyof ReadHouseholdPreferences]: ReadHouseholdPreferences[K] extends boolean | undefined ? K : never;
}[keyof ReadHouseholdPreferences], undefined>;

interface Preference {
  key: BooleanPreference;
  label: string;
  description: string;
}

export function HouseholdPreferencesEditor({ value, onChange }: HouseholdPreferencesEditorProps) {
  const { t } = useI18n();

  if (!value) {
    return null;
  }

  const recipePreferences: Preference[] = [
    {
      key: "recipePublic",
      label: t("group.allow-users-outside-of-your-group-to-see-your-recipes"),
      description: t("group.allow-users-outside-of-your-group-to-see-your-recipes-description"),
    },
    {
      key: "recipeShowNutrition",
      label: t("group.show-nutrition-information"),
      description: t("group.show-nutrition-information-description"),
    },
    {
      key: "recipeShowAssets",
      label: t("group.show-recipe-assets"),
      description: t("group.show-recipe-assets-description"),
    },
    {
      key: "recipeLandscapeView",
      label: t("group.default-to-landscape-view"),
      description: t("group.default-to-landscape-view-description"),
    },
    {
      key: "recipeDisableComments",
      label: t("group.disable-users-from-commenting-on-recipes"),
      description: t("group.disable-users-from-commenting-on-recipes-description"),
    },
  ];

  const allDays = [
    { name: t("general.sunday"), value: 0 },
    { name: t("general.monday"), value: 1 },
    { name: t("general.tuesday"), value: 2 },
    { name: t("general.wednesday"), value: 3 },
    { name: t("general.thursday"), value: 4 },
    { name: t("general.friday"), value: 5 },
    { name: t("general.saturday"), value: 6 },
  ];

  function checkbox(key: BooleanPreference, label: string) {
    return (
      <FormControlLabel
        label={label}
        control={(
          <Checkbox
            size="small"
            color="primary"
            checked={!!value?.[key]}
            onChange={event => value && onChange({ ...value, [key]: event.target.checked })}
          />
        )}
      />
    );
  }

  return (
    <Box>
      <BaseCardSectionTitle title={t("household.household-preferences")} />
      <Box sx={{ mb: 3 }}>
        {checkbox("privateHousehold", t("household.private-household"))}
        <Box sx={{ ml: 4 }}>
          <Typography variant="subtitle2" sx={{ my: 0, py: 0 }}>
            {t("household.private-household-description")}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <DocLink link="/documentation/getting-started/faq/#how-do-private-groups-and-recipes-work" />
          </Box>
        </Box>
      </Box>
      <Box sx={{ mb: 3 }}>
        {checkbox("lockRecipeEditsFromOtherHouseholds", t("household.lock-recipe-edits-from-other-households"))}
        <Box sx={{ ml: 4 }}>
          <Typography variant="subtitle2" sx={{ my: 0, py: 0 }}>
            {t("household.lock-recipe-edits-from-other-households-description")}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ mb: 3 }}>
        {checkbox("showAnnouncements", t("announcements.show-announcements-from-mealie"))}
        <Box sx={{ ml: 4 }}>
          <Typography variant="subtitle2" sx={{ my: 0, py: 0 }}>
            {t("announcements.show-announcements-setting-description")}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}>
        <MdiIcon path={icons.calendarWeekBegin} sx={{ mb: 1, opacity: 0.6 }} />
        <TextField
          select
          fullWidth
          variant="standard"
          label={t("settings.first-day-of-week")}
          value={value.firstDayOfWeek ?? ""}
          onChange={event => onChange({ ...value, firstDayOfWeek: Number(event.target.value) })}
        >
          {allDays.map(day => (
            <MenuItem key={day.value} value={day.value}>
              {day.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <BaseCardSectionTitle title={t("household.household-recipe-preferences")}>
        {t("household.default-recipe-preferences-description")}
      </BaseCardSectionTitle>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 600 }}>
        {recipePreferences.map(preference => (
          <Box key={preference.key}>
            {checkbox(preference.key, preference.label)}
            <Typography variant="subtitle2" sx={{ ml: 4, my: 0, py: 0 }}>
              {preference.description}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
