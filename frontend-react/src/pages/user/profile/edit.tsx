import { useState, type ReactNode } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import Fade from "@mui/material/Fade";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { Link } from "react-router";
import { AppButtonUpload } from "@/components/global/AppButtonUpload";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { ToggleState } from "@/components/global/ToggleState";
import { UserAvatar } from "@/components/Domain/User/UserAvatar";
import { UserPasswordStrength } from "@/components/Domain/User/UserPasswordStrength";
import { useUserApi } from "@/hooks/api";
import useDefaultActivity from "@/hooks/use-default-activity";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useUserActivityPreferences } from "@/hooks/use-users/preferences";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { ActivityKey } from "@/lib/api/types/activity";
import type { UserBase, UserOut } from "@/lib/api/types/user";
import { icons } from "@/lib/icons";
import { useAppInfo } from "@/providers/app-info";

/** `prepend-icon` of a Vuetify field: the icon sits outside the field, aligned with the input. */
function PrependIcon({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, pb: 0.5 }}>
      <MdiIcon path={icon} sx={{ mt: 2, color: "text.secondary" }} />
      <Box sx={{ flexGrow: 1 }}>{children}</Box>
    </Box>
  );
}

type UserCopy = Partial<UserOut>;

export default function UserProfileEditPage() {
  const i18n = useI18n();
  const { t } = i18n;
  const auth = useMealieAuth();
  const appInfo = useAppInfo();
  const api = useUserApi();
  const { getDefaultActivityLabels, getActivityLabel, getActivityKey } = useDefaultActivity();
  const user = auth.user;

  usePageTitle(t("settings.profile"));

  const [activityPreferences, setActivityPreferences] = useUserActivityPreferences();
  const activityOptions = getDefaultActivityLabels(i18n);
  const [selectedDefaultActivity, setSelectedDefaultActivity] = useState(
    () => getActivityLabel(i18n, activityPreferences.defaultActivity),
  );

  function selectDefaultActivity(label: string) {
    setSelectedDefaultActivity(label);
    setActivityPreferences(current => ({
      ...current,
      defaultActivity: getActivityKey(i18n, label) ?? ActivityKey.RECIPES,
    }));
  }

  // The copy is what the form edits; it starts over whenever the session user is reloaded.
  const [userCopy, setUserCopy] = useState<UserCopy>(() => ({ ...user }));
  const [syncedUser, setSyncedUser] = useState(user);
  if (user !== syncedUser) {
    setSyncedUser(user);
    setUserCopy({ ...user });
  }

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState({
    current: "",
    newOne: "",
    newTwo: "",
  });

  const passwordsMatch = password.newOne === password.newTwo && password.newOne.length > 0;

  const passChange = useFormValidation({
    current: field(password.current, [validators.minLength(1)]),
    newOne: field(password.newOne, [validators.minLength(8)]),
    newTwo: field(password.newTwo, [() => password.newOne === password.newTwo || t("user.password-must-match")]),
  });

  async function updateUser(userData: UserCopy) {
    if (!userData.id || !userData.email) return;

    const updatePayload: UserBase = {
      id: userData.id,
      username: userData.username,
      fullName: userData.fullName,
      email: userData.email,
      authMethod: userData.authMethod,
      admin: userData.admin,
      group: userData.group,
      household: userData.household,
      showAnnouncements: userData.showAnnouncements,
      advanced: userData.advanced,
      canInvite: userData.canInvite,
      canManage: userData.canManage,
      canManageHousehold: userData.canManageHousehold,
      canOrganize: userData.canOrganize,
    };

    const { response } = await api.users.updateOne(userData.id, updatePayload);
    if (response?.status === 200) {
      void auth.getSession();
    }
  }

  function setPreference(key: "showAnnouncements" | "advanced", value: boolean) {
    const next = { ...userCopy, [key]: value };
    setUserCopy(next);
    void updateUser(next);
  }

  async function updatePassword() {
    if (!userCopy.id) {
      return;
    }
    const { response } = await api.users.changePassword({
      currentPassword: password.current,
      newPassword: password.newOne,
    });

    if (response?.status === 200) {
      // The new password invalidates this session server-side, so end it here rather than letting the
      // next request fail its way to the login page.
      await auth.signOut();
    }
  }

  const passwordToggle = {
    endAdornment: (
      <InputAdornment position="end">
        <IconButton tabIndex={-1} aria-hidden edge="end" onClick={() => setShowPassword(value => !value)}>
          <MdiIcon path={showPassword ? icons.eye : icons.eyeOff} />
        </IconButton>
      </InputAdornment>
    ),
  };

  /** Vuetify `validate-on="blur"`: the messages show once the field lost focus. */
  function blurProps(name: keyof typeof passChange.errors) {
    const message = passChange.errorFor(name);
    return {
      error: message !== null,
      helperText: message ?? undefined,
      onBlur: () => passChange.touch(name),
    };
  }

  return (
    <Container sx={{ maxWidth: "800px !important" }}>
      <BasePageTitle
        divider
        header={(
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <UserAvatar tooltip={false} size="96" userId={userCopy.id ?? ""} />
            <Box sx={{ my: 0.5 }}>
              <AppButtonUpload
                fileName="profile"
                accept="image/*"
                url={`/api/users/${userCopy.id}/image`}
                onUploaded={() => void auth.getSession()}
              />
            </Box>
          </Box>
        )}
        title={t("profile.user-settings")}
      />

      <Box component="section" sx={{ mt: 2.5 }}>
        <ToggleState
          tag="article"
          renderActivator={({ toggle, value: toggleState }) => (
            !toggleState && appInfo.allowPasswordLogin
              ? (
                  <Button
                    variant="contained"
                    color="info"
                    sx={{ mt: 1, mb: -1.5 }}
                    startIcon={<MdiIcon path={icons.lock} />}
                    onClick={toggle}
                  >
                    {t("settings.change-password")}
                  </Button>
                )
              : appInfo.allowPasswordLogin
                ? (
                    <Button
                      variant="contained"
                      color="info"
                      sx={{ mt: 1, mb: -1.5 }}
                      startIcon={<MdiIcon path={icons.user} />}
                      onClick={toggle}
                    >
                      {t("settings.profile")}
                    </Button>
                  )
                : null
          )}
        >
          {({ value: toggleState }: { value: boolean }) => (
            !toggleState
              ? (
                  <Fade in appear key="personal-info">
                    <div>
                      <Box sx={{ mt: 5 }}>
                        <BaseCardSectionTitle title={t("profile.personal-information")} />
                      </Box>
                      <Card component="article" variant="outlined" sx={{ borderColor: "lightgrey" }}>
                        <CardContent sx={{ pb: 0 }}>
                          <form noValidate onSubmit={event => event.preventDefault()}>
                            <TextField
                              fullWidth
                              variant="standard"
                              margin="dense"
                              label={t("user.username")}
                              value={userCopy.username ?? ""}
                              onChange={event => setUserCopy(current => ({ ...current, username: event.target.value }))}
                            />
                            <TextField
                              fullWidth
                              variant="standard"
                              margin="dense"
                              label={t("user.full-name")}
                              value={userCopy.fullName ?? ""}
                              onChange={event => setUserCopy(current => ({ ...current, fullName: event.target.value }))}
                            />
                            <TextField
                              fullWidth
                              variant="standard"
                              margin="dense"
                              label={t("user.email")}
                              value={userCopy.email ?? ""}
                              onChange={event => setUserCopy(current => ({ ...current, email: event.target.value }))}
                            />
                          </form>
                        </CardContent>
                        <CardActions>
                          <Box sx={{ flexGrow: 1 }} />
                          <BaseButton update onClick={() => void updateUser(userCopy)} />
                        </CardActions>
                      </Card>
                    </div>
                  </Fade>
                )
              : (
                  <Fade in appear key="change-password">
                    <div>
                      <Box sx={{ mt: 5 }}>
                        <BaseCardSectionTitle title={t("settings.change-password")} />
                      </Box>
                      <Card variant="outlined" sx={{ borderColor: "lightgrey" }}>
                        <CardContent sx={{ pb: 0 }}>
                          <form noValidate onSubmit={event => event.preventDefault()}>
                            <PrependIcon icon={icons.lock}>
                              <TextField
                                fullWidth
                                variant="standard"
                                margin="dense"
                                label={t("user.current-password")}
                                type={showPassword ? "text" : "password"}
                                value={password.current}
                                onChange={event => setPassword(current => ({ ...current, current: event.target.value }))}
                                slotProps={{ input: passwordToggle }}
                                {...blurProps("current")}
                              />
                            </PrependIcon>
                            <PrependIcon icon={icons.lock}>
                              <TextField
                                fullWidth
                                variant="standard"
                                margin="dense"
                                label={t("user.new-password")}
                                type={showPassword ? "text" : "password"}
                                value={password.newOne}
                                onChange={event => setPassword(current => ({ ...current, newOne: event.target.value }))}
                                slotProps={{ input: passwordToggle }}
                                {...passChange.fieldProps("newOne")}
                              />
                            </PrependIcon>
                            <PrependIcon icon={icons.lock}>
                              <TextField
                                fullWidth
                                variant="standard"
                                margin="dense"
                                label={t("user.confirm-password")}
                                type={showPassword ? "text" : "password"}
                                value={password.newTwo}
                                onChange={event => setPassword(current => ({ ...current, newTwo: event.target.value }))}
                                slotProps={{ input: passwordToggle }}
                                {...blurProps("newTwo")}
                              />
                            </PrependIcon>
                            <UserPasswordStrength value={password.newOne} />
                          </form>
                        </CardContent>
                        <CardActions>
                          <Box sx={{ flexGrow: 1 }} />
                          <BaseButton update disabled={!passwordsMatch} onClick={() => void updatePassword()} />
                        </CardActions>
                      </Card>
                    </div>
                  </Fade>
                )
          )}
        </ToggleState>
      </Box>
      <Box component="section">
        <Box sx={{ mt: 5 }}>
          <BaseCardSectionTitle title={t("profile.preferences")} />
        </Box>
        <Card variant="outlined" sx={{ borderColor: "lightgrey" }}>
          <CardContent>
            <Autocomplete
              freeSolo
              options={activityOptions}
              value={selectedDefaultActivity}
              onChange={(_event, value) => selectDefaultActivity(value ?? "")}
              inputValue={selectedDefaultActivity}
              onInputChange={(_event, value) => selectDefaultActivity(value)}
              renderInput={params => (
                <TextField
                  {...params}
                  variant="standard"
                  margin="dense"
                  label={t("user.default-activity")}
                  helperText={t("user.default-activity-hint")}
                />
              )}
            />
            <FormControlLabel
              sx={{ display: "flex" }}
              label={t("announcements.show-announcements-from-mealie")}
              control={(
                <Checkbox
                  color="primary"
                  checked={userCopy.showAnnouncements ?? false}
                  onChange={event => setPreference("showAnnouncements", event.target.checked)}
                />
              )}
            />
            <FormControlLabel
              sx={{ display: "flex" }}
              label={t("profile.show-advanced-description")}
              control={(
                <Checkbox
                  color="primary"
                  checked={userCopy.advanced ?? false}
                  onChange={event => setPreference("advanced", event.target.checked)}
                />
              )}
            />
          </CardContent>
        </Card>
        <Box
          component={Link}
          to="/group"
          sx={{ mt: 2.5, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", color: "primary.main" }}
        >
          {t("profile.looking-for-privacy-settings")}
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", mt: 2.5 }}>
          <Button
            variant="outlined"
            component={Link}
            to="/user/profile"
            startIcon={<MdiIcon path={icons.backArrow} />}
            sx={{ borderRadius: 6, my: 0.5, mx: 0.5 }}
          >
            {t("profile.back-to-profile")}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
