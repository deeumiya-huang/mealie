// Usage: <GroupWebhookEditor webhook={webhook} onSave={updateOne} onDelete={deleteOne} onTest={testOne} /> — edits a copy of
// the webhook; the schedule is shown in local time and handed to `onSave` as local time (the hook converts to UTC).
import { useState } from "react";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { MdiIcon } from "@/components/global/MdiIcon";
import { timeUTCToLocal } from "@/hooks/use-group-webhooks";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { ReadWebhook } from "@/lib/api/types/household";
import { icons } from "@/lib/icons";

interface GroupWebhookEditorProps {
  webhook: ReadWebhook;
  onDelete?: (id: string) => void;
  onSave?: (webhook: ReadWebhook) => void;
  onTest?: (id: string) => void;
}

export function GroupWebhookEditor({ webhook, onDelete, onSave, onTest }: GroupWebhookEditorProps) {
  const { t } = useI18n();

  const [itemLocal, setItemLocal] = useState<string>(() => timeUTCToLocal(webhook.scheduledTime));
  const [webhookCopy, setWebhookCopy] = useState<ReadWebhook>(() => ({ ...webhook }));

  function handleSave() {
    // a cleared time cannot be converted (Vue threw); keep the stored schedule in that case
    onSave?.({ ...webhookCopy, scheduledTime: itemLocal || timeUTCToLocal(webhook.scheduledTime) });
  }

  function handleAction(event: string) {
    if (event === "delete") {
      onDelete?.(webhookCopy.id);
    }
    else if (event === "test") {
      onTest?.(webhookCopy.id);
    }
    else if (event === "save") {
      handleSave();
    }
  }

  // Set page title using useSeoMeta
  usePageTitle(t("settings.webhooks.webhooks"));

  return (
    <Box>
      <CardContent>
        <FormControlLabel
          sx={{ display: "flex" }}
          control={(
            <Switch
              color="primary"
              checked={!!webhookCopy.enabled}
              onChange={event => setWebhookCopy(current => ({ ...current, enabled: event.target.checked }))}
            />
          )}
          label={t("general.enabled")}
        />
        <TextField
          fullWidth
          variant="standard"
          label={t("settings.webhooks.webhook-name")}
          value={webhookCopy.name ?? ""}
          onChange={event => setWebhookCopy(current => ({ ...current, name: event.target.value }))}
        />
        <TextField
          fullWidth
          variant="standard"
          label={t("settings.webhooks.webhook-url")}
          value={webhookCopy.url ?? ""}
          onChange={event => setWebhookCopy(current => ({ ...current, url: event.target.value }))}
          sx={{ mt: 1 }}
        />
        <TextField
          fullWidth
          type="time"
          variant="standard"
          value={itemLocal}
          onChange={event => setItemLocal(event.target.value)}
          sx={{ mt: 1 }}
          slotProps={{
            input: {
              endAdornment: itemLocal
                ? (
                    <InputAdornment position="end">
                      <IconButton size="small" edge="end" aria-label={t("general.clear")} onClick={() => setItemLocal("")}>
                        <MdiIcon path={icons.close} size="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                : undefined,
            },
          }}
        />
      </CardContent>
      <CardActions sx={{ py: 0, justifyContent: "flex-end" }}>
        <BaseButtonGroup
          buttons={[
            {
              icon: icons.delete,
              text: t("general.delete"),
              event: "delete",
            },
            {
              icon: icons.testTube,
              text: t("general.test"),
              event: "test",
            },
            {
              icon: icons.save,
              text: t("general.save"),
              event: "save",
            },
          ]}
          onAction={handleAction}
        />
      </CardActions>
    </Box>
  );
}
