import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { DocLink } from "~/components/global/DocLink";
import { useI18n } from "~/hooks/use-global-i18n";
import type { ReadGroupPreferences } from "~/lib/api/types/user";

export function GroupPreferencesEditor({ value: preferences, onChange }: { value: ReadGroupPreferences; onChange: (value: ReadGroupPreferences) => void }) {
  const i18n = useI18n();

  const option = (key: "privateGroup" | "showAnnouncements", label: string, description: string, extra?: ReactNode) => (
    <Box sx={{ mb: 3 }}>
      <FormControlLabel
        control={<Checkbox size="small" checked={!!preferences[key]} onChange={e => onChange({ ...preferences, [key]: e.target.checked })} />}
        label={label}
      />
      <Box sx={{ ml: 4 }}>
        <Typography variant="subtitle2" sx={{ my: 0, py: 0 }}>{description}</Typography>
        {extra}
      </Box>
    </Box>
  );

  return (
    <div>
      <BaseCardSectionTitle title={i18n.t("group.group-preferences")} />
      {option(
        "privateGroup",
        i18n.t("group.private-group"),
        i18n.t("group.private-group-description"),
        <Box sx={{ mt: 1 }}><DocLink link="/documentation/getting-started/faq/#how-do-private-groups-and-recipes-work" /></Box>,
      )}
      {option(
        "showAnnouncements",
        i18n.t("announcements.show-announcements-from-mealie"),
        i18n.t("announcements.show-announcements-setting-description"),
      )}
    </div>
  );
}

export default GroupPreferencesEditor;
