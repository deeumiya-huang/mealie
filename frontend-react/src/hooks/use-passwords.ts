import { useState } from "react";
import { scorePassword } from "~/lib/validators";
import { icons } from "~/lib/icons";
import type { I18nComposer } from "~/hooks/use-global-i18n";

export function usePasswordField() {
  const [show, setShow] = useState(false);

  return {
    inputType: show ? "text" : "password",
    togglePasswordShow: () => setShow(s => !s),
    passwordIcon: show ? icons.eyeOff : icons.eye,
  };
}

/** Pure scoring (the Vue composable returned computed refs of these). */
export const usePasswordStrength = (password: string, i18n: Pick<I18nComposer, "t">) => {
  const score = scorePassword(password);
  const strength = score < 50
    ? i18n.t("user.password-strength-values.weak")
    : score < 80
      ? i18n.t("user.password-strength-values.good")
      : score < 100
        ? i18n.t("user.password-strength-values.strong")
        : i18n.t("user.password-strength-values.very-strong");

  const color = score < 50 ? "error" : score < 80 ? "warning" : score < 100 ? "info" : "success";

  return { score, strength, color };
};
