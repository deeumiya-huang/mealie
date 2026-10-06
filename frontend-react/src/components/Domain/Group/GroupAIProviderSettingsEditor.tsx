// Usage: <GroupAIProviderSettingsEditor value={settings} onChange={setSettings} onCreate={…} onUpdate={…}
//          onDelete={…} hideHeader /> — picks the default/audio/image providers and lists the providers with
// edit (opens GroupAIProviderDialog) and delete buttons. Vue `v-model` → `value` + `onChange` (called with the
// edited copy); `@create`/`@update`/`@delete` → `onCreate`/`onUpdate`/`onDelete`.
import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import type { AIProviderCreate, AIProviderUpdate } from "@/lib/api/types/group";
import type { AIProviderSettingsOut, AIProviderSummary } from "@/lib/api/types/user";
import { icons } from "@/lib/icons";
import { GroupAIProviderDialog } from "./GroupAIProviderDialog";

interface GroupAIProviderSettingsEditorProps {
  value: AIProviderSettingsOut | null | undefined;
  onChange: (value: AIProviderSettingsOut) => void;
  hideHeader?: boolean;
  onCreate?: (data: AIProviderCreate) => void;
  onUpdate?: (id: string, data: AIProviderUpdate) => void;
  onDelete?: (id: string) => void;
}

type ProviderKey = "defaultProviderId" | "audioProviderId" | "imageProviderId";

export function GroupAIProviderSettingsEditor({
  value,
  onChange,
  hideHeader = false,
  onCreate,
  onUpdate,
  onDelete,
}: GroupAIProviderSettingsEditorProps) {
  const { t } = useI18n();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  if (!value) {
    return null;
  }

  const noDefaultProviderWarning = value.providers.length > 0 && !value.defaultProviderId;

  function openCreate() {
    setEditingProviderId(null);
    setDialogOpen(true);
  }

  function openEdit(id: string) {
    setEditingProviderId(id);
    setDialogOpen(true);
  }

  const selectors: { key: ProviderKey; label: string; description: string }[] = [
    {
      key: "defaultProviderId",
      label: t("group.ai-provider-settings.default-provider"),
      description: t("group.ai-provider-settings.default-provider-description"),
    },
    {
      key: "audioProviderId",
      label: t("group.ai-provider-settings.audio-provider"),
      description: t("group.ai-provider-settings.audio-provider-description"),
    },
    {
      key: "imageProviderId",
      label: t("group.ai-provider-settings.image-provider"),
      description: t("group.ai-provider-settings.image-provider-description"),
    },
  ];

  function selectedProvider(id: string | null): AIProviderSummary | null {
    return value?.providers.find(provider => provider.id === id) ?? null;
  }

  return (
    <Box>
      {!hideHeader && (
        <>
          <BaseCardSectionTitle
            title={t("group.ai-provider-settings.ai-provider-settings")}
            appendTitle={noDefaultProviderWarning
              ? (
                  <Tooltip
                    title={t("group.ai-provider-settings.no-default-provider-warning")}
                    placement="bottom"
                    slotProps={{ tooltip: { sx: { bgcolor: "warning.main", color: "warning.contrastText" } } }}
                  >
                    <Box component="span" sx={{ display: "inline-flex", ml: 1 }}>
                      <MdiIcon path={icons.alert} size="small" color="warning" />
                    </Box>
                  </Tooltip>
                )
              : undefined}
          />
          <CardContent sx={{ pt: 0, pb: 5, px: 0 }}>
            {t("group.ai-provider-settings.ai-provider-settings-description")}
          </CardContent>
        </>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {selectors.map(selector => (
          <Grid key={selector.key} size={12}>
            <Autocomplete<AIProviderSummary>
              options={value.providers}
              value={selectedProvider(value[selector.key])}
              getOptionLabel={option => option.name}
              isOptionEqualToValue={(option, selected) => option.id === selected.id}
              size="small"
              onChange={(_event, selected) => onChange({ ...value, [selector.key]: selected?.id ?? null })}
              renderOption={(props, option) => {
                const { key: _key, ...rest } = props;
                return <li key={option.id} {...rest}>{option.name}</li>;
              }}
              renderInput={params => <TextField {...params} label={selector.label} variant="outlined" />}
            />
            <Typography variant="body2" sx={{ mt: 0.5, px: 2, color: "text.secondary" }}>
              {selector.description}
            </Typography>
          </Grid>
        ))}
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
          title={t("group.ai-provider-settings.providers")}
          size="medium"
          appendTitle={(
            <BaseButton
              text={t("group.ai-provider-settings.create-provider")}
              create
              small
              sx={{ ml: "auto", my: 1 }}
              onClick={openCreate}
            />
          )}
        />
      </Box>

      {value.providers.map(provider => (
        <Card
          key={provider.id}
          elevation={0}
          sx={theme => ({ p: 0, mb: 2, bgcolor: alpha(theme.palette.text.primary, 0.12) })}
        >
          <Grid container sx={{ alignItems: "center" }}>
            <Grid size={10}>
              <CardContent>
                {provider.name}
              </CardContent>
            </Grid>
            <Grid size={2}>
              <BaseButtonGroup
                buttons={[
                  { icon: icons.edit, text: t("general.edit"), event: "edit" },
                  { icon: icons.delete, text: t("general.delete"), event: "delete" },
                ]}
                onAction={(event) => {
                  if (event === "edit") openEdit(provider.id);
                  else if (event === "delete") onDelete?.(provider.id);
                }}
              />
            </Grid>
          </Grid>
        </Card>
      ))}
    </Box>
  );
}
