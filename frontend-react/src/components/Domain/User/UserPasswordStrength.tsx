import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import { useI18n } from "~/hooks/use-global-i18n";
import { usePasswordStrength } from "~/hooks/use-passwords";

export function UserPasswordStrength({ value = "" }: { value?: string }) {
  const i18n = useI18n();
  const pwStrength = usePasswordStrength(value, i18n);
  return (
    <Box sx={{ display: "flex", pb: 3, mt: -0.5, ml: 5 }}>
      <Box sx={{ flexBasis: 500 }}>
        <strong>{i18n.t("user.password-strength", { strength: pwStrength.strength })}</strong>
        <LinearProgress
          variant="determinate"
          value={pwStrength.score}
          color={pwStrength.color as "error" | "warning" | "info" | "success"}
          sx={{ height: 15, borderRadius: 1 }}
        />
      </Box>
    </Box>
  );
}

export default UserPasswordStrength;
