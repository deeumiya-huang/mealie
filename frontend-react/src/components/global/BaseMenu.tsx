import { useState } from "react";
import type { ReactNode, MouseEvent } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";
import { icons } from "~/lib/icons";
import { cssColor } from "~/theme/theme";
import { Icon } from "./Icon";

export interface ButtonOption {
  icon?: string;
  color?: string;
  text: string;
  event: string;
  children?: ButtonOption[];
  disabled?: boolean;
  divider?: boolean;
  loading?: boolean;
}

export interface BaseMenuProps {
  activator: ButtonOption;
  children: ButtonOption[];
  large?: boolean;
  stretch?: boolean;
  onMenu?: (event: string) => void;
  /** Custom activator (the Vue `#activator` slot); receives the click handler. */
  renderActivator?: (open: (e: MouseEvent<HTMLElement>) => void) => ReactNode;
}

export function BaseMenu({ activator, children, large = true, stretch = false, onMenu, renderActivator }: BaseMenuProps) {
  const theme = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [subAnchor, setSubAnchor] = useState<{ el: HTMLElement; index: number } | null>(null);
  const close = () => {
    setAnchor(null);
    setSubAnchor(null);
  };
  const open = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const loading = activator.loading || children.some(({ loading }) => loading);

  const select = (event: string) => {
    close();
    onMenu?.(event);
  };

  const submenu = subAnchor !== null ? children[subAnchor.index] : null;

  return (
    <>
      {renderActivator
        ? renderActivator(open)
        : (
            <IconButton
              size={large ? "large" : "medium"}
              onClick={open}
              sx={{ borderRadius: 0, color: cssColor(theme, activator.color), ...(stretch ? { width: "100%" } : {}) }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : <Icon path={activator.icon} />}
            </IconButton>
          )}
      <Menu anchorEl={anchor} open={!!anchor} onClose={close} slotProps={{ paper: { sx: { maxHeight: "80vh" } } }}>
        {children.flatMap((child, idx) => {
          const items = [
            <MenuItem
              key={`item-${idx}`}
              dense
              disabled={child.disabled}
              onClick={(e) => {
                if (child.children) {
                  setSubAnchor({ el: e.currentTarget, index: idx });
                }
                else {
                  select(child.event);
                }
              }}
            >
              {child.icon && (
                <ListItemIcon><Icon path={child.icon} fontSize="small" /></ListItemIcon>
              )}
              <ListItemText>{child.text}</ListItemText>
              {child.children && <Icon path={icons.chevronRight} fontSize="small" />}
            </MenuItem>,
          ];
          if (child.divider) {
            items.push(<Divider key={`divider-${idx}`} sx={{ my: 0.5 }} />);
          }
          return items;
        })}
      </Menu>
      {submenu?.children && (
        <Menu
          anchorEl={subAnchor?.el}
          open={!!subAnchor}
          onClose={() => setSubAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{ paper: { sx: { maxHeight: "80vh" } } }}
        >
          {submenu.children.map((child, idx) => (
            <MenuItem key={idx} dense disabled={child.disabled} onClick={() => select(child.event)}>
              {child.icon && <ListItemIcon><Icon path={child.icon} fontSize="small" /></ListItemIcon>}
              <ListItemText>{child.text}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}

export default BaseMenu;
