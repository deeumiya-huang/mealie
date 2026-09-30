import { useCallback } from "react";
import { publicApi } from "~/hooks/api/api-client";
import { useGlobalI18n } from "~/hooks/use-global-i18n";
import { createStore, registerCacheReset, useStore } from "~/lib/store";
import type { FormHandle } from "~/components/global/form";

interface RegistrationFormState {
  username: string;
  fullName: string;
  email: string;
  password1: string;
  password2: string;
  advancedOptions: boolean;
  validUsername: boolean;
  validEmail: boolean;
  usernameErrorMessages: string[];
  emailErrorMessages: string[];
}

const initialState: RegistrationFormState = {
  username: "",
  fullName: "",
  email: "",
  password1: "",
  password2: "",
  advancedOptions: false,
  validUsername: false,
  validEmail: false,
  usernameErrorMessages: [],
  emailErrorMessages: [],
};

// Shared between the registration page and <UserRegistrationForm>, like the Vue module-level refs.
const formStore = createStore<RegistrationFormState>(initialState);
const domAccountForm: { current: FormHandle | null } = { current: null };

export function resetUserRegistrationForm() {
  domAccountForm.current = null;
  formStore.set(initialState);
}
registerCacheReset(resetUserRegistrationForm);

async function validateUsername() {
  const i18n = useGlobalI18n();
  const { data } = await publicApi().validators.username(formStore.get().username);
  const valid = !!data?.valid;
  formStore.patch({ validUsername: valid, usernameErrorMessages: valid ? [] : [i18n.t("validation.username-is-taken")] });
  return valid;
}

async function validateEmail() {
  const i18n = useGlobalI18n();
  const { data } = await publicApi().validators.email(formStore.get().email);
  const valid = !!data?.valid;
  formStore.patch({ validEmail: valid, emailErrorMessages: valid ? [] : [i18n.t("validation.email-is-taken")] });
  return valid;
}

export function safeValidate(form: { current: FormHandle | null }) {
  if (!form.current) {
    return false;
  }
  return form.current.validate();
}

export const useUserRegistrationForm = () => {
  const state = useStore(formStore);
  const set = useCallback((patch: Partial<RegistrationFormState>) => formStore.patch(patch), []);

  const accountDetails = {
    username: state.username,
    fullName: state.fullName,
    email: state.email,
    advancedOptions: state.advancedOptions,
    setUsername: (username: string) => set({ username }),
    setFullName: (fullName: string) => set({ fullName }),
    setEmail: (email: string) => set({ email }),
    setAdvancedOptions: (advancedOptions: boolean) => set({ advancedOptions }),
    validate: async () => {
      let { validUsername, validEmail } = formStore.get();
      if (!validUsername || !validEmail) {
        [validUsername, validEmail] = await Promise.all([validateUsername(), validateEmail()]);
      }
      if (!validUsername || !validEmail) {
        return false;
      }
      return safeValidate(domAccountForm);
    },
    reset: () => set({ username: "", fullName: "", email: "", advancedOptions: false }),
  };

  const passwordMatch = () => formStore.get().password1 === formStore.get().password2 || useGlobalI18n().t("user.password-must-match");
  const credentials = {
    password1: state.password1,
    password2: state.password2,
    setPassword1: (password1: string) => set({ password1 }),
    setPassword2: (password2: string) => set({ password2 }),
    passwordMatch,
    reset: () => set({ password1: "", password2: "" }),
  };

  return {
    accountDetails,
    credentials,
    emailErrorMessages: state.emailErrorMessages,
    usernameErrorMessages: state.usernameErrorMessages,
    advancedOptions: state.advancedOptions,
    validateUsername,
    validateEmail,
    domAccountForm,
    safeValidate,
  };
};
