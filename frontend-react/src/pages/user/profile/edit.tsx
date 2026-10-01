import { useState } from "react";
import { Link as RouterLink } from "react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import Fade from "@mui/material/Fade";
import Link from "@mui/material/Link";
import { AppButtonUpload } from "~/components/global/AppButtonUpload";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle } from "~/components/global/BasePageTitle";
import { Icon } from "~/components/global/Icon";
import { ToggleState } from "~/components/global/ToggleState";
import { AutocompleteInput, CheckboxInput, TextInput, VForm } from "~/components/global/form";
import type { Rule } from "~/components/global/form";
import { UserAvatar } from "~/components/Domain/User/UserAvatar";
import { UserPasswordStrength } from "~/components/Domain/User/UserPasswordStrength";
import { useUserApi } from "~/hooks/api";
import useDefaultActivity from "~/hooks/use-default-activity";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { useUserActivityPreferences } from "~/hooks/use-users/preferences";
import { validators } from "~/hooks/use-validators";
import { useAppInfo } from "~/lib/app-info";
import { ActivityKey } from "~/lib/api/types/activity";
import type { UserBase, UserOut } from "~/lib/api/types/user";
import { icons } from "~/lib/icons";

const cardSx = { borderColor: "lightgrey" };

export default function UserProfileEditPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const appInfo = useAppInfo();
  const { getDefaultActivityLabels, getActivityLabel, getActivityKey } = useDefaultActivity();
  const user = auth.user;

  useSeoMeta({ title: i18n.t("settings.profile") });

  const [activityPreferences, setActivityPreferences] = useUserActivityPreferences();
  const activityOptions = getDefaultActivityLabels(i18n).map(String);
  const [selectedDefaultActivity, setSelectedDefaultActivity] = useState(String(getActivityLabel(i18n, activityPreferences.defaultActivity)));

  function changeDefaultActivity(label: string) {
    setSelectedDefaultActivity(label);
    setActivityPreferences({ ...activityPreferences, defaultActivity: getActivityKey(i18n, label) ?? ActivityKey.RECIPES });
  }

  // an editable copy of the session user, reset whenever the session user changes
  const [userCopy, setUserCopy] = useState<Partial<UserOut>>({ ...user });
  const [copiedFrom, setCopiedFrom] = useState(user);
  if (copiedFrom !== user) {
    setCopiedFrom(user);
    setUserCopy({ ...user });
  }

  const api = useUserApi();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState({ current: "", newOne: "", newTwo: "" });

  const passwordsMatch = password.newOne === password.newTwo && password.newOne.length > 0;

  async function updateUser(userData: Partial<UserOut> = userCopy) {
    if (!userData?.id || !userData.email) return;

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

  async function updatePassword() {
    if (!userCopy?.id) {
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

  function toggleCheckbox(key: "showAnnouncements" | "advanced", checked: boolean) {
    const next = { ...userCopy, [key]: checked };
    setUserCopy(next);
    void updateUser(next);
  }

  const passwordField = (key: keyof typeof password, label: string, rules: Rule<string>[]) => (
    <TextInput
      value={password[key]}
      onChange={value => setPassword({ ...password, [key]: value })}
      prependIcon={icons.lock}
      label={label}
      type={showPassword ? "text" : "password"}
      appendInnerIcon={showPassword ? icons.eye : icons.eyeOff}
      onAppendInnerClick={() => setShowPassword(!showPassword)}
      rules={rules}
      density="comfortable"
      variant="underlined"
    />
  );

  return (
    <BaseContainer className="narrow-container">
      <BasePageTitle
        divider
        header={(
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <UserAvatar tooltip={false} size="96" userId={userCopy.id!} />
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
        title={i18n.t("profile.user-settings")}
      />

      <Box component="section" sx={{ mt: 2.5 }}>
        <ToggleState
          tag="article"
          activator={({ toggle, value: toggleState }) => appInfo.allowPasswordLogin && (
            <Button variant="contained" color="info" sx={{ mt: 1, mb: -1.5 }} onClick={toggle} startIcon={<Icon path={toggleState ? icons.user : icons.lock} />}>
              {toggleState ? i18n.t("settings.profile") : i18n.t("settings.change-password")}
            </Button>
          )}
        >
          {({ value: toggleState }) => !toggleState
            ? (
                <Fade in key="personal-info">
                  <div>
                    <Box sx={{ mt: 5 }}>
                      <BaseCardSectionTitle title={i18n.t("profile.personal-information")} />
                    </Box>
                    <Card component="article" variant="outlined" sx={cardSx}>
                      <Box sx={{ px: 2, pt: 2 }}>
                        <VForm>
                          <TextInput
                            value={userCopy.username}
                            onChange={username => setUserCopy({ ...userCopy, username })}
                            label={i18n.t("user.username")}
                            required
                            density="comfortable"
                            variant="underlined"
                          />
                          <TextInput
                            value={userCopy.fullName}
                            onChange={fullName => setUserCopy({ ...userCopy, fullName })}
                            label={i18n.t("user.full-name")}
                            required
                            density="comfortable"
                            variant="underlined"
                          />
                          <TextInput
                            value={userCopy.email}
                            onChange={email => setUserCopy({ ...userCopy, email })}
                            label={i18n.t("user.email")}
                            required
                            density="comfortable"
                            variant="underlined"
                          />
                        </VForm>
                      </Box>
                      <CardActions sx={{ justifyContent: "flex-end" }}>
                        <BaseButton update onClick={() => void updateUser()} />
                      </CardActions>
                    </Card>
                  </div>
                </Fade>
              )
            : (
                <Fade in key="change-password">
                  <div>
                    <Box sx={{ mt: 5 }}>
                      <BaseCardSectionTitle title={i18n.t("settings.change-password")} />
                    </Box>
                    <Card variant="outlined" sx={cardSx}>
                      <Box sx={{ px: 2, pt: 2 }}>
                        <VForm>
                          {passwordField("current", i18n.t("user.current-password"), [validators.minLength(1)])}
                          {passwordField("newOne", i18n.t("user.new-password"), [validators.minLength(8)])}
                          {passwordField("newTwo", i18n.t("user.confirm-password"), [() => password.newOne === password.newTwo || i18n.t("user.password-must-match")])}
                          <UserPasswordStrength value={password.newOne} />
                        </VForm>
                      </Box>
                      <CardActions sx={{ justifyContent: "flex-end" }}>
                        <BaseButton update disabled={!passwordsMatch || password.current.length < 0} onClick={() => void updatePassword()} />
                      </CardActions>
                    </Card>
                  </div>
                </Fade>
              )}
        </ToggleState>
      </Box>
      <section>
        <Box sx={{ mt: 5 }}>
          <BaseCardSectionTitle title={i18n.t("profile.preferences")} />
        </Box>
        <Card variant="outlined" sx={{ ...cardSx, p: 2 }}>
          <AutocompleteInput<string>
            value={selectedDefaultActivity}
            onChange={(value: string | null) => changeDefaultActivity(value ?? "")}
            items={activityOptions}
            freeSolo
            label={i18n.t("user.default-activity")}
            hint={i18n.t("user.default-activity-hint")}
            persistentHint
            density="comfortable"
            variant="underlined"
          />
          <CheckboxInput
            checked={userCopy.showAnnouncements}
            onChange={checked => toggleCheckbox("showAnnouncements", checked)}
            hideDetails
            label={i18n.t("announcements.show-announcements-from-mealie")}
            color="primary"
          />
          <CheckboxInput
            checked={userCopy.advanced}
            onChange={checked => toggleCheckbox("advanced", checked)}
            hideDetails
            label={i18n.t("profile.show-advanced-description")}
            color="primary"
          />
        </Card>
        <Link component={RouterLink} to="/group" sx={{ mt: 2.5, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
          {i18n.t("profile.looking-for-privacy-settings")}
        </Link>
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", mt: 2.5 }}>
          <Button
            variant="outlined"
            component={RouterLink}
            to="/user/profile"
            sx={{ borderRadius: 6, my: 0.5, mx: 0.5 }}
            startIcon={<Icon path={icons.backArrow} />}
          >
            {i18n.t("profile.back-to-profile")}
          </Button>
        </Box>
      </section>
    </BaseContainer>
  );
}
