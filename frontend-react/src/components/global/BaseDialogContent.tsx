// Usage: rendered by BaseDialog (props pass through); use directly only for a dialog-styled card.
// Coloured toolbar (icon + title), scrollable body, and the default actions: cancel, `customCardAction`,
// delete (`canDelete`), confirm (`canConfirm`), submit (`canSubmit`). `cardActions` replaces them all.
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { BaseButton } from "./BaseButton";
import { cssColor } from "./colors";
import { MdiIcon } from "./MdiIcon";

export interface BaseDialogContentProps {
  color?: string;
  title?: string;
  /** id for the title element (BaseDialog uses it as the dialog's accessible name). */
  titleId?: string;
  icon?: string | null;
  loading?: boolean;
  submitIcon?: string | null;
  submitText?: string;
  submitDisabled?: boolean;
  cancelText?: string;
  canDelete?: boolean;
  canConfirm?: boolean;
  canSubmit?: boolean;
  children?: ReactNode;
  cardActions?: ReactNode;
  customCardAction?: ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  onDelete?: () => void;
}

export function BaseDialogContent({
  color = "primary",
  title = "Modal Title",
  titleId,
  icon = null,
  loading = false,
  submitIcon = null,
  submitText,
  submitDisabled = false,
  cancelText,
  canDelete = false,
  canConfirm = false,
  canSubmit = false,
  children,
  cardActions,
  customCardAction,
  onSubmit,
  onCancel,
  onConfirm,
  onDelete,
}: BaseDialogContentProps) {
  const { t } = useI18n();
  const { xs } = useDisplay();

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", borderRadius: "inherit" }}>
      {loading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 }} />}
      <Toolbar
        sx={theme => ({
          bgcolor: cssColor(theme, color),
          color: "#fff",
          px: 1.5,
          gap: 1.5,
          minHeight: { xs: 56 },
        })}
      >
        <MdiIcon path={icon} size="large" />
        <Typography id={titleId} component="h2" variant="h6" sx={{ fontWeight: 400 }}>
          {title}
        </Typography>
      </Toolbar>

      <Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>{children}</Box>

      <Divider />
      <CardActions
        sx={xs
          ? { pb: 2, display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(min-content, 1fr)" }
          : { p: 1 }}
      >
        {cardActions ?? (
          <>
            <Button variant="text" sx={theme => ({ color: theme.palette.grey[600] })} onClick={onCancel}>
              {cancelText ?? t("general.cancel")}
            </Button>
            {!xs && <Box sx={{ flexGrow: 1 }} />}
            {customCardAction}
            {canDelete && <BaseButton delete onClick={onDelete} />}
            {canConfirm && (
              <BaseButton color={color} type="submit" disabled={submitDisabled} icon={icons.check} onClick={onConfirm}>
                {t("general.confirm")}
              </BaseButton>
            )}
            {canSubmit && (
              <BaseButton type="submit" disabled={submitDisabled || loading} icon={submitIcon} onClick={onSubmit}>
                {submitText ?? t("general.create")}
              </BaseButton>
            )}
          </>
        )}
      </CardActions>
    </Card>
  );
}
