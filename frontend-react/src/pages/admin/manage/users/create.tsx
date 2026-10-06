import { useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import { useNavigate } from "react-router";
import { AppToolbar } from "@/components/global/AppToolbar";
import { AutoForm } from "@/components/global/AutoForm";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { useAdminApi } from "@/hooks/api";
import { useGroups } from "@/hooks/use-groups";
import { useUserForm } from "@/hooks/use-users";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { UserIn } from "@/lib/api/types/user";

interface NewUserData {
  username: string;
  fullName: string;
  email: string;
  admin: boolean;
  group: string;
  household: string;
  advanced: boolean;
  canInvite: boolean;
  canManage: boolean;
  canOrganize: boolean;
  password: string;
  authMethod: string;
}

export default function AdminManageUsersCreatePage() {
  const { t } = useI18n();
  const { userForm } = useUserForm();
  const { groups } = useGroups();
  const navigate = useNavigate();
  const adminApi = useAdminApi();

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const selectedGroup = (groups ?? []).find(group => group.id === selectedGroupId);
  const households = selectedGroup?.households || [];

  const [newUserData, setNewUserData] = useState<Omit<NewUserData, "group">>({
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

  const form = useFormValidation({
    group: field<string>(selectedGroupId, [validators.required]),
    household: field<string>(newUserData.household, [validators.required]),
  });

  async function handleSubmit() {
    // Only the group/household rules gate the submit (the AutoForm is a nested form in Vue).
    if (!form.validate()) return;

    const payload: NewUserData = { ...newUserData, group: selectedGroup?.name || "" };
    const { response } = await adminApi.users.createOne(payload as unknown as UserIn);

    if (response?.status === 201) {
      void navigate("/admin/manage/users");
    }
  }

  return (
    <Container sx={{ maxWidth: "800px !important" }}>
      <BasePageTitle
        header={<BaseImg width="100%" maxHeight="125px" maxWidth="125px" src="/svgs/manage-profile.svg" />}
        title={t("user.admin-user-creation")}
      />
      <AppToolbar back />
      <Box
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Paper elevation={0}>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField
                    select
                    fullWidth
                    variant="filled"
                    label={t("group.user-group")}
                    value={selectedGroupId}
                    {...form.fieldProps("group")}
                    onChange={(event) => {
                      form.touch("group");
                      setSelectedGroupId(event.target.value);
                    }}
                  >
                    {(groups || []).map(group => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={6}>
                  <TextField
                    select
                    fullWidth
                    variant="filled"
                    disabled={!selectedGroup}
                    label={t("household.user-household")}
                    value={newUserData.household}
                    {...form.fieldProps("household")}
                    helperText={form.fieldProps("household").helperText
                      ?? (selectedGroup ? "" : t("group.you-must-select-a-group-before-selecting-a-household"))}
                    onChange={(event) => {
                      form.touch("household");
                      setNewUserData(current => ({ ...current, household: event.target.value }));
                    }}
                  >
                    {households.map(household => (
                      <MenuItem key={household.id} value={household.name}>
                        {household.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Paper>
            <AutoForm
              value={newUserData}
              onChange={value => setNewUserData(value as typeof newUserData)}
              items={userForm}
            />
          </CardContent>
        </Card>
        <Box sx={{ display: "flex", p: 1 }}>
          <BaseButton type="button" sx={{ ml: "auto" }} onClick={() => void handleSubmit()} />
        </Box>
      </Box>
    </Container>
  );
}
