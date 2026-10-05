import { useState } from "react";
import { useNavigate } from "react-router";
import { States, RegistrationType, useRegistration } from "./states";
import { useUserApi } from "@/hooks/api";
import { usePublicApi } from "@/hooks/api/api-client";
import { useLocales } from "@/hooks/use-locales";
import { useRouteQuery } from "@/hooks/use-router";
import { alert } from "@/hooks/use-toast";
import { useUserRegistrationForm } from "@/hooks/use-users/user-registration-form";
import { useAsyncValidator } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import type { CreateUserRegistration } from "@/lib/api/types/user";

/**
 * The `<script setup>` of pages/register/index.vue as a hook: registration state machine, token,
 * group details, confirmation data and submission. Kept apart from the markup so the page logic can
 * be tested without rendering every step (the Vue test mounted the page with an empty render).
 */
export function useRegisterPage() {
  const i18n = useI18n();

  // Handle Token URL / Initialization
  const [token, setToken] = useRouteQuery<string>("token");
  function initialUser() {
    return false;
  }

  // Registration Context (Vue: moved on in onMounted when a token or an initial user is given)
  const state = useRegistration(
    initialUser()
      ? { state: States.ProvideGroupDetails, type: RegistrationType.InitialGroup }
      : token
        ? { state: States.ProvideAccountDetails, type: RegistrationType.JoinGroup }
        : undefined,
  );

  // Initial
  const initial = {
    createGroup: () => {
      state.setState(States.ProvideGroupDetails);
      state.setType(RegistrationType.CreateGroup);
      if (token != null) {
        setToken(null);
      }
    },
    joinGroup: () => {
      state.setState(States.ProvideToken);
      state.setType(RegistrationType.JoinGroup);
    },
  };

  // Provide Token
  function validateToken() {
    return Boolean(token && token.trim());
  }
  const isTokenValid = validateToken();
  const provideToken = {
    next: () => {
      if (validateToken()) {
        state.setState(States.ProvideAccountDetails);
      }
    },
  };

  // Provide Group Details
  const publicApi = usePublicApi();
  const [groupName, setGroupName] = useState("");
  const [groupSeed, setGroupSeed] = useState(false);
  const [groupPrivate, setGroupPrivate] = useState(false);
  const [groupRequiredError, setGroupRequiredError] = useState(false);
  const {
    validate: validGroupName,
    valid: groupNameValid,
    errorMessages: groupNameTakenMessages,
  } = useAsyncValidator(
    groupName,
    (v: string) => publicApi.validators.group(v),
    i18n.t("validation.group-name-is-taken"),
  );
  const groupErrorMessages = groupRequiredError ? [i18n.t("validation.required")] : groupNameTakenMessages;

  async function validateGroup() {
    if (!groupName || !groupName.trim()) {
      setGroupRequiredError(true);
      return false;
    }
    setGroupRequiredError(false);
    return await validGroupName();
  }
  const groupDetails = {
    groupName,
    setGroupName,
    groupSeed,
    setGroupSeed,
    groupPrivate,
    setGroupPrivate,
    next: async () => {
      if (!await validateGroup()) {
        return;
      }
      state.setState(States.ProvideAccountDetails);
    },
  };

  const [isAccountFormValid, setIsAccountFormValid] = useState(false);
  const {
    accountDetails,
    credentials,
  } = useUserRegistrationForm();
  async function accountDetailsNext() {
    if (!await accountDetails.validate()) {
      return;
    }
    state.setState(States.Confirmation);
  }

  // Locale
  const { locale } = useLocales();
  const [langDialog, setLangDialog] = useState(false);

  // Confirmation
  const confirmationData = [
    {
      display: state.ctx.type === RegistrationType.CreateGroup,
      text: i18n.t("group.group"),
      value: groupName,
    },
    {
      display: state.ctx.type === RegistrationType.CreateGroup,
      text: i18n.t("data-pages.seed-data"),
      value: groupSeed ? i18n.t("general.yes") : i18n.t("general.no"),
    },
    {
      display: state.ctx.type === RegistrationType.CreateGroup,
      text: i18n.t("group.settings.keep-my-recipes-private"),
      value: groupPrivate ? i18n.t("general.yes") : i18n.t("general.no"),
    },
    {
      display: true,
      text: i18n.t("user.email"),
      value: accountDetails.email,
    },
    {
      display: true,
      text: i18n.t("user.full-name"),
      value: accountDetails.fullName,
    },
    {
      display: true,
      text: i18n.t("user.username"),
      value: accountDetails.username,
    },
    {
      display: true,
      text: i18n.t("user.enable-advanced-content"),
      value: accountDetails.advancedOptions ? i18n.t("general.yes") : i18n.t("general.no"),
    },
  ];

  const api = useUserApi();
  const navigate = useNavigate();
  async function submitRegistration() {
    const payload: CreateUserRegistration = {
      email: accountDetails.email,
      username: accountDetails.username,
      fullName: accountDetails.fullName,
      password: credentials.password1,
      passwordConfirm: credentials.password2,
      locale,
      advanced: accountDetails.advancedOptions,
    };
    if (state.ctx.type === RegistrationType.CreateGroup) {
      payload.group = groupName;
      payload.private = groupPrivate;
      payload.seedData = groupSeed;
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
    else if (!error?.response?.data?.detail?.message) {
      alert.error(i18n.t("events.something-went-wrong"));
    }
  }

  return {
    state,
    token,
    setToken,
    initial,
    isTokenValid,
    provideToken,
    groupDetails,
    groupErrorMessages,
    validGroupName,
    groupNameValid,
    isAccountFormValid,
    setIsAccountFormValid,
    accountDetailsNext,
    langDialog,
    setLangDialog,
    confirmationData,
    submitRegistration,
  };
}
