// Usage: <BaseButton save onClick={…} /> · <BaseButton delete /> · <BaseButton secondary icon={icons.edit} text={t("…")} />
// · <BaseButton to="/path">label</BaseButton> · <BaseButton download downloadUrl={url} />.
// The first preset flag (delete, update, edit, cancel, save, download; else create) sets text, icon and colour;
// `secondary` = outlined, `minor`/`cancel` = text, else contained. `children` replaces the text.
import type { ReactNode } from "react";
import Button, { type ButtonProps } from "@mui/material/Button";
import { Link } from "react-router";
import { useUserApi } from "@/hooks/api";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { cssColor, isPaletteColor } from "./colors";
import { MdiIcon } from "./MdiIcon";

export interface BaseButtonProps extends Omit<ButtonProps, "color" | "variant" | "size" | "children" | "href"> {
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
  /** Accepted for parity; Vuetify 3+ ignores it as well (`size` wins). */
  xSmall?: boolean;
  secondary?: boolean;
  minor?: boolean;
  to?: string | null;
  color?: string | null;
  text?: string | null;
  icon?: string | null;
  iconRight?: boolean;
  children?: ReactNode;
}

type Preset = "create" | "update" | "save" | "edit" | "delete" | "cancel" | "download";

export function BaseButton({
  cancel = false,
  update = false,
  edit = false,
  save = false,
  delete: isDelete = false,
  download = false,
  downloadUrl = "",
  loading = false,
  disabled = false,
  small = false,
  xSmall: _xSmall,
  secondary = false,
  minor = false,
  to = null,
  color = null,
  text = null,
  icon = null,
  iconRight = false,
  children,
  create: _create,
  onClick,
  sx,
  ...props
}: BaseButtonProps) {
  const { t } = useI18n();
  const api = useUserApi();

  const presets: Record<Preset, { text: string; icon: string; color: string }> = {
    create: { text: t("general.create"), icon: icons.createAlt, color: "success" },
    update: { text: t("general.update"), icon: icons.edit, color: "success" },
    save: { text: t("general.save"), icon: icons.save, color: "success" },
    edit: { text: t("general.edit"), icon: icons.edit, color: "info" },
    delete: { text: t("general.delete"), icon: icons.delete, color: "error" },
    cancel: { text: t("general.cancel"), icon: icons.close, color: "grey" },
    download: { text: t("general.download"), icon: icons.download, color: "info" },
  };

  const preset: Preset = isDelete
    ? "delete"
    : update ? "update" : edit ? "edit" : cancel ? "cancel" : save ? "save" : download ? "download" : "create";
  const attrs = presets[preset];

  const variant = disabled ? "contained" : secondary ? "outlined" : (minor || cancel) ? "text" : "contained";
  const finalColor = color || attrs.color;
  const iconNode = <MdiIcon path={icon || attrs.icon} />;
  const linkProps = to ? { component: Link, to } : {};

  return (
    <Button
      {...linkProps}
      {...props}
      variant={variant}
      size={small ? "small" : "medium"}
      loading={loading}
      disabled={disabled}
      color={isPaletteColor(finalColor) ? finalColor : "inherit"}
      sx={[
        !isPaletteColor(finalColor) && (theme => ({ color: cssColor(theme, finalColor) })),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      startIcon={iconRight ? undefined : iconNode}
      endIcon={iconRight ? iconNode : undefined}
      onClick={(event) => {
        if (download) {
          void api.utils.download(downloadUrl);
        }
        onClick?.(event);
      }}
    >
      {children ?? (text || attrs.text)}
    </Button>
  );
}
