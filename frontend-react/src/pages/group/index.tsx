import { useEffect, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { GroupAIProviderSettingsEditor } from "@/components/Domain/Group/GroupAIProviderSettingsEditor";
import { GroupPreferencesEditor } from "@/components/Domain/Group/GroupPreferencesEditor";
import { useAIProviders } from "@/hooks/use-ai-providers";
import { useGroupSelf } from "@/hooks/use-groups";
import { alert } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { AIProviderCreate, AIProviderUpdate } from "@/lib/api/types/group";

// Port of pages/group/index.vue. Middleware ["auth", "can-manage-only"] is the loader guard in routes/group.tsx.
export default function GroupSettingsPage() {
  const { t } = useI18n();
  const { group, actions: groupActions } = useGroupSelf();

  usePageTitle(t("group.group"));

  // useGroupSelf() caches data in a module-level singleton for the lifetime of the tab,
  // so revisiting this page via client-side navigation can otherwise show stale
  // preferences/AI settings if they were changed elsewhere (e.g. Admin Groups panel)
  // in the same session. Force a revalidation whenever this page is entered.
  useEffect(() => {
    void groupActions.refresh();
  }, [groupActions]);

  const { createOne, updateOne, deleteOne } = useAIProviders();

  async function handlePrefsSubmit(event: FormEvent) {
    event.preventDefault();
    if (!group?.preferences) {
      return;
    }

    const data = await groupActions.updatePreferences(group.preferences);
    if (data) {
      alert.success(t("settings.settings-updated"));
    }
    else {
      alert.error(t("settings.settings-update-failed"));
    }
  }

  async function handleAISettingsSubmit(event: FormEvent) {
    event.preventDefault();
    if (!group?.aiProviderSettings) {
      return;
    }

    const data = await groupActions.updateAIProviderSettings(group.aiProviderSettings);
    if (data) {
      alert.success(t("settings.settings-updated"));
    }
    else {
      alert.error(t("settings.settings-update-failed"));
    }
  }

  async function handleCreateProvider(data: AIProviderCreate) {
    const result = await createOne(data);
    if (result.data) {
      await groupActions.refresh();
      alert.success(t("group.ai-provider-settings.provider-created"));
    }
    else {
      alert.error(t("group.ai-provider-settings.provider-create-failed"));
    }
  }

  async function handleUpdateProvider(id: string, data: AIProviderUpdate) {
    const result = await updateOne(id, data);
    if (result.data) {
      await groupActions.refresh();
      alert.success(t("group.ai-provider-settings.provider-updated"));
    }
    else {
      alert.error(t("group.ai-provider-settings.provider-update-failed"));
    }
  }

  async function handleDeleteProvider(id: string) {
    const result = await deleteOne(id);
    if (result.data) {
      await groupActions.refresh();
      alert.success(t("group.ai-provider-settings.provider-deleted"));
    }
    else {
      alert.error(t("group.ai-provider-settings.provider-delete-failed"));
    }
  }

  if (!group) {
    return null;
  }

  return (
    <Container sx={{ maxWidth: "800px !important" }}>
      <Box sx={{ mb: 5 }}>
        <BasePageTitle
          header={<BaseImg width="100%" maxHeight="100px" maxWidth="100px" src="/svgs/manage-group-settings.svg" />}
          title={t("profile.group-settings")}
        >
          {t("profile.group-description")}
        </BasePageTitle>
      </Box>

      <Box sx={{ mb: 10 }}>
        <Box component="form" onSubmit={(event: FormEvent) => void handlePrefsSubmit(event)}>
          <Card variant="outlined" sx={{ borderColor: "lightgray" }}>
            <CardContent>
              {group.preferences && (
                <GroupPreferencesEditor
                  value={group.preferences}
                  onChange={preferences => groupActions.set(current => (current ? { ...current, preferences } : current))}
                />
              )}
            </CardContent>
          </Card>
          <Box sx={{ display: "flex", p: 1 }}>
            <BaseButton type="submit" edit sx={{ ml: "auto" }}>
              {t("general.update")}
            </BaseButton>
          </Box>
        </Box>
      </Box>

      <Box>
        <Box component="form" onSubmit={(event: FormEvent) => void handleAISettingsSubmit(event)}>
          <Card variant="outlined" sx={{ borderColor: "lightgray" }}>
            <CardContent>
              {group.aiProviderSettings && (
                <GroupAIProviderSettingsEditor
                  value={group.aiProviderSettings}
                  onChange={aiProviderSettings => groupActions.set(current => (current ? { ...current, aiProviderSettings } : current))}
                  onCreate={data => void handleCreateProvider(data)}
                  onUpdate={(id, data) => void handleUpdateProvider(id, data)}
                  onDelete={id => void handleDeleteProvider(id)}
                />
              )}
            </CardContent>
          </Card>
          <Box sx={{ display: "flex", p: 1 }}>
            <BaseButton type="submit" edit sx={{ ml: "auto" }}>
              {t("general.update")}
            </BaseButton>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
