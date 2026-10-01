import { useState } from "react";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { TextInput } from "~/components/global/form";
import { timeUTCToLocal } from "~/hooks/use-group-webhooks";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";
import type { ReadWebhook } from "~/lib/api/types/household";

export interface GroupWebhookEditorProps {
  webhook: ReadWebhook;
  onDelete?: (id: string) => void;
  onSave?: (webhook: ReadWebhook) => void;
  onTest?: (id: string) => void;
}

export function GroupWebhookEditor({ webhook, onDelete, onSave, onTest }: GroupWebhookEditorProps) {
  const i18n = useI18n();
  // The editor works in local time; the save handler converts back to UTC
  const [scheduledTime, setScheduledTime] = useState(() => timeUTCToLocal(webhook.scheduledTime));
  const [webhookCopy, setWebhookCopy] = useState<ReadWebhook>({ ...webhook });

  return (
    <div>
      <Box sx={{ p: 2 }}>
        <FormControlLabel
          control={<Switch checked={webhookCopy.enabled} onChange={e => setWebhookCopy({ ...webhookCopy, enabled: e.target.checked })} />}
          label={i18n.t("general.enabled")}
        />
        <TextInput value={webhookCopy.name} onChange={name => setWebhookCopy({ ...webhookCopy, name })} label={i18n.t("settings.webhooks.webhook-name")} variant="underlined" />
        <TextInput value={webhookCopy.url} onChange={url => setWebhookCopy({ ...webhookCopy, url })} label={i18n.t("settings.webhooks.webhook-url")} variant="underlined" />
        <TextInput value={scheduledTime} onChange={setScheduledTime} type="time" clearable variant="underlined" />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", py: 0, px: 1 }}>
        <BaseButtonGroup
          buttons={[
            { icon: icons.delete, text: i18n.t("general.delete"), event: "delete" },
            { icon: icons.testTube, text: i18n.t("general.test"), event: "test" },
            { icon: icons.save, text: i18n.t("general.save"), event: "save" },
          ]}
          onEvent={(event) => {
            if (event === "delete") onDelete?.(webhookCopy.id);
            if (event === "test") onTest?.(webhookCopy.id);
            if (event === "save") onSave?.({ ...webhookCopy, scheduledTime });
          }}
        />
      </Box>
    </div>
  );
}

export default GroupWebhookEditor;
