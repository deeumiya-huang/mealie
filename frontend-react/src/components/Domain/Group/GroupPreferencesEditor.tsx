// Usage: <GroupPreferencesEditor value={preferences} onChange={setPreferences} /> — checkboxes for the group's
// privacy and announcements settings. Vue `v-model` → `value` + `onChange` (called with the edited copy).
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { DocLink } from "@/components/global/DocLink";
import { useI18n } from "@/i18n";
import type { ReadGroupPreferences } from "@/lib/api/types/user";

interface GroupPreferencesEditorProps {
  value: ReadGroupPreferences | null | undefined;
  onChange: (value: ReadGroupPreferences) => void;
}

export function GroupPreferencesEditor({ value, onChange }: GroupPreferencesEditorProps) {
  const { t } = useI18n();

  if (!value) {
    return null;
  }

  return (
    <Box>
      <BaseCardSectionTitle title={t("group.group-preferences")} />
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          label={t("group.private-group")}
          control={(
            <Checkbox
              size="small"
              color="primary"
              checked={!!value.privateGroup}
              onChange={event => onChange({ ...value, privateGroup: event.target.checked })}
            />
          )}
        />
        <Box sx={{ ml: 4 }}>
          <Typography variant="subtitle2" sx={{ my: 0, py: 0 }}>
            {t("group.private-group-description")}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <DocLink link="/documentation/getting-started/faq/#how-do-private-groups-and-recipes-work" />
          </Box>
        </Box>
      </Box>
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          label={t("announcements.show-announcements-from-mealie")}
          control={(
            <Checkbox
              size="small"
              color="primary"
              checked={!!value.showAnnouncements}
              onChange={event => onChange({ ...value, showAnnouncements: event.target.checked })}
            />
          )}
        />
        <Box sx={{ ml: 4 }}>
          <Typography variant="subtitle2" sx={{ my: 0, py: 0 }}>
            {t("announcements.show-announcements-setting-description")}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
