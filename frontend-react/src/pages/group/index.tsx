import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { GroupAIProviderSettingsEditor } from "~/components/Domain/Group/GroupAIProviderSettingsEditor";
import { GroupPreferencesEditor } from "~/components/Domain/Group/GroupPreferencesEditor";
import { useAIProviders } from "~/hooks/use-ai-providers";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroupSelf } from "~/hooks/use-groups";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { alert } from "~/hooks/use-toast";
import type { AIProviderCreate, AIProviderUpdate } from "~/lib/api/types/group";

export default function GroupSettingsPage() {
  const { group, actions: groupActions } = useGroupSelf();
  const i18n = useI18n();

  useSeoMeta({ title: i18n.t("group.group") });

  // useGroupSelf() caches data in a module-level singleton for the lifetime of the tab,
  // so revisiting this page via client-side navigation can otherwise show stale
  // preferences/AI settings if they were changed elsewhere (e.g. Admin Groups panel)
  // in the same session. Force a revalidation whenever this page is entered.
  useEffect(() => {
    void groupActions.refresh();
  }, [groupActions]);

  const refGroupPrefsEditForm = useRef<FormHandle>(null);
  const refGroupAISettingsForm = useRef<FormHandle>(null);

  async function handlePrefsSubmit() {
    if (!refGroupPrefsEditForm.current?.validate() || !group?.preferences) {
      return;
    }
    const data = await groupActions.updatePreferences();
    if (data) alert.success(i18n.t("settings.settings-updated"));
    else alert.error(i18n.t("settings.settings-update-failed"));
  }

  async function handleAISettingsSubmit() {
    if (!refGroupAISettingsForm.current?.validate() || !group?.aiProviderSettings) {
      return;
    }
    const data = await groupActions.updateAIProviderSettings();
    if (data) alert.success(i18n.t("settings.settings-updated"));
    else alert.error(i18n.t("settings.settings-update-failed"));
  }

  const { createOne, updateOne, deleteOne } = useAIProviders();

  async function handleCreateProvider(data: AIProviderCreate) {
    const result = await createOne(data);
    if (result.data) {
      await groupActions.refresh();
      alert.success(i18n.t("group.ai-provider-settings.provider-created"));
    }
    else {
      alert.error(i18n.t("group.ai-provider-settings.provider-create-failed"));
    }
  }

  async function handleUpdateProvider(id: string, data: AIProviderUpdate) {
    const result = await updateOne(id, data);
    if (result.data) {
      await groupActions.refresh();
      alert.success(i18n.t("group.ai-provider-settings.provider-updated"));
    }
    else {
      alert.error(i18n.t("group.ai-provider-settings.provider-update-failed"));
    }
  }

  async function handleDeleteProvider(id: string) {
    const result = await deleteOne(id);
    if (result.data) {
      await groupActions.refresh();
      alert.success(i18n.t("group.ai-provider-settings.provider-deleted"));
    }
    else {
      alert.error(i18n.t("group.ai-provider-settings.provider-delete-failed"));
    }
  }

  if (!group) {
    return null;
  }

  const cardSx = { borderColor: "lightgray" };

  return (
    <BaseContainer sx={{ maxWidth: { md: 900 } }}>
      <Box sx={{ mb: 2.5 }}>
        <BasePageTitle
          header={<BasePageTitleImage src="/svgs/manage-group-settings.svg" maxWidth={100} maxHeight={100} />}
          title={i18n.t("profile.group-settings")}
        >
          {i18n.t("profile.group-description")}
        </BasePageTitle>
      </Box>

      <Box sx={{ mb: 5 }}>
        <VForm
          ref={refGroupPrefsEditForm}
          onSubmit={(e) => {
            e.preventDefault();
            void handlePrefsSubmit();
          }}
        >
          <Card variant="outlined" sx={cardSx}>
            <CardContent>
              {group.preferences && (
                <GroupPreferencesEditor
                  value={group.preferences}
                  onChange={preferences => groupActions.set(prev => (prev ? { ...prev, preferences } : prev))}
                />
              )}
            </CardContent>
          </Card>
          <Box sx={{ display: "flex", p: 1 }}>
            <BaseButton type="submit" edit sx={{ ml: "auto" }}>{i18n.t("general.update")}</BaseButton>
          </Box>
        </VForm>
      </Box>

      <div>
        <VForm
          ref={refGroupAISettingsForm}
          onSubmit={(e) => {
            e.preventDefault();
            void handleAISettingsSubmit();
          }}
        >
          <Card variant="outlined" sx={cardSx}>
            <CardContent>
              {group.aiProviderSettings && (
                <GroupAIProviderSettingsEditor
                  value={group.aiProviderSettings}
                  onChange={aiProviderSettings => groupActions.set(prev => (prev ? { ...prev, aiProviderSettings } : prev))}
                  onCreate={data => void handleCreateProvider(data)}
                  onUpdate={(id, data) => void handleUpdateProvider(id, data)}
                  onDelete={id => void handleDeleteProvider(id)}
                />
              )}
            </CardContent>
          </Card>
          <Box sx={{ display: "flex", p: 1 }}>
            <BaseButton type="submit" edit sx={{ ml: "auto" }}>{i18n.t("general.update")}</BaseButton>
          </Box>
        </VForm>
      </div>
    </BaseContainer>
  );
}
