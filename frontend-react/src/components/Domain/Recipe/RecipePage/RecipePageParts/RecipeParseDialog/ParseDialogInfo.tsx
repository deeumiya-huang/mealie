// Usage: <ParseDialogInfo value={dontShowAgain} onChange={setDontShowAgain} autoParsed={n} toReview={m} /> — the
// explanation step of the parse dialog with the parse result counts and a "don't show again" checkbox.
// (Vue `v-model` → `value` + `onChange`.)
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { EmptyState } from "@/components/global/EmptyState";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface ParseDialogInfoProps {
  value?: boolean;
  onChange: (dontShowAgain: boolean) => void;
  autoParsed: number;
  toReview: number;
}

export function ParseDialogInfo({ value: dontShowAgain = true, onChange, autoParsed, toReview }: ParseDialogInfoProps) {
  const { t } = useI18n();

  return (
    <>
      <EmptyState color="success" icon={icons.progressCheck} headline={t("recipe.parser.ingredient-parser-headline")}>
        <Box sx={{ display: "flex", gap: 1, flexDirection: "column" }}>
          <Typography variant="h6" component="h3" sx={{ my: 0 }}>
            {t("recipe.parser.ingredient-parser-title")}
          </Typography>
          <p>{t("recipe.parser.ingredient-parser-description")}</p>
          <p>{t("recipe.parser.ingredient-parser-final-review-description")}</p>
          <Typography variant="h6" component="h3" sx={{ mb: 0 }}>
            {t("recipe.parser.ingredient-parser-result-title")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
            {!!autoParsed && (
              <Chip
                color="success"
                icon={<MdiIcon path={icons.checkboxMarkedCircle} />}
                label={t("recipe.parser.ingredient-parser-result-success", autoParsed)}
              />
            )}
            <Chip
              color="warning"
              icon={<MdiIcon path={icons.alert} />}
              label={t("recipe.parser.ingredient-parser-result-failed", toReview)}
            />
          </Box>
        </Box>
      </EmptyState>
      <FormControlLabel
        sx={{ ml: 1.5 }}
        label={t("recipe.parser.dont-show-again")}
        control={(
          <Checkbox
            size="small"
            checked={dontShowAgain}
            onChange={event => onChange(event.target.checked)}
          />
        )}
      />
    </>
  );
}
