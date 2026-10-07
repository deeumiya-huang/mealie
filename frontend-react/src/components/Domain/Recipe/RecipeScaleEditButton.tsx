// Usage: <RecipeScaleEditButton value={scale} onChange={setScale} recipeServings={servings} editScale /> — the
// "Serves N" chip; with `editScale` (and servings set) it opens a servings field and shows −/+ buttons that rescale
// the recipe. (Vue `v-model` → `value` + `onChange`.)
import { useState, type MouseEvent } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseNumberInput } from "@/components/global/BaseNumberInput";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useScaledAmount } from "@/hooks/recipes/use-scaled-amount";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface RecipeScaleEditButtonProps {
  value: number;
  onChange: (value: number) => void;
  recipeServings?: number;
  editScale?: boolean;
}

export function RecipeScaleEditButton({ value: scale, onChange, recipeServings = 0, editScale = false }: RecipeScaleEditButtonProps) {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const canEditScale = editScale && recipeServings > 0;

  function recalculateScale(newYield: number) {
    if (isNaN(newYield) || newYield <= 0) {
      return;
    }

    if (recipeServings <= 0) {
      onChange(1);
    }
    else {
      onChange(newYield / recipeServings);
    }
  }

  const recipeYieldAmount = useScaledAmount(recipeServings, scale);
  const yieldQuantity = recipeYieldAmount.scaledAmount;
  const yieldDisplay = yieldQuantity
    ? t("recipe.serves-amount", { amount: recipeYieldAmount.scaledAmountDisplay })
    : "";

  const disableDecrement = yieldQuantity <= 1;

  if (!yieldDisplay) {
    return null;
  }

  const chip = (
    <ButtonBase
      disabled={!canEditScale}
      aria-haspopup={canEditScale ? "true" : undefined}
      aria-expanded={canEditScale ? !!anchor : undefined}
      onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
      sx={theme => ({
        py: 0.5,
        px: 1,
        borderRadius: 1,
        fontSize: "0.875rem",
        bgcolor: "secondary.dark",
        color: theme.palette.secondary.contrastText,
        boxShadow: 1,
        cursor: canEditScale ? "pointer" : "default",
      })}
    >
      {canEditScale && <MdiIcon path={icons.edit} size="small" sx={{ mr: 1 }} />}
      {/* the scaled amount is generated markup (fraction <sup>/<sub>), the template only interpolates it */}
      <span dangerouslySetInnerHTML={{ __html: yieldDisplay }} />
    </ButtonBase>
  );

  return (
    <div>
      <Box sx={{ textAlign: "center", display: "flex", alignItems: "center" }}>
        <div>
          {canEditScale
            ? (
                <Tooltip title={t("recipe.edit-scale")} placement="top">
                  {chip}
                </Tooltip>
              )
            : chip}
          <Popover
            open={canEditScale && !!anchor}
            anchorEl={anchor}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <Card sx={{ minWidth: 300 }}>
              <Typography variant="h6" component="div" sx={{ pt: 1, px: 2, mb: 0 }}>
                {t("recipe.servings")}
              </Typography>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <BaseNumberInput
                    value={yieldQuantity}
                    precision={null}
                    min={0}
                    variant="underlined"
                    controlVariant="hidden"
                    fullWidth
                    onChange={v => recalculateScale(v || 0)}
                  />
                  <Tooltip title={t("recipe.reset-servings-count")} placement="right">
                    <IconButton size="small" sx={{ mx: 0.5 }} onClick={() => onChange(1)}>
                      <MdiIcon path={icons.undo} />
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
                {
                  icon: icons.minus,
                  text: t("recipe.decrease-scale-label"),
                  event: "decrement",
                  disabled: disableDecrement,
                },
                {
                  icon: icons.createAlt,
                  text: t("recipe.increase-scale-label"),
                  event: "increment",
                },
              ]}
              onAction={(event) => {
                if (event === "decrement") {
                  recalculateScale(yieldQuantity - 1);
                }
                else if (event === "increment") {
                  recalculateScale(yieldQuantity + 1);
                }
              }}
            />
          </Box>
        )}
      </Box>
    </div>
  );
}
