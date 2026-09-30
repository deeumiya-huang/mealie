import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router";
import { icons } from "~/lib/icons";
import type { CreateUserRegistration } from "~/lib/api/types/user";
import { useUserApi } from "~/hooks/api";
import { usePublicApi } from "~/hooks/api/api-client";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLocales } from "~/hooks/use-locales";
import { alert } from "~/hooks/use-toast";
import { useUserRegistrationForm } from "~/hooks/use-users/user-registration-form";
import { useAsyncValidator, validators } from "~/hooks/use-validators";
import { useDark } from "~/theme/color-scheme";
import { AppLogo } from "~/components/global/AppLogo";
import { BaseButton } from "~/components/global/BaseButton";
import { Icon } from "~/components/global/Icon";
import { LanguageDialog } from "~/components/global/LanguageDialog";
import { CheckboxInput, TextInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { UserRegistrationForm } from "~/components/Domain/User/UserRegistrationForm";
import { RegistrationType, States, useRegistration } from "./states";

export interface GroupDetails {
  groupName: string;
  groupSeed: boolean;
  groupPrivate: boolean;
}

/**
 * The page's submission logic, split out so it can be exercised without rendering the multi-step
 * form (the Vue test called the component's submitRegistration directly).
 */
export function useRegistrationSubmit() {
  const i18n = useI18n();
  const api = useUserApi();
  const navigate = useNavigate();
  const { locale } = useLocales();
  const { accountDetails, credentials } = useUserRegistrationForm();

  return async function submitRegistration(type: RegistrationType, group: GroupDetails, token: string | null) {
    const payload: CreateUserRegistration = {
      email: accountDetails.email,
      username: accountDetails.username,
      fullName: accountDetails.fullName,
      password: credentials.password1,
      passwordConfirm: credentials.password2,
      locale,
      advanced: accountDetails.advancedOptions,
    };
    if (type === RegistrationType.CreateGroup) {
      payload.group = group.groupName;
      payload.private = group.groupPrivate;
      payload.seedData = group.groupSeed;
    }
    else {
      payload.groupToken = token;
    }
    const { response, error } = await api.register.register(payload);
    if (response?.status === 201) {
      accountDetails.reset();
      credentials.reset();
      alert.success(i18n.t("user-registration.registration-success"));
      void navigate("/login");
    }
    // The Axios interceptor already shows detail.message errors.
    else if (!(error as { response?: { data?: { detail?: { message?: string } } } } | null)?.response?.data?.detail?.message) {
      alert.error(i18n.t("events.something-went-wrong"));
    }
  };
}

export default function RegisterPage() {
  const i18n = useI18n();
  const [isDark] = useDark();
  const state = useRegistration();
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState<string | null>(searchParams.get("token"));
  const [langDialog, setLangDialog] = useState(false);
  const submitRegistration = useRegistrationSubmit();
  const { accountDetails } = useUserRegistrationForm();

  // Handle Token URL / Initialization
  useEffect(() => {
    if (token) {
      state.setState(States.ProvideAccountDetails);
      state.setType(RegistrationType.JoinGroup);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onMounted
  }, []);

  const initial = {
    createGroup: () => {
      state.setState(States.ProvideGroupDetails);
      state.setType(RegistrationType.CreateGroup);
      if (token != null) {
        setToken(null);
        const next = new URLSearchParams(searchParams);
        next.delete("token");
        setSearchParams(next, { replace: true });
      }
    },
    joinGroup: () => {
      state.setState(States.ProvideToken);
      state.setType(RegistrationType.JoinGroup);
    },
  };

  // Provide Token
  const domTokenForm = useRef<FormHandle>(null);
  const isTokenValid = Boolean(token && token.trim());
  const provideTokenNext = () => {
    if (!domTokenForm.current?.validate()) return;
    if (isTokenValid) state.setState(States.ProvideAccountDetails);
  };

  // Provide Group Details
  const publicApi = usePublicApi();
  const [isGroupFormValid, setIsGroupFormValid] = useState(false);
  const [group, setGroup] = useState<GroupDetails>({ groupName: "", groupSeed: false, groupPrivate: false });
  const [groupRequiredError, setGroupRequiredError] = useState<string[]>([]);
  const { validate: validGroupName, valid: groupNameValid, errorMessages: groupTakenErrors } = useAsyncValidator(
    group.groupName,
    (v: string) => publicApi.validators.group(v),
    i18n.t("validation.group-name-is-taken"),
  );
  const groupErrorMessages = groupRequiredError.length ? groupRequiredError : groupTakenErrors;

  async function validateGroup() {
    if (!group.groupName || !group.groupName.trim()) {
      setGroupRequiredError([i18n.t("validation.required")]);
      return false;
    }
    setGroupRequiredError([]);
    return await validGroupName();
  }
  const groupDetailsNext = async () => {
    if (!await validateGroup()) return;
    state.setState(States.ProvideAccountDetails);
  };

  const [isAccountFormValid, setIsAccountFormValid] = useState(false);
  async function accountDetailsNext() {
    if (!await accountDetails.validate()) return;
    state.setState(States.Confirmation);
  }

  const confirmationData = [
    { display: state.ctx.type === RegistrationType.CreateGroup, text: i18n.t("group.group"), value: group.groupName },
    { display: state.ctx.type === RegistrationType.CreateGroup, text: i18n.t("data-pages.seed-data"), value: group.groupSeed ? i18n.t("general.yes") : i18n.t("general.no") },
    { display: state.ctx.type === RegistrationType.CreateGroup, text: i18n.t("group.settings.keep-my-recipes-private"), value: group.groupPrivate ? i18n.t("general.yes") : i18n.t("general.no") },
    { display: true, text: i18n.t("user.email"), value: accountDetails.email },
    { display: true, text: i18n.t("user.full-name"), value: accountDetails.fullName },
    { display: true, text: i18n.t("user.username"), value: accountDetails.username },
    { display: true, text: i18n.t("user.enable-advanced-content"), value: accountDetails.advancedOptions ? i18n.t("general.yes") : i18n.t("general.no") },
  ];

  const backButton = (
    <BaseButton cancel onClick={state.back} iconSlot={<Icon path={icons.back} />}>{i18n.t("general.back")}</BaseButton>
  );

  const title = (icon: string, text: string) => (
    <Typography variant="h6" component="div" sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center" }}>
      <Icon path={icon} size="large" sx={{ mr: 1.5 }} />
      <span>{text}</span>
    </Typography>
  );

  return (
    <Box
      className="fill-height"
      sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", p: 2, ...(!isDark ? { bgcolor: "#f5f8fa" } : {}) }}
    >
      <Card sx={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 1200, minHeight: 700 }}>
        <div>
          <Toolbar sx={{ bgcolor: "primary.main", color: "#fff", width: "100%", mb: "4rem", justifyContent: "center" }}>
            <Typography variant="h4" sx={{ textAlign: "center" }}>Mealie</Typography>
          </Toolbar>
          <AppLogo />
        </div>

        <Box sx={{ display: "flex", justifyContent: "center", flexGrow: 1, alignItems: "center", my: 2 }}>
          {state.ctx.state === States.Initial && (
            <Container>
              <Typography variant="h5" sx={{ my: 2, mb: 2.5, pb: 0, textAlign: "center" }}>{i18n.t("user-registration.user-registration")}</Typography>
              <Box sx={{ display: "flex", flexWrap: { xs: "wrap", md: "nowrap" }, justifyContent: "center", p: 2, gap: "1em" }}>
                {[
                  { onClick: initial.joinGroup, icon: icons.group, text: i18n.t("user-registration.join-a-group") },
                  { onClick: initial.createGroup, icon: icons.user, text: i18n.t("user-registration.create-a-new-group") },
                ].map(option => (
                  <Card key={option.text} sx={{ bgcolor: "primary.main", color: "#fff", width: 320 }}>
                    <CardActionArea onClick={option.onClick}>
                      <Typography variant="h6" sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 1.5 }}>
                        <Icon path={option.icon} size="large" start />
                        {option.text}
                      </Typography>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            </Container>
          )}

          {state.ctx.state === States.ProvideToken && (
            <div>
              {title(icons.group, i18n.t("user-registration.join-a-group"))}
              <Divider />
              <CardContent>
                {i18n.t("user-registration.provide-registration-token-description")}
                <VForm ref={domTokenForm} sx={{ mt: 2 }}>
                  <TextInput value={token ?? ""} onChange={setToken} variant="filled" label={i18n.t("group.group-token")} rules={[validators.required]} />
                </VForm>
              </CardContent>
              <Divider />
              <CardActions sx={{ mt: "auto", justifyContent: "space-between" }}>
                {backButton}
                <BaseButton iconRight disabled={!isTokenValid} onClick={provideTokenNext} iconSlot={<Icon path={icons.forward} />}>
                  {i18n.t("general.next")}
                </BaseButton>
              </CardActions>
            </div>
          )}

          {state.ctx.state === States.ProvideGroupDetails && (
            <Box sx={{ width: 840, maxWidth: "100%" }}>
              {title(icons.group, i18n.t("user-registration.group-details"))}
              <CardContent>{i18n.t("user-registration.group-details-description")}</CardContent>
              <Divider />
              <CardContent>
                <VForm onValidChange={setIsGroupFormValid}>
                  <TextInput
                    value={group.groupName}
                    onChange={groupName => setGroup({ ...group, groupName })}
                    variant="filled"
                    label={i18n.t("group.group-name")}
                    rules={[validators.required, () => groupErrorMessages[0] ?? true]}
                    onBlur={() => void validGroupName()}
                  />
                  <Box sx={{ mt: -2, px: 1 }}>
                    <CheckboxInput hideDetails checked={group.groupPrivate} onChange={groupPrivate => setGroup({ ...group, groupPrivate })} label={i18n.t("group.settings.keep-my-recipes-private")} />
                    <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>{i18n.t("group.settings.keep-my-recipes-private-description")}</Typography>
                    <CheckboxInput hideDetails checked={group.groupSeed} onChange={groupSeed => setGroup({ ...group, groupSeed })} label={i18n.t("data-pages.seed-data")} />
                    <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>{i18n.t("user-registration.use-seed-data-description")}</Typography>
                  </Box>
                </VForm>
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: "space-between" }}>
                {backButton}
                <BaseButton iconRight disabled={!isGroupFormValid || !groupNameValid} onClick={() => void groupDetailsNext()} iconSlot={<Icon path={icons.forward} />}>
                  {i18n.t("general.next")}
                </BaseButton>
              </CardActions>
            </Box>
          )}

          {state.ctx.state === States.ProvideAccountDetails && (
            <div>
              <UserRegistrationForm onValidChange={setIsAccountFormValid} />
              <Divider />
              <CardActions sx={{ justifyContent: "space-between" }}>
                {backButton}
                <BaseButton iconRight disabled={!isAccountFormValid} onClick={() => void accountDetailsNext()} iconSlot={<Icon path={icons.forward} />}>
                  {i18n.t("general.next")}
                </BaseButton>
              </CardActions>
            </div>
          )}

          {state.ctx.state === States.Confirmation && (
            <Box sx={{ width: 840, maxWidth: "100%" }}>
              {title(icons.user, i18n.t("general.confirm"))}
              <List>
                {confirmationData.map((item, idx) => (
                  <Box key={idx}>
                    {item.display && (
                      <ListItem>
                        <ListItemText primary={item.text} secondary={item.value} />
                      </ListItem>
                    )}
                    {idx !== confirmationData.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
              <Divider />
              <CardActions sx={{ justifyContent: "space-between" }}>
                {backButton}
                <BaseButton onClick={() => void submitRegistration(state.ctx.type, group, token)} iconSlot={<Icon path={icons.check} />}>
                  {i18n.t("general.submit")}
                </BaseButton>
              </CardActions>
            </Box>
          )}
        </Box>

        <CardActions sx={{ justifyContent: "center", flexDirection: "column", py: 4, gap: 1 }}>
          <Button variant="text" sx={{ mb: 1 }} component={RouterLink} to="/login">{i18n.t("user.login")}</Button>
          <BaseButton color="primary" icon={icons.translate} onClick={() => setLangDialog(true)}>
            {i18n.t("language-dialog.choose-language")}
          </BaseButton>
        </CardActions>
      </Card>
      <LanguageDialog open={langDialog} onOpenChange={setLangDialog} />
    </Box>
  );
}
