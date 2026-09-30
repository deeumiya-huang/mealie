import { useState } from "react";
import DOMPurify from "dompurify";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import { useScaledAmount } from "~/hooks/recipes/use-scaled-amount";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { Icon } from "~/components/global/Icon";
import { NumberInput } from "~/components/global/form";

export const chipSx = {
  p: 0.5,
  px: 1,
  bgcolor: "secondary.dark",
  color: "#fff",
  fontSize: "0.875rem",
  display: "inline-flex",
  alignItems: "center",
} as const;

export interface RecipeScaleEditButtonProps {
  value: number;
  onChange: (scale: number) => void;
  recipeServings?: number;
  editScale?: boolean;
}

export function RecipeScaleEditButton({ value: scale, onChange, recipeServings = 0, editScale = false }: RecipeScaleEditButtonProps) {
  const i18n = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const canEditScale = editScale && recipeServings > 0;

  function recalculateScale(newYield: number) {
    if (isNaN(newYield) || newYield <= 0) return;
    onChange(recipeServings <= 0 ? 1 : newYield / recipeServings);
  }

  const recipeYieldAmount = useScaledAmount(recipeServings, scale);
  const yieldQuantity = recipeYieldAmount.scaledAmount;
  const yieldDisplay = yieldQuantity
    ? DOMPurify.sanitize(i18n.t("recipe.serves-amount", { amount: recipeYieldAmount.scaledAmountDisplay }), { ALLOWED_TAGS: ["sup", "sub", "span"] })
    : "";
  const disableDecrement = yieldQuantity <= 1;

  if (!yieldDisplay) return null;

  const chip = (
    <Card
      sx={{ ...chipSx, cursor: canEditScale ? "pointer" : "default" }}
      onClick={e => canEditScale && setAnchor(e.currentTarget)}
    >
      {canEditScale && <Icon path={icons.edit} size="small" sx={{ mr: 1 }} />}
      {/* serves-amount with the formatted fraction (sup/sub only) */}
      <span dangerouslySetInnerHTML={{ __html: yieldDisplay }} />
    </Card>
  );

  return (
    <div>
      <Box sx={{ textAlign: "center", display: "flex", alignItems: "center" }}>
        <div>
          {canEditScale ? <Tooltip title={i18n.t("recipe.edit-scale")} placement="top">{chip}</Tooltip> : chip}
          <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "top", horizontal: "left" }} transformOrigin={{ vertical: "bottom", horizontal: "left" }}>
            <Card sx={{ minWidth: 300 }}>
              <Typography variant="h6" sx={{ px: 2, pt: 1.5 }}>{i18n.t("recipe.servings")}</Typography>
              <CardContent>
                <Box sx={{ mt: 1, display: "flex", alignItems: "center" }}>
                  <NumberInput value={yieldQuantity} min={0} variant="underlined" onChange={v => recalculateScale(v || 0)} />
                  <Tooltip title={i18n.t("recipe.reset-servings-count")} placement="right">
                    <IconButton size="small" sx={{ mx: 0.5 }} onClick={() => onChange(1)}>
                      <Icon path={icons.undo} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Popover>
        </div>
        {canEditScale && (
          <Box sx={{ pl: 1 }}>
            <BaseButtonGroup
              large={false}
              buttons={[
                { icon: icons.minus, text: i18n.t("recipe.decrease-scale-label"), event: "decrement", disabled: disableDecrement },
                { icon: icons.createAlt, text: i18n.t("recipe.increase-scale-label"), event: "increment" },
              ]}
              onEvent={e => recalculateScale(e === "decrement" ? yieldQuantity - 1 : yieldQuantity + 1)}
            />
          </Box>
        )}
      </Box>
    </div>
  );
}

export default RecipeScaleEditButton;
