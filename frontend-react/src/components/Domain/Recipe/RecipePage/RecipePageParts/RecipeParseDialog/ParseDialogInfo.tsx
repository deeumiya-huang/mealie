import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "~/components/global/Icon";
import { CheckboxInput } from "~/components/global/form";

export function ParseDialogInfo({ value: dontShowAgain, onChange, autoParsed, toReview }: { value: boolean; onChange: (v: boolean) => void; autoParsed: number; toReview: number }) {
  const i18n = useI18n();
  return (
    <>
      <Box sx={{ textAlign: "center", py: 3, px: 2 }}>
        <Icon path={icons.progressCheck} size={96} color="success" />
        <Typography variant="h5" sx={{ my: 2 }}>{i18n.t("recipe.parser.ingredient-parser-headline")}</Typography>
        <Box sx={{ display: "flex", gap: 1, flexDirection: "column", textAlign: "center" }}>
          <Typography variant="h6" component="h3" sx={{ my: 0 }}>{i18n.t("recipe.parser.ingredient-parser-title")}</Typography>
          <p>{i18n.t("recipe.parser.ingredient-parser-description")}</p>
          <p>{i18n.t("recipe.parser.ingredient-parser-final-review-description")}</p>
          <Typography variant="h6" component="h3" sx={{ mb: 0 }}>{i18n.t("recipe.parser.ingredient-parser-result-title")}</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
            {autoParsed > 0 && (
              <Chip color="success" icon={<Icon path={icons.checkboxMarkedCircle} />} label={i18n.t("recipe.parser.ingredient-parser-result-success", autoParsed)} />
            )}
            <Chip color="warning" icon={<Icon path={icons.alert} />} label={i18n.t("recipe.parser.ingredient-parser-result-failed", toReview)} />
          </Box>
        </Box>
      </Box>
      <CheckboxInput sx={{ ml: 1.5 }} hideDetails density="compact" checked={dontShowAgain} onChange={onChange} label={i18n.t("recipe.parser.dont-show-again")} />
    </>
  );
}

export default ParseDialogInfo;
