import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import LinearProgress from "@mui/material/LinearProgress";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { icons } from "~/lib/icons";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { cssColor } from "~/theme/theme";
import { BaseButton } from "./BaseButton";
import { Icon } from "./Icon";

export interface BaseDialogContentProps {
  color?: string;
  title?: string;
  icon?: string | null;
  loading?: boolean;
  submitIcon?: string | null;
  submitText?: string;
  submitDisabled?: boolean;
  cancelText?: string;
  canDelete?: boolean;
  canConfirm?: boolean;
  canSubmit?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  onSubmit?: () => void;
  onDelete?: () => void;
  /** Replaces the default action buttons (the Vue `#card-actions` slot). */
  cardActions?: ReactNode;
  /** Extra action placed before the default buttons (the Vue `#custom-card-action` slot). */
  customCardAction?: ReactNode;
  children?: ReactNode;
}

export function BaseDialogContent({
  color = "primary", title = "Modal Title", icon = null, loading = false, submitIcon = null, submitText, submitDisabled = false,
  cancelText, canDelete = false, canConfirm = false, canSubmit = false, onCancel, onConfirm, onSubmit, onDelete,
  cardActions, customCardAction, children,
}: BaseDialogContentProps) {
  const i18n = useI18n();
  const theme = useTheme();
  const display = useDisplay();
  const submitLabel = submitText ?? i18n.t("general.create");
  const cancelLabel = cancelText ?? i18n.t("general.cancel");

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: "inherit" }} elevation={0}>
      {loading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 }} />}
      <Toolbar
        sx={{ bgcolor: cssColor(theme, color), color: "#fff", px: 1.5, gap: 1, minHeight: { xs: 56 } }}
      >
        <Icon path={icon} size="large" />
        <Typography variant="h6" component="div" sx={{ flex: 1 }} noWrap>
          {title}
        </Typography>
      </Toolbar>

      <Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>{children}</Box>

      <Divider />
      <CardActions
        sx={display.xs
          ? { pb: 2, display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(min-content, 1fr)" }
          : { px: 2 }}
      >
        {cardActions ?? (
          <>
            <Button variant="text" color="grey2" onClick={() => onCancel?.()}>
              {cancelLabel}
            </Button>
            {!display.xs && <Box sx={{ flex: 1 }} />}
            {customCardAction}
            {canDelete && <BaseButton delete onClick={() => onDelete?.()} />}
            {canConfirm && (
              <BaseButton color={color} type="submit" disabled={submitDisabled} onClick={() => onConfirm?.()} iconSlot={<Icon path={icons.check} />}>
                {i18n.t("general.confirm")}
              </BaseButton>
            )}
            {canSubmit && (
              <BaseButton
                type="submit"
                disabled={submitDisabled || loading}
                onClick={() => onSubmit?.()}
                icon={submitIcon}
              >
                {submitLabel}
              </BaseButton>
            )}
          </>
        )}
      </CardActions>
    </Card>
  );
}

export interface BaseDialogProps extends Omit<BaseDialogContentProps, "children" | "onCancel" | "onConfirm" | "onSubmit" | "onDelete"> {
  /** v-model */
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  width?: number | string;
  maxWidth?: number | string | null;
  top?: boolean | null;
  keepOpen?: boolean;
  bottomSheet?: boolean;
  disableSubmitOnEnter?: boolean;
  onSubmit?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  /** The Vue `#activator` slot. */
  activator?: (props: { open: () => void }) => ReactNode;
  children?: ReactNode | ((props: { submitEvent: () => void }) => ReactNode);
}

function toCss(size: number | string | null | undefined): string | undefined {
  if (size === null || size === undefined) return undefined;
  return typeof size === "number" || /^\d+$/.test(size) ? `${size}px` : size;
}

/**
 * Dialog with a colored title bar and submit/cancel/confirm/delete actions.
 * On extra-small screens it becomes fullscreen (or a bottom sheet with `bottomSheet`).
 *
 * After `submit`/`delete` the dialog closes itself once `loading` is false, unless `keepOpen`.
 */
export function BaseDialog(props: BaseDialogProps) {
  const {
    open, onOpenChange, width = "500", maxWidth = null, top = null, keepOpen = false, bottomSheet = false,
    disableSubmitOnEnter = false, onSubmit, onCancel, onConfirm, onDelete, onClose, activator, children,
    ...contentProps
  } = props;
  const i18n = useI18n();
  const display = useDisplay();
  const [submitted, setSubmitted] = useState(false);
  const wasOpen = useRef(open);

  const setOpen = (value: boolean) => onOpenChange?.(value);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setSubmitted(false);
    }
    if (!open && wasOpen.current) {
      onClose?.();
    }
    wasOpen.current = open;
  }, [open, onClose]);

  useEffect(() => {
    if (submitted && !contentProps.loading && !keepOpen) {
      setSubmitted(false);
      setOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mirrors the Vue watcher on these values only
  }, [submitted, contentProps.loading, keepOpen]);

  const submitEvent = () => {
    onSubmit?.();
    setSubmitted(true);
  };

  const submitOnEnter = (e: KeyboardEvent) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || disableSubmitOnEnter) {
      return;
    }
    if (contentProps.canConfirm) {
      if (!contentProps.submitDisabled) {
        onConfirm?.();
        setOpen(false);
      }
      return;
    }
    submitEvent();
  };

  const cancel = () => {
    onCancel?.();
    setOpen(false);
  };

  const content = (
    <BaseDialogContent
      {...contentProps}
      submitText={contentProps.submitText ?? i18n.t("general.create")}
      cancelText={contentProps.cancelText ?? i18n.t("general.cancel")}
      onCancel={cancel}
      onConfirm={() => {
        onConfirm?.();
        setOpen(false);
      }}
      onSubmit={submitEvent}
      onDelete={() => {
        onDelete?.();
        setSubmitted(true);
      }}
    >
      {typeof children === "function" ? children({ submitEvent }) : children}
    </BaseDialogContent>
  );

  const handleBackdropClose = () => {
    onCancel?.();
    setOpen(false);
  };

  return (
    <>
      {activator?.({ open: () => setOpen(true) })}
      {bottomSheet && display.xs
        ? (
            <Drawer
              anchor="bottom"
              open={open}
              onClose={handleBackdropClose}
              onKeyDown={submitOnEnter}
              slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", maxWidth: toCss(maxWidth), mx: "auto" } } }}
            >
              {content}
            </Drawer>
          )
        : (
            <Dialog
              open={open}
              onClose={handleBackdropClose}
              onKeyDown={submitOnEnter}
              fullScreen={display.xs}
              maxWidth={false}
              slotProps={{
                paper: {
                  sx: {
                    width: display.xs ? undefined : toCss(width),
                    maxWidth: display.xs ? undefined : (toCss(maxWidth) ?? "calc(100% - 48px)"),
                    ...(top ? { position: "fixed", top: 0 } : {}),
                  },
                },
              }}
            >
              {content}
            </Dialog>
          )}
    </>
  );
}

export default BaseDialog;
