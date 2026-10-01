import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import { AppToolbar } from "~/components/global/AppToolbar";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { TextInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { GroupAIProviderSettingsEditor } from "~/components/Domain/Group/GroupAIProviderSettingsEditor";
import { GroupPreferencesEditor } from "~/components/Domain/Group/GroupPreferencesEditor";
import { useAdminApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { alert } from "~/hooks/use-toast";
import type { AIProviderCreate, AIProviderUpdate } from "~/lib/api/types/group";
import type { GroupAdminUpdate } from "~/lib/api/types/group";
import type { GroupInDB } from "~/lib/api/types/user";

export default function AdminGroupPage() {
  const params = useParams();
  const i18n = useI18n();
  const groupId = params.id as string;

  const refGroupEditForm = useRef<FormHandle>(null);
  const adminApi = useAdminApi();
  const [userError, setUserError] = useState(false);
  const [group, setGroup] = useState<GroupInDB | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setGroup(null);
      return;
    }
    const { data, error } = await adminApi.groups.getOne(groupId);

    if ((error as { response?: { status?: number } } | null)?.response?.status === 404) {
      alert.error(i18n.t("user.user-not-found"));
      setUserError(true);
    }
    setGroup(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch per group only
  }, [adminApi, groupId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSubmit() {
    if (!refGroupEditForm.current?.validate() || !group) {
      return;
    }

    const { response, data } = await adminApi.groups.updateOne(group.id, group as GroupAdminUpdate);
    if (response?.status === 200 && data) {
      if (group.slug !== data.slug) {
        // the slug updated, which invalidates the nav URLs
        window.location.reload();
      }
      setGroup(data);
      alert.success(i18n.t("settings.settings-updated"));
    }
    else {
      alert.error(i18n.t("settings.settings-update-failed"));
    }
  }

  async function handleCreateProvider(data: AIProviderCreate) {
    if (!group) return;
    const result = await adminApi.aiProviders.createProvider(group.id, data);
    if (result.data) {
      await refresh();
      alert.success(i18n.t("group.ai-provider-settings.provider-created"));
    }
    else {
      alert.error(i18n.t("group.ai-provider-settings.provider-create-failed"));
    }
  }

  async function handleUpdateProvider(id: string, data: AIProviderUpdate) {
    if (!group) return;
    const result = await adminApi.aiProviders.updateProvider(group.id, id, data);
    if (result.data) {
      await refresh();
      alert.success(i18n.t("group.ai-provider-settings.provider-updated"));
    }
    else {
      alert.error(i18n.t("group.ai-provider-settings.provider-update-failed"));
    }
  }

  async function handleDeleteProvider(id: string) {
    if (!group) return;
    const result = await adminApi.aiProviders.deleteProvider(group.id, id);
    if (result.data) {
      await refresh();
      alert.success(i18n.t("group.ai-provider-settings.provider-deleted"));
    }
    else {
      alert.error(i18n.t("group.ai-provider-settings.provider-delete-failed"));
    }
  }

  if (!group) return null;

  return (
    <BaseContainer className="narrow-container">
      <BasePageTitle
        header={<BasePageTitleImage src="/svgs/manage-group-settings.svg" maxWidth={125} maxHeight={125} />}
        title={i18n.t("group.admin-group-management")}
      />
      <AppToolbar back />
      <Box sx={{ p: 2 }}>{i18n.t("group.group-id-value", [group.id])}</Box>
      {!userError && (
        <VForm
          ref={refGroupEditForm}
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <Card variant="outlined" sx={{ borderColor: "lightgrey", p: 2 }}>
            <TextInput value={group.name} onChange={name => setGroup({ ...group, name })} label={i18n.t("group.group-name")} />
            {group.preferences && (
              <GroupPreferencesEditor value={group.preferences} onChange={preferences => setGroup({ ...group, preferences })} />
            )}
            {group.aiProviderSettings && (
              <GroupAIProviderSettingsEditor
                value={group.aiProviderSettings}
                onChange={aiProviderSettings => setGroup({ ...group, aiProviderSettings })}
                onCreate={data => void handleCreateProvider(data)}
                onUpdate={(id, data) => void handleUpdateProvider(id, data)}
                onDelete={id => void handleDeleteProvider(id)}
              />
            )}
          </Card>
          <Box sx={{ display: "flex", p: 1 }}>
            <Box sx={{ ml: "auto" }}>
              <BaseButton type="submit" edit>{i18n.t("general.update")}</BaseButton>
            </Box>
          </Box>
        </VForm>
      )}
    </BaseContainer>
  );
}
