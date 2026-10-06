import { useEffect, useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useParams } from "react-router";
import { AppButtonCopy } from "@/components/global/AppButtonCopy";
import { AppToolbar } from "@/components/global/AppToolbar";
import { AutoForm } from "@/components/global/AutoForm";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { useAdminApi, useUserApi } from "@/hooks/api";
import { useGroups } from "@/hooks/use-groups";
import { useAdminHouseholds } from "@/hooks/use-households";
import { alert } from "@/hooks/use-toast";
import { useUserForm } from "@/hooks/use-users";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { UserOut } from "@/lib/api/types/user";
import { icons } from "@/lib/icons";

export default function AdminManageUsersUserPage() {
  const { t } = useI18n();
  const { userForm } = useUserForm();
  const { groups } = useGroups();
  const { householdsInGroup } = useAdminHouseholds();
  const params = useParams();
  const adminApi = useAdminApi();
  const userApi = useUserApi();

  const userId = params.id as string;

  // ==============================================
  // New User Form

  const [user, setUser] = useState<UserOut | null>(null);
  const households = householdsInGroup(user?.groupId || "");

  const disabledFields = user?.authMethod !== "Mealie" ? ["admin"] : [];

  const [userError, setUserError] = useState(false);

  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await adminApi.users.getOne(userId);

      if (!active) return;

      if (error?.response?.status === 404) {
        alert.error(t("user.user-not-found"));
        setUserError(true);
      }

      if (data) {
        setUser(data);
      }
    })();
    return () => {
      active = false;
    };
    // Loaded once on mount (Vue `onMounted`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useFormValidation({
    group: field<string>(user?.group ?? "", [validators.required]),
    household: field<string>(user?.household ?? "", [validators.required]),
  });

  async function handleSubmit() {
    if (!form.validate() || user === null) return;

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
      alert.success(t("profile.email-sent"));
    }
    else {
      alert.error(t("profile.error-sending-email"));
    }
  }

  if (!user) {
    return null;
  }

  // A select shows nothing (instead of MUI's out-of-range warning) until its options have loaded.
  const groupValue = groups?.some(group => group.name === user.group) ? user.group : "";
  const householdValue = households.some(household => household.name === user.household) ? user.household : "";

  return (
    <Container sx={{ maxWidth: "800px !important" }}>
      <BasePageTitle
        header={<BaseImg width="100%" maxHeight="125px" maxWidth="125px" src="/svgs/manage-profile.svg" />}
        title={t("user.admin-user-management")}
      >
        {t("user.changes-reflected-immediately")}
      </BasePageTitle>
      <AppToolbar back />
      {!userError && (
        <Box
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <Card variant="outlined" sx={{ borderColor: "lightgrey" }}>
            <Paper elevation={0} sx={{ pt: 2 }}>
              <CardContent>
                <Box sx={{ display: "flex" }}>
                  <p>{t("user.user-id-with-value", { id: user.id })}</p>
                </Box>
                {/* This is disabled since we can't properly handle changing the user's group in most scenarios */}

                <Grid container spacing={2}>
                  <Grid size={6}>
                    {groups && (
                      <TextField
                        select
                        fullWidth
                        disabled
                        variant="filled"
                        label={t("group.user-group")}
                        value={groupValue}
                        {...form.fieldProps("group")}
                      >
                        {groups.map(group => (
                          <MenuItem key={group.id} value={group.name}>
                            {group.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      select
                      fullWidth
                      variant="filled"
                      label={t("household.user-household")}
                      value={householdValue}
                      {...form.fieldProps("household")}
                      onChange={(event) => {
                        form.touch("household");
                        setUser(current => (current ? { ...current, household: event.target.value } : current));
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
                <Box sx={{ display: "flex", py: 1, pr: 1 }}>
                  <BaseButton
                    type="button"
                    loading={generatingToken}
                    create
                    onClick={(event) => {
                      event.preventDefault();
                      void handlePasswordReset();
                    }}
                  >
                    {t("user.generate-password-reset-link")}
                  </BaseButton>
                </Box>

                {resetUrl && (
                  <Box sx={{ mb: 1 }}>
                    <CardContent>
                      <Typography component="p" sx={{ textAlign: "center", pb: 0 }}>
                        {resetUrl}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ alignItems: "center", pt: 0, gap: "4px" }}>
                      <BaseButton cancel onClick={() => setResetUrl("")}>
                        {t("general.close")}
                      </BaseButton>
                      <Box sx={{ flexGrow: 1 }} />
                      {user.email && (
                        <BaseButton color="info" icon={icons.email} sx={{ mr: 0.5 }} onClick={() => void sendResetEmail()}>
                          {t("user.email")}
                        </BaseButton>
                      )}
                      <AppButtonCopy icon={false} color="info" copyText={resetUrl} />
                    </CardActions>
                  </Box>
                )}

                <AutoForm
                  value={user as unknown as Record<string, unknown>}
                  onChange={value => setUser(value as unknown as UserOut)}
                  items={userForm}
                  updateMode
                  disabledFields={disabledFields}
                />
              </CardContent>
            </Paper>
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
