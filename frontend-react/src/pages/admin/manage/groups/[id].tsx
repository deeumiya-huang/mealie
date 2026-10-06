import { useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import TextField from "@mui/material/TextField";
import { useParams } from "react-router";
import { AppToolbar } from "@/components/global/AppToolbar";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { GroupAIProviderSettingsEditor } from "@/components/Domain/Group/GroupAIProviderSettingsEditor";
import { GroupPreferencesEditor } from "@/components/Domain/Group/GroupPreferencesEditor";
import { useAdminApi } from "@/hooks/api";
import { alert } from "@/hooks/use-toast";
import { useAsyncData } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { AIProviderCreate, AIProviderUpdate } from "@/lib/api/types/group";
import type { GroupInDB } from "@/lib/api/types/user";

export default function AdminManageGroupsGroupPage() {
  const { t } = useI18n();
  const params = useParams();
  const adminApi = useAdminApi();

  const groupId = params.id as string;

  const [userError, setUserError] = useState(false);

  const { data: loadedGroup, refresh } = useAsyncData<GroupInDB | null>(`get-group-${groupId}`, async () => {
    if (!groupId) {
      return null;
    }
    const { data, error } = await adminApi.groups.getOne(groupId);

    if (error?.response?.status === 404) {
      alert.error(t("user.user-not-found"));
      setUserError(true);
    }
    return data;
  }, [groupId]);

  // The form edits a copy of the loaded group (Vue mutated the async data in place); reloading or a
  // successful save replaces the edits with the server's version.
  const [edited, setEdited] = useState<{ source: GroupInDB | null; group: GroupInDB } | null>(null);
  const group = edited && edited.source === loadedGroup ? edited.group : loadedGroup;

  function updateGroup(change: Partial<GroupInDB>) {
    if (!group) return;
    setEdited({ source: loadedGroup, group: { ...group, ...change } });
  }

  async function handleSubmit() {
    if (!group) {
      return;
    }

    const { response, data } = await adminApi.groups.updateOne(group.id, group);
    if (response?.status === 200 && data) {
      if (group.slug !== data.slug) {
        // the slug updated, which invalidates the nav URLs
        window.location.reload();
      }
      setEdited({ source: loadedGroup, group: data });
      alert.success(t("settings.settings-updated"));
    }
    else {
      alert.error(t("settings.settings-update-failed"));
    }
  }

  async function handleCreateProvider(data: AIProviderCreate) {
    if (!group) return;
    const result = await adminApi.aiProviders.createProvider(group.id, data);
    if (result.data) {
      await refresh();
      alert.success(t("group.ai-provider-settings.provider-created"));
    }
    else {
      alert.error(t("group.ai-provider-settings.provider-create-failed"));
    }
  }

  async function handleUpdateProvider(id: string, data: AIProviderUpdate) {
    if (!group) return;
    const result = await adminApi.aiProviders.updateProvider(group.id, id, data);
    if (result.data) {
      await refresh();
      alert.success(t("group.ai-provider-settings.provider-updated"));
    }
    else {
      alert.error(t("group.ai-provider-settings.provider-update-failed"));
    }
  }

  async function handleDeleteProvider(id: string) {
    if (!group) return;
    const result = await adminApi.aiProviders.deleteProvider(group.id, id);
    if (result.data) {
      await refresh();
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
      <BasePageTitle
        header={<BaseImg width="100%" maxHeight="125px" maxWidth="125px" src="/svgs/manage-group-settings.svg" />}
        title={t("group.admin-group-management")}
      />
      <AppToolbar back />
      <CardContent>{t("group.group-id-value", [group.id])}</CardContent>
      {!userError && (
        <Box
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <Card variant="outlined" sx={{ borderColor: "lightgrey" }}>
            <CardContent>
              <TextField
                fullWidth
                variant="filled"
                label={t("group.group-name")}
                value={group.name}
                onChange={event => updateGroup({ name: event.target.value })}
              />
              {group.preferences && (
                <GroupPreferencesEditor
                  value={group.preferences}
                  onChange={preferences => updateGroup({ preferences })}
                />
              )}
              {group.aiProviderSettings && (
                <GroupAIProviderSettingsEditor
                  value={group.aiProviderSettings}
                  onChange={aiProviderSettings => updateGroup({ aiProviderSettings })}
                  onCreate={data => void handleCreateProvider(data)}
                  onUpdate={(id, data) => void handleUpdateProvider(id, data)}
                  onDelete={id => void handleDeleteProvider(id)}
                />
              )}
            </CardContent>
          </Card>
          <Box sx={{ display: "flex", p: 1 }}>
            <BaseButton type="button" edit sx={{ ml: "auto" }} onClick={() => void handleSubmit()}>
              {t("general.update")}
            </BaseButton>
          </Box>
        </Box>
      )}
    </Container>
  );
}
