import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import { AppButtonCopy } from "~/components/global/AppButtonCopy";
import { AppToolbar } from "~/components/global/AppToolbar";
import { AutoForm } from "~/components/global/AutoForm";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { SelectInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { useAdminApi, useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroups } from "~/hooks/use-groups";
import { useAdminHouseholds } from "~/hooks/use-households";
import { alert } from "~/hooks/use-toast";
import { useUserForm } from "~/hooks/use-users/user-form";
import { validators } from "~/hooks/use-validators";
import type { HouseholdInDB } from "~/lib/api/types/household";
import type { GroupInDB, UserOut } from "~/lib/api/types/user";
import { icons } from "~/lib/icons";

export default function AdminUserPage() {
  const { userForm } = useUserForm();
  const { groups } = useGroups();
  const { householdsInGroup } = useAdminHouseholds();
  const i18n = useI18n();
  const params = useParams();

  const userId = params.id as string;

  const refNewUserForm = useRef<FormHandle>(null);
  const adminApi = useAdminApi();
  const userApi = useUserApi();

  const [user, setUser] = useState<UserOut | null>(null);
  const households = householdsInGroup(user?.groupId || "");

  const disabledFields = user?.authMethod !== "Mealie" ? ["admin"] : [];

  const [userError, setUserError] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);

  useEffect(() => {
    void adminApi.users.getOne(userId).then(({ data, error }) => {
      if ((error as { response?: { status?: number } } | null)?.response?.status === 404) {
        alert.error(i18n.t("user.user-not-found"));
        setUserError(true);
      }

      if (data) {
        setUser(data);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per user
  }, [adminApi, userId]);

  async function handleSubmit() {
    if (!refNewUserForm.current?.validate() || user === null) return;

    const { response, data } = await adminApi.users.updateOne(user.id, user);

    if (response?.status === 200 && data) {
      setUser(data);
    }
  }

  async function handlePasswordReset() {
    if (user === null) return;
    setGeneratingToken(true);

    const { response, data } = await adminApi.users.generatePasswordResetToken({ email: user.email });

    if (response?.status === 201 && data) {
      const token: string = data.token;
      setResetUrl(`${window.location.origin}/reset-password/?token=${token}`);
    }

    setGeneratingToken(false);
  }

  async function sendResetEmail() {
    if (!user?.email) return;
    const { response } = await userApi.email.sendForgotPassword({ email: user.email });
    if (response && response.status === 200) {
      alert.success(i18n.t("profile.email-sent"));
    }
    else {
      alert.error(i18n.t("profile.error-sending-email"));
    }
  }

  if (!user) return null;

  return (
    <BaseContainer className="narrow-container">
      <BasePageTitle
        header={<BasePageTitleImage src="/svgs/manage-profile.svg" maxWidth={125} maxHeight={125} />}
        title={i18n.t("user.admin-user-management")}
      >
        {i18n.t("user.changes-reflected-immediately")}
      </BasePageTitle>
      <AppToolbar back />
      {!userError && (
        <VForm
          ref={refNewUserForm}
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <Card variant="outlined" sx={{ borderColor: "lightgrey" }}>
            <Box sx={{ p: 2, pt: 3 }}>
              <Box sx={{ display: "flex" }}>
                <p>{i18n.t("user.user-id-with-value", { id: user.id })}</p>
              </Box>
              {/* This is disabled since we can't properly handle changing the user's group in most scenarios */}
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid size={6}>
                  {groups && (
                    <SelectInput<GroupInDB, string | undefined>
                      value={user.group}
                      disabled
                      items={groups}
                      variant="solo-filled"
                      itemTitle="name"
                      itemValue="name"
                      label={i18n.t("group.user-group")}
                      rules={[validators.required]}
                    />
                  )}
                </Grid>
                <Grid size={6}>
                  {households && (
                    <SelectInput<HouseholdInDB, string | undefined>
                      value={user.household}
                      onChange={household => setUser({ ...user, household: household ?? "" })}
                      items={households}
                      variant="solo-filled"
                      itemTitle="name"
                      itemValue="name"
                      label={i18n.t("household.user-household")}
                      rules={[validators.required]}
                    />
                  )}
                </Grid>
              </Grid>
              <Box sx={{ display: "flex", py: 1, pr: 1 }}>
                <BaseButton type="button" loading={generatingToken} create onClick={() => void handlePasswordReset()}>
                  {i18n.t("user.generate-password-reset-link")}
                </BaseButton>
              </Box>

              {resetUrl && (
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ p: 2 }}>
                    <p style={{ textAlign: "center" }}>{resetUrl}</p>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px", px: 1 }}>
                    <BaseButton cancel onClick={() => setResetUrl("")}>
                      {i18n.t("general.close")}
                    </BaseButton>
                    <Box sx={{ flexGrow: 1 }} />
                    {user.email && (
                      <BaseButton color="info" icon={icons.email} sx={{ mr: 0.5 }} onClick={() => void sendResetEmail()}>
                        {i18n.t("user.email")}
                      </BaseButton>
                    )}
                    <AppButtonCopy icon={false} color="info" copyText={resetUrl} />
                  </Box>
                </Box>
              )}

              <AutoForm value={user} onChange={setUser} items={userForm} updateMode disabledFields={disabledFields} />
            </Box>
          </Card>
          <Box sx={{ display: "flex", p: 1 }}>
            <Box sx={{ ml: "auto" }}>
              <BaseButton type="submit" edit>
                {i18n.t("general.update")}
              </BaseButton>
            </Box>
          </Box>
        </VForm>
      )}
    </BaseContainer>
  );
}
