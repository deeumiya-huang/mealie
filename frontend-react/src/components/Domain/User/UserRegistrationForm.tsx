import { useEffect, useRef } from "react";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { usePasswordField } from "~/hooks/use-passwords";
import { useUserRegistrationForm } from "~/hooks/use-users/user-registration-form";
import { validators } from "~/hooks/use-validators";
import { Icon } from "~/components/global/Icon";
import { CheckboxInput, TextInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { UserPasswordStrength } from "./UserPasswordStrength";

export function UserRegistrationForm({ onValidChange }: { onValidChange?: (valid: boolean) => void }) {
  const i18n = useI18n();
  const pwFields = usePasswordField();
  const { accountDetails, credentials, emailErrorMessages, usernameErrorMessages, validateUsername, validateEmail, domAccountForm } = useUserRegistrationForm();
  const formRef = useRef<FormHandle>(null);

  useEffect(() => {
    domAccountForm.current = formRef.current;
  });

  const inputAttrs = { variant: "solo-filled" as const, sx: { pb: 0.5 } };

  return (
    <div>
      <Typography variant="h6" component="div" sx={{ pt: 0, px: 2, display: "flex", alignItems: "center" }}>
        <Icon path={icons.user} size="large" sx={{ mr: 1.5 }} />
        <span>{i18n.t("user-registration.account-details")}</span>
      </Typography>
      <Divider />
      <CardContent sx={{ mt: 1 }}>
        <VForm ref={formRef} onValidChange={onValidChange}>
          <TextInput
            {...inputAttrs}
            value={accountDetails.username}
            onChange={accountDetails.setUsername}
            autoFocus
            label={i18n.t("user.username")}
            prependIcon={icons.user}
            rules={[validators.required, () => usernameErrorMessages[0] ?? true]}
            onBlur={() => void validateUsername()}
          />
          <TextInput
            {...inputAttrs}
            value={accountDetails.fullName}
            onChange={accountDetails.setFullName}
            label={i18n.t("user.full-name")}
            prependIcon={icons.user}
            rules={[validators.required]}
          />
          <TextInput
            {...inputAttrs}
            value={accountDetails.email}
            onChange={accountDetails.setEmail}
            prependIcon={icons.email}
            label={i18n.t("user.email")}
            rules={[validators.required, validators.email, () => emailErrorMessages[0] ?? true]}
            onBlur={() => void validateEmail()}
          />
          <TextInput
            {...inputAttrs}
            value={credentials.password1}
            onChange={credentials.setPassword1}
            type={pwFields.inputType}
            appendInnerIcon={pwFields.passwordIcon}
            onAppendInnerClick={pwFields.togglePasswordShow}
            prependIcon={icons.lock}
            label={i18n.t("user.password")}
            rules={[validators.required, validators.minLength(8), validators.maxLength(258)]}
          />
          <UserPasswordStrength value={credentials.password1} />
          <TextInput
            {...inputAttrs}
            value={credentials.password2}
            onChange={credentials.setPassword2}
            type={pwFields.inputType}
            appendInnerIcon={pwFields.passwordIcon}
            onAppendInnerClick={pwFields.togglePasswordShow}
            prependIcon={icons.lock}
            label={i18n.t("user.confirm-password")}
            rules={[validators.required, credentials.passwordMatch]}
          />
          <div style={{ padding: "0 8px" }}>
            <CheckboxInput
              checked={accountDetails.advancedOptions}
              onChange={accountDetails.setAdvancedOptions}
              label={i18n.t("user.enable-advanced-content")}
            />
            <Typography variant="caption" component="p" sx={{ mt: -1 }}>
              {i18n.t("user.enable-advanced-content-description")}
            </Typography>
          </div>
        </VForm>
      </CardContent>
    </div>
  );
}

export default UserRegistrationForm;
