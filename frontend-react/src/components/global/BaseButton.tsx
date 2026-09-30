import type { MouseEvent, ReactNode } from "react";
import Button from "@mui/material/Button";
import type { ButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Link as RouterLink } from "react-router";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { useUserApi } from "~/hooks/api";
import { isThemeColor } from "~/theme/theme";
import { Icon } from "./Icon";

export interface BaseButtonProps extends Omit<ButtonProps, "color" | "size" | "variant" | "href"> {
  cancel?: boolean;
  create?: boolean;
  update?: boolean;
  edit?: boolean;
  save?: boolean;
  delete?: boolean;
  download?: boolean;
  downloadUrl?: string;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  xSmall?: boolean;
  secondary?: boolean;
  minor?: boolean;
  to?: string | null;
  color?: string | null;
  text?: string | null;
  icon?: string | null;
  iconRight?: boolean;
  /** Replaces the icon (the Vue `#icon` slot). */
  iconSlot?: ReactNode;
  children?: ReactNode;
}

type Preset = { text: string; icon: string; color: string };

function muiColor(color: string): ButtonProps["color"] {
  if (isThemeColor(color)) return color;
  if (color === "grey" || color === "gray") return "grey2";
  return "inherit";
}

export function BaseButton(props: BaseButtonProps) {
  const {
    cancel, create: _create, update, edit, save, delete: del, download, downloadUrl = "",
    loading = false, disabled = false, small = false, xSmall = false, secondary = false, minor = false,
    to = null, color = null, text = null, icon = null, iconRight = false, iconSlot, children, onClick, sx, ...rest
  } = props;
  const i18n = useI18n();
  const api = useUserApi();

  const presets: Record<string, Preset> = {
    create: { text: i18n.t("general.create"), icon: icons.createAlt, color: "success" },
    update: { text: i18n.t("general.update"), icon: icons.edit, color: "success" },
    save: { text: i18n.t("general.save"), icon: icons.save, color: "success" },
    edit: { text: i18n.t("general.edit"), icon: icons.edit, color: "info" },
    delete: { text: i18n.t("general.delete"), icon: icons.delete, color: "error" },
    cancel: { text: i18n.t("general.cancel"), icon: icons.close, color: "grey" },
    download: { text: i18n.t("general.download"), icon: icons.download, color: "info" },
  };

  const btnAttrs = del
    ? presets.delete
    : update
      ? presets.update
      : edit
        ? presets.edit
        : cancel
          ? presets.cancel
          : save
            ? presets.save
            : download
              ? presets.download
              : presets.create;

  const variant: ButtonProps["variant"] = disabled
    ? "outlined"
    : secondary
      ? "outlined"
      : minor || cancel
        ? "text"
        : "contained";

  const iconNode = iconSlot ?? <Icon path={icon || btnAttrs!.icon} />;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (download) {
      void api.utils.download(downloadUrl);
    }
    onClick?.(e);
  };

  const linkProps = to ? { component: RouterLink, to } : {};

  return (
    <Button
      {...rest}
      {...linkProps}
      color={muiColor(color || btnAttrs!.color)}
      size={small || xSmall ? "small" : "medium"}
      variant={variant}
      disabled={disabled || loading}
      onClick={handleClick}
      startIcon={!iconRight ? (loading ? <CircularProgress size={16} color="inherit" /> : iconNode) : undefined}
      endIcon={iconRight ? (loading ? <CircularProgress size={16} color="inherit" /> : iconNode) : undefined}
      sx={[{ textTransform: "none" }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {children ?? (text || btnAttrs!.text)}
    </Button>
  );
}

export default BaseButton;
