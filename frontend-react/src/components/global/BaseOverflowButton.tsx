import { useState } from "react";
import Button from "@mui/material/Button";
import type { ButtonProps } from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Link as RouterLink } from "react-router";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "./Icon";

export interface MenuItemDef {
  text: string;
  icon?: string;
  to?: string;
  value?: string;
  event?: string;
  divider?: boolean;
  hide?: boolean;
}

type Mode = "model" | "link" | "event";

export interface BaseOverflowButtonProps extends Omit<ButtonProps, "onChange" | "value"> {
  mode?: Mode;
  items: MenuItemDef[];
  disabled?: boolean;
  btnClass?: string;
  btnText?: string;
  value?: string;
  onChange?: (value: string) => void;
  onEvent?: (event: string) => void;
}

export function BaseOverflowButton({
  mode = "model", items, disabled = false, btnClass = "", btnText, value = "", onChange, onEvent, sx, ...rest
}: BaseOverflowButtonProps) {
  const i18n = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const activeObj: MenuItemDef = items.find(item => item.value === value) ?? { text: "DEFAULT", value: "" };
  const label = mode === "model" ? activeObj.text : (btnText ?? i18n.t("general.actions"));

  const handle = (item: MenuItemDef) => {
    setAnchor(null);
    if (mode === "model") onChange?.(item.value || "");
    else if (mode === "event" && item.event) onEvent?.(item.event);
  };

  return (
    <>
      <Button
        {...rest}
        color="primary"
        variant="contained"
        className={btnClass}
        disabled={disabled}
        onClick={e => setAnchor(e.currentTarget)}
        startIcon={activeObj.icon ? <Icon path={activeObj.icon} /> : undefined}
        endIcon={<Icon path={icons.chevronDown} />}
        sx={sx}
      >
        {label}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {items.filter(item => !item.hide).flatMap((item, index) => {
          const linkProps = mode === "link" && item.to ? { component: RouterLink, to: item.to } : {};
          const nodes = [
            <MenuItem
              key={index}
              dense
              selected={mode === "model" && item.value === value}
              onClick={() => handle(item)}
              {...linkProps}
            >
              {item.icon && <ListItemIcon><Icon path={item.icon} fontSize="small" /></ListItemIcon>}
              <ListItemText>{item.text}</ListItemText>
            </MenuItem>,
          ];
          if (item.divider) nodes.push(<Divider key={`divider-${index}`} sx={{ my: 0.5 }} />);
          return nodes;
        })}
      </Menu>
    </>
  );
}

export default BaseOverflowButton;
