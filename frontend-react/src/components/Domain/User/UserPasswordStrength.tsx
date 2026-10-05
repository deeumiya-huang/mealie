// Usage: <UserPasswordStrength value={password} /> — strength label and bar for a password.
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import { usePasswordStrength } from "@/hooks/use-passwords";
import { useI18n } from "@/i18n";

interface UserPasswordStrengthProps {
  value?: string;
}

export function UserPasswordStrength({ value = "" }: UserPasswordStrengthProps) {
  const i18n = useI18n();
  const pwStrength = usePasswordStrength(value, i18n);

  return (
    <Box sx={{ display: "flex", pb: 3, mt: -0.5, ml: 5 }}>
      <Box sx={{ flexBasis: "500px" }}>
        <strong>{i18n.t("user.password-strength", { strength: pwStrength.strength })}</strong>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, pwStrength.score))}
          color={pwStrength.color}
          sx={{ height: 15, borderRadius: 1 }}
        />
      </Box>
    </Box>
  );
}
