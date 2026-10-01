import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { Icon } from "~/components/global/Icon";
import { AutocompleteInput } from "~/components/global/form";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";
import type { AIProviderCreate, AIProviderUpdate } from "~/lib/api/types/group";
import type { AIProviderSettingsOut } from "~/lib/api/types/user";
import { GroupAIProviderDialog } from "./GroupAIProviderDialog";

export interface GroupAIProviderSettingsEditorProps {
  value: AIProviderSettingsOut;
  onChange: (value: AIProviderSettingsOut) => void;
  hideHeader?: boolean;
  onCreate?: (data: AIProviderCreate) => void;
  onUpdate?: (id: string, data: AIProviderUpdate) => void;
  onDelete?: (id: string) => void;
}

type ProviderKey = "defaultProviderId" | "audioProviderId" | "imageProviderId";

export function GroupAIProviderSettingsEditor({ value: local, onChange, hideHeader = false, onCreate, onUpdate, onDelete }: GroupAIProviderSettingsEditorProps) {
  const i18n = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  const noDefaultProviderWarning = local.providers.length > 0 && !local.defaultProviderId;

  const providerSelect = (key: ProviderKey, label: string, description: string) => (
    <Grid size={12}>
      <AutocompleteInput<(typeof local.providers)[number]>
        value={local[key] ?? null}
        onChange={(v: string | null) => onChange({ ...local, [key]: v ?? null })}
        label={label}
        items={local.providers}
        itemTitle="name"
        itemValue="id"
        clearable
        hideDetails
        density="compact"
        variant="outlined"
      />
      <Typography variant="body2" sx={{ mt: 0.5, px: 2, color: "text.secondary" }}>{description}</Typography>
    </Grid>
  );

  return (
    <div>
      {!hideHeader && (
        <>
          <BaseCardSectionTitle
            title={i18n.t("group.ai-provider-settings.ai-provider-settings")}
            appendTitle={noDefaultProviderWarning && (
              <Tooltip title={i18n.t("group.ai-provider-settings.no-default-provider-warning")} placement="bottom">
                <span style={{ display: "inline-flex", marginInlineStart: 8 }}><Icon path={icons.alert} size="small" color="warning" /></span>
              </Tooltip>
            )}
          />
          <Box sx={{ pt: 0, pb: 5 }}>{i18n.t("group.ai-provider-settings.ai-provider-settings-description")}</Box>
        </>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {providerSelect("defaultProviderId", i18n.t("group.ai-provider-settings.default-provider"), i18n.t("group.ai-provider-settings.default-provider-description"))}
        {providerSelect("audioProviderId", i18n.t("group.ai-provider-settings.audio-provider"), i18n.t("group.ai-provider-settings.audio-provider-description"))}
        {providerSelect("imageProviderId", i18n.t("group.ai-provider-settings.image-provider"), i18n.t("group.ai-provider-settings.image-provider-description"))}
      </Grid>

      <GroupAIProviderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        providerId={editingProviderId ?? undefined}
        onCreate={data => onCreate?.(data)}
        onUpdate={(id, data) => onUpdate?.(id, data)}
      />

      <Box sx={{ pt: 1 }}>
        <BaseCardSectionTitle
          title={i18n.t("group.ai-provider-settings.providers")}
          size="medium"
          appendTitle={(
            <Box sx={{ ml: "auto", my: 1 }}>
              <BaseButton
                text={i18n.t("group.ai-provider-settings.create-provider")}
                create
                small
                onClick={() => {
                  setEditingProviderId(null);
                  setDialogOpen(true);
                }}
              />
            </Box>
          )}
        />
      </Box>

      {local.providers.map(provider => (
        <Card key={provider.id} variant="outlined" sx={{ p: 0, mb: 2, bgcolor: "action.hover" }}>
          <Grid container sx={{ alignItems: "center" }}>
            <Grid size={10}>
              <Box sx={{ p: 2 }}>{provider.name}</Box>
            </Grid>
            <Grid size={2}>
              <BaseButtonGroup
                buttons={[
                  { icon: icons.edit, text: i18n.t("general.edit"), event: "edit" },
                  { icon: icons.delete, text: i18n.t("general.delete"), event: "delete" },
                ]}
                onEvent={(event) => {
                  if (event === "edit") {
                    setEditingProviderId(provider.id);
                    setDialogOpen(true);
                  }
                  if (event === "delete") onDelete?.(provider.id);
                }}
              />
            </Grid>
          </Grid>
        </Card>
      ))}
    </div>
  );
}

export default GroupAIProviderSettingsEditor;
