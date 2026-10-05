// Usage: <UserRegistrationForm onChange={setAccountFormValid} /> — account details step of the
// registration page. Values live in the shared registration form state (hooks/use-users/user-registration-form);
// `onChange` reports whether the form is valid (Vue v-model).
import { useEffect, type ReactNode } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { MdiIcon } from "@/components/global/MdiIcon";
import { UserPasswordStrength } from "@/components/Domain/User/UserPasswordStrength";
import { usePasswordField } from "@/hooks/use-passwords";
import { registerAccountForm, useUserRegistrationForm } from "@/hooks/use-users/user-registration-form";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface UserRegistrationFormProps {
  onChange?: (valid: boolean) => void;
}

/** `prepend-icon` of a Vuetify field: the icon sits outside the field, aligned with the input. */
function PrependIcon({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, pb: 0.5 }}>
      <MdiIcon path={icon} sx={{ mt: 2, color: "text.secondary" }} />
      <Box sx={{ flexGrow: 1 }}>{children}</Box>
    </Box>
  );
}

export function UserRegistrationForm({ onChange }: UserRegistrationFormProps) {
  const { t } = useI18n();
  const pwFields = usePasswordField();
  const {
    accountDetails,
    credentials,
    emailErrorMessages,
    usernameErrorMessages,
    validateUsername,
    validateEmail,
  } = useUserRegistrationForm();

  const form = useFormValidation({
    username: field(accountDetails.username, [validators.required]),
    fullName: field(accountDetails.fullName, [validators.required]),
    email: field(accountDetails.email, [validators.required, validators.email]),
    password1: field(credentials.password1, [validators.required, validators.minLength(8), validators.maxLength(258)]),
    password2: field(credentials.password2, [validators.required, credentials.passwordMatch]),
  });
  const isFormValid = form.isValid;
  const validateForm = form.validate;

  // The page validates the mounted form before moving on (Vue: the shared `domAccountForm` ref).
  useEffect(() => registerAccountForm({ validate: validateForm }), [validateForm]);

  useEffect(() => {
    onChange?.(isFormValid);
  }, [isFormValid, onChange]);

  // Vuetify `validate-on-blur`: a field shows its messages once it lost focus.
  function blurProps(name: Parameters<typeof form.fieldProps>[0], asyncErrors: string[] = []) {
    const message = asyncErrors[0] ?? form.errorFor(name);
    return {
      error: message !== null && message !== undefined,
      helperText: message ?? undefined,
    };
  }

  const passwordToggle = {
    endAdornment: (
      <InputAdornment position="end">
        <IconButton tabIndex={-1} aria-hidden edge="end" onClick={pwFields.togglePasswordShow}>
          <MdiIcon path={pwFields.passwordIcon} />
        </IconButton>
      </InputAdornment>
    ),
  };

  return (
    <div>
      <Typography variant="h6" component="div" sx={{ display: "flex", alignItems: "center", px: 2, pb: 2 }}>
        <MdiIcon path={icons.user} size="large" sx={{ mr: 1.5 }} />
        <span className="headline">{t("user-registration.account-details")}</span>
      </Typography>
      <Divider />
      <CardContent sx={{ mt: 1 }}>
        <form noValidate onSubmit={event => event.preventDefault()}>
          <PrependIcon icon={icons.user}>
            <TextField
              fullWidth
              autoFocus
              variant="filled"
              label={t("user.username")}
              value={accountDetails.username}
              onChange={event => accountDetails.setUsername(event.target.value)}
              onBlur={() => {
                form.touch("username");
                void validateUsername();
              }}
              {...blurProps("username", usernameErrorMessages)}
            />
          </PrependIcon>
          <PrependIcon icon={icons.user}>
            <TextField
              fullWidth
              variant="filled"
              label={t("user.full-name")}
              value={accountDetails.fullName}
              onChange={event => accountDetails.setFullName(event.target.value)}
              onBlur={() => form.touch("fullName")}
              {...blurProps("fullName")}
            />
          </PrependIcon>
          <PrependIcon icon={icons.email}>
            <TextField
              fullWidth
              variant="filled"
              label={t("user.email")}
              value={accountDetails.email}
              onChange={event => accountDetails.setEmail(event.target.value)}
              onBlur={() => {
                form.touch("email");
                void validateEmail();
              }}
              {...blurProps("email", emailErrorMessages)}
            />
          </PrependIcon>
          <PrependIcon icon={icons.lock}>
            <TextField
              fullWidth
              variant="filled"
              type={pwFields.inputType}
              label={t("user.password")}
              value={credentials.password1}
              onChange={event => credentials.setPassword1(event.target.value)}
              onBlur={() => form.touch("password1")}
              slotProps={{ input: passwordToggle }}
              {...blurProps("password1")}
            />
          </PrependIcon>

          <UserPasswordStrength value={credentials.password1} />

          <PrependIcon icon={icons.lock}>
            <TextField
              fullWidth
              variant="filled"
              type={pwFields.inputType}
              label={t("user.confirm-password")}
              value={credentials.password2}
              onChange={event => credentials.setPassword2(event.target.value)}
              onBlur={() => form.touch("password2")}
              slotProps={{ input: passwordToggle }}
              {...blurProps("password2")}
            />
          </PrependIcon>
          <Box sx={{ px: 1 }}>
            <FormControlLabel
              control={(
                <Checkbox
                  checked={accountDetails.advancedOptions}
                  onChange={event => accountDetails.setAdvancedOptions(event.target.checked)}
                />
              )}
              label={t("user.enable-advanced-content")}
            />
            <Typography variant="caption" component="p">
              {t("user.enable-advanced-content-description")}
            </Typography>
          </Box>
        </form>
      </CardContent>
    </div>
  );
}
