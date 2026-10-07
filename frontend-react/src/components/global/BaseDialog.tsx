// Usage:
//   const [open, setOpen] = useState(false);
//   <BaseDialog open={open} onOpenChange={setOpen} title={t("general.create")} icon={icons.tags}
//     canSubmit onSubmit={create} loading={saving}>
//     <CardContent>…form…</CardContent>
//   </BaseDialog>
// `v-model` → `open` + `onOpenChange`. Submitting closes the dialog once `loading` is false (unless
// `keepOpen`); Enter submits (or confirms with `canConfirm`) unless `disableSubmitOnEnter`; Esc / outside
// click cancel. Fullscreen on xs; with `bottomSheet` a bottom drawer on xs. The `#activator` slot is
// `renderActivator({ open })`, the default slot's `submitEvent` is `children({ submitEvent })`.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import Drawer from "@mui/material/Drawer";
import { useDisplay } from "@/hooks/utils";
import { BaseDialogContent } from "./BaseDialogContent";
import { cssSize } from "./colors";

export interface BaseDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  color?: string;
  title?: string;
  icon?: string | null;
  width?: number | string;
  maxWidth?: number | string | null;
  loading?: boolean;
  top?: boolean | null;
  keepOpen?: boolean;
  bottomSheet?: boolean;
  submitIcon?: string | null;
  submitText?: string;
  submitDisabled?: boolean;
  cancelText?: string;
  canDelete?: boolean;
  canConfirm?: boolean;
  canSubmit?: boolean;
  disableSubmitOnEnter?: boolean;
  children?: ReactNode | ((slot: { submitEvent: () => void }) => ReactNode);
  cardActions?: ReactNode;
  customCardAction?: ReactNode;
  renderActivator?: (slot: { open: () => void }) => ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
}

export function BaseDialog({
  open,
  onOpenChange,
  color = "primary",
  title = "Modal Title",
  icon = null,
  width = "500",
  maxWidth = null,
  loading = false,
  top = null,
  keepOpen = false,
  bottomSheet = false,
  submitIcon = null,
  submitText,
  submitDisabled = false,
  cancelText,
  canDelete = false,
  canConfirm = false,
  canSubmit = false,
  disableSubmitOnEnter = false,
  children,
  cardActions,
  customCardAction,
  renderActivator,
  onSubmit,
  onCancel,
  onConfirm,
  onDelete,
  onClose,
}: BaseDialogProps) {
  const { xs } = useDisplay();
  const titleId = useId();
  const setOpen = (value: boolean) => onOpenChange?.(value);

  // `submitted` resets whenever the dialog opens (Vue: watch(dialog))
  const [submitted, setSubmitted] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSubmitted(false);
  }

  // close after a submit/delete once the parent is no longer loading (Vue: watch(determineClose))
  const shouldClose = open && submitted && !loading && !keepOpen;
  useEffect(() => {
    if (shouldClose) onOpenChange?.(false);
  }, [shouldClose, onOpenChange]);

  // emit "close" whenever the dialog goes from open to closed
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) onClose?.();
    wasOpen.current = open;
  }, [open, onClose]);

  function submitEvent() {
    onSubmit?.();
    setSubmitted(true);
  }

  function deleteEvent() {
    onDelete?.();
    setSubmitted(true);
  }

  function cancelEvent() {
    onCancel?.();
    setOpen(false);
  }

  function confirmEvent() {
    onConfirm?.();
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter" || disableSubmitOnEnter) return;
    // React events bubble through portals: ignore Enter from menus/popovers opened inside the dialog
    // (Vuetify teleports those outside the v-dialog, so its @keydown.enter never sees them).
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
    if (canConfirm) {
      if (!submitDisabled) confirmEvent();
      return;
    }
    submitEvent();
  }

  const content = (
    <BaseDialogContent
      color={color}
      title={title}
      titleId={titleId}
      icon={icon}
      loading={loading}
      submitIcon={submitIcon}
      submitText={submitText}
      submitDisabled={submitDisabled}
      cancelText={cancelText}
      canDelete={canDelete}
      canConfirm={canConfirm}
      canSubmit={canSubmit}
      cardActions={cardActions}
      customCardAction={customCardAction}
      onCancel={cancelEvent}
      onConfirm={confirmEvent}
      onSubmit={submitEvent}
      onDelete={deleteEvent}
    >
      {typeof children === "function" ? children({ submitEvent }) : children}
    </BaseDialogContent>
  );

  return (
    <div>
      {renderActivator?.({ open: () => setOpen(true) })}
      {bottomSheet && xs
        ? (
            <Drawer
              anchor="bottom"
              open={open}
              onClose={cancelEvent}
              onKeyDown={onKeyDown}
              slotProps={{
                paper: {
                  "role": "dialog",
                  "aria-labelledby": titleId,
                  "sx": { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", maxWidth: cssSize(maxWidth), mx: "auto" },
                },
              }}
            >
              {content}
            </Drawer>
          )
        : (
            <Dialog
              open={open}
              onClose={cancelEvent}
              onKeyDown={onKeyDown}
              fullScreen={xs}
              maxWidth={false}
              aria-labelledby={titleId}
              sx={top ? { "& .MuiDialog-container": { alignItems: "flex-start" } } : undefined}
              slotProps={{
                paper: {
                  sx: xs ? {} : { width: cssSize(width), maxWidth: cssSize(maxWidth) ?? "calc(100% - 48px)", m: 3 },
                },
              }}
            >
              {content}
            </Dialog>
          )}
    </div>
  );
}
