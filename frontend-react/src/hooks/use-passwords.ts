import { useState } from "react";
import type { GlobalI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { scorePassword } from "@/lib/validators";

export function usePasswordField() {
  const [show, setShow] = useState(false);

  const passwordIcon = show ? icons.eyeOff : icons.eye;
  const inputType = show ? "text" : "password";

  const togglePasswordShow = () => {
    setShow(value => !value);
  };

  return {
    inputType,
    togglePasswordShow,
    passwordIcon,
  };
}

/** Score, label and colour for a password (all derived; recomputed on every render). */
export const usePasswordStrength = (password: string, i18n: Pick<GlobalI18n, "t">) => {
  const score = scorePassword(password);

  let strength: string;
  let color: "error" | "warning" | "info" | "success";
  if (score < 50) {
    strength = i18n.t("user.password-strength-values.weak");
    color = "error";
  }
  else if (score < 80) {
    strength = i18n.t("user.password-strength-values.good");
    color = "warning";
  }
  else if (score < 100) {
    strength = i18n.t("user.password-strength-values.strong");
    color = "info";
  }
  else {
    strength = i18n.t("user.password-strength-values.very-strong");
    color = "success";
  }

  return { score, strength, color };
};
