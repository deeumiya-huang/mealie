import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import { AppToolbar } from "~/components/global/AppToolbar";
import { AutoForm } from "~/components/global/AutoForm";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { SelectInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { useAdminApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroups } from "~/hooks/use-groups";
import { useUserForm } from "~/hooks/use-users/user-form";
import { validators } from "~/hooks/use-validators";
import type { GroupHouseholdSummary, GroupInDB, UserIn } from "~/lib/api/types/user";

export default function AdminCreateUserPage() {
  const i18n = useI18n();
  const { userForm } = useUserForm();
  const { groups } = useGroups();
  const navigate = useNavigate();

  const refNewUserForm = useRef<FormHandle>(null);
  const adminApi = useAdminApi();

  const [selectedGroup, setSelectedGroup] = useState<GroupInDB | null>(null);
  const households = selectedGroup?.households || [];

  const [newUserData, setNewUserData] = useState({
    username: "",
    fullName: "",
    email: "",
    admin: false,
    household: "",
    advanced: false,
    canInvite: false,
    canManage: false,
    canOrganize: false,
    password: "",
    authMethod: "Mealie",
  });

  async function handleSubmit() {
    if (!refNewUserForm.current?.validate()) return;

    const { response } = await adminApi.users.createOne({
      ...newUserData,
      group: selectedGroup?.name || "",
    } as UserIn);

    if (response?.status === 201) {
      void navigate("/admin/manage/users");
    }
  }

  return (
    <BaseContainer className="narrow-container">
      <Box sx={{ mb: 1 }}>
        <BasePageTitle
          header={<BasePageTitleImage src="/svgs/manage-profile.svg" maxWidth={125} maxHeight={125} />}
          title={i18n.t("user.admin-user-creation")}
        />
      </Box>
      <AppToolbar back />
      <VForm
        ref={refNewUserForm}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <Card variant="outlined">
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid size={6}>
                <SelectInput<GroupInDB, GroupInDB | null>
                  value={selectedGroup}
                  onChange={setSelectedGroup}
                  items={groups || []}
                  itemTitle="name"
                  returnObject
                  variant="filled"
                  label={i18n.t("group.user-group")}
                  rules={[validators.required]}
                />
              </Grid>
              <Grid size={6}>
                <SelectInput<GroupHouseholdSummary, string>
                  value={newUserData.household}
                  onChange={household => setNewUserData({ ...newUserData, household })}
                  disabled={!selectedGroup}
                  items={households}
                  itemTitle="name"
                  itemValue="name"
                  variant="filled"
                  label={i18n.t("household.user-household")}
                  hint={selectedGroup ? "" : i18n.t("group.you-must-select-a-group-before-selecting-a-household")}
                  persistentHint
                  rules={[validators.required]}
                />
              </Grid>
            </Grid>
            <AutoForm value={newUserData} onChange={setNewUserData} items={userForm} />
          </Box>
        </Card>
        <Box sx={{ display: "flex", p: 1 }}>
          <Box sx={{ ml: "auto" }}>
            <BaseButton type="submit" />
          </Box>
        </Box>
      </VForm>
    </BaseContainer>
  );
}
