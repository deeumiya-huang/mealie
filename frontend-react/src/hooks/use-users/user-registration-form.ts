import { useCallback } from "react";
import { usePublicApi } from "@/hooks/api";
import { registerCacheReset } from "@/hooks/use-clear-composable-caches";
import { useAsyncValidator } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import { createStore, useStore } from "@/lib/store";

// Port of composables/use-users/user-registration-form.ts. The field values are module state shared
// by the registration page and UserRegistrationForm (Vue: module-level refs); so is the account
// form handle (Vue: the `domAccountForm` template ref the form component fills in).

export interface RegistrationFormValues {
  username: string;
  fullName: string;
  email: string;
  password1: string;
  password2: string;
  advancedOptions: boolean;
}

const emptyForm: RegistrationFormValues = {
  username: "",
  fullName: "",
  email: "",
  password1: "",
  password2: "",
  advancedOptions: false,
};

const registrationForm = createStore<RegistrationFormValues>({ ...emptyForm });

/** What the page needs from the mounted account form (Vue `VForm.validate()`). */
export interface AccountFormHandle {
  validate: () => boolean | Promise<boolean>;
}

/** Set by UserRegistrationForm while it is mounted. */
export const domAccountForm: { current: AccountFormHandle | null } = { current: null };

/** Called by the mounted form; returns the cleanup that unregisters it. */
export function registerAccountForm(handle: AccountFormHandle) {
  domAccountForm.current = handle;
  return () => {
    if (domAccountForm.current === handle) {
      domAccountForm.current = null;
    }
  };
}

export function resetUserRegistrationForm() {
  domAccountForm.current = null;
  registrationForm.set({ ...emptyForm });
}
registerCacheReset(resetUserRegistrationForm);

function patch(values: Partial<RegistrationFormValues>) {
  registrationForm.set(current => ({ ...current, ...values }));
}

async function safeValidate(form: { current: AccountFormHandle | null }) {
  if (!form.current) {
    return false;
  }

  return await form.current.validate();
}

export const useUserRegistrationForm = () => {
  const i18n = useI18n();
  const values = useStore(registrationForm);

  // ================================================================
  // Provide Group Details
  const publicApi = usePublicApi();
  // ================================================================
  // Provide Account Details

  const {
    validate: validateUsername,
    valid: validUsername,
    errorMessages: usernameErrorMessages,
  } = useAsyncValidator(
    values.username,
    (v: string) => publicApi.validators.username(v),
    i18n.t("validation.username-is-taken"),
  );
  const {
    validate: validateEmail,
    valid: validEmail,
    errorMessages: emailErrorMessages,
  } = useAsyncValidator(
    values.email,
    (v: string) => publicApi.validators.email(v),
    i18n.t("validation.email-is-taken"),
  );

  const validate = useCallback(async () => {
    let usernameOk = validUsername;
    let emailOk = validEmail;
    if (!usernameOk || !emailOk) {
      [usernameOk, emailOk] = await Promise.all([validateUsername(), validateEmail()]);
    }

    if (!usernameOk || !emailOk) {
      return false;
    }

    return await safeValidate(domAccountForm);
  }, [validUsername, validEmail, validateUsername, validateEmail]);

  const accountDetails = {
    username: values.username,
    fullName: values.fullName,
    email: values.email,
    advancedOptions: values.advancedOptions,
    setUsername: (username: string) => patch({ username }),
    setFullName: (fullName: string) => patch({ fullName }),
    setEmail: (email: string) => patch({ email }),
    setAdvancedOptions: (advancedOptions: boolean) => patch({ advancedOptions }),
    validate,
    reset: () => {
      patch({ username: "", fullName: "", email: "", advancedOptions: false });
    },
  };
  // ================================================================
  // Provide Credentials
  const passwordMatch = () => values.password1 === values.password2 || i18n.t("user.password-must-match");
  const credentials = {
    password1: values.password1,
    password2: values.password2,
    setPassword1: (password1: string) => patch({ password1 }),
    setPassword2: (password2: string) => patch({ password2 }),
    passwordMatch,
    reset: () => {
      patch({ password1: "", password2: "" });
    },
  };

  return {
    accountDetails,
    credentials,
    emailErrorMessages,
    usernameErrorMessages,
    // Fields
    advancedOptions: values.advancedOptions,
    // Validators
    validateUsername,
    validateEmail,
    // Dom Refs
    domAccountForm,
    safeValidate,
  };
};
