// Usage: <BaseMenu activator={{ icon: icons.dotsVertical, text: t("general.menu"), event: "menu" }}
//          children={[{ icon: icons.edit, text: t("general.edit"), event: "edit" }]} onMenu={event => …} />
// Port of the Vuetify menu: an icon button (or `renderActivator`) opens a list; a child with `children`
// opens a submenu on hover/focus/click; picking an item calls `onMenu(child.event)`.
import { useState, type MouseEvent, type ReactNode } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { isPaletteColor } from "./colors";
import { MdiIcon } from "./MdiIcon";

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

export interface MenuActivatorProps {
  "onClick": (event: MouseEvent<HTMLElement>) => void;
  "onMouseEnter"?: (event: MouseEvent<HTMLElement>) => void;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
}

interface BaseMenuProps {
  activator: ButtonOption;
  children: ButtonOption[];
  large?: boolean;
  stretch?: boolean;
  submenu?: boolean;
  onMenu?: (event: string) => void;
  /** Replaces the default icon button (Vue `#activator` slot). */
  renderActivator?: (props: MenuActivatorProps) => ReactNode;
}

export function BaseMenu({ activator, children, large = true, stretch = false, submenu = false, onMenu, renderActivator }: BaseMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = anchor !== null;
  const close = () => setAnchor(null);

  const activatorProps: MenuActivatorProps = {
    "onClick": event => setAnchor(event.currentTarget),
    "onMouseEnter": submenu ? event => setAnchor(event.currentTarget) : undefined,
    "aria-haspopup": "menu",
    "aria-expanded": open,
  };

  const loading = activator.loading || children.some(child => child.loading);

  return (
    <>
      {renderActivator
        ? renderActivator(activatorProps)
        : (
            <IconButton
              {...activatorProps}
              aria-label={activator.text}
              size={large ? "large" : "medium"}
              color={isPaletteColor(activator.color) ? activator.color : "default"}
              sx={stretch ? { width: "100%", borderRadius: 0 } : { borderRadius: 0 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : <MdiIcon path={activator.icon} />}
            </IconButton>
          )}
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={close}
        anchorOrigin={submenu ? { vertical: "top", horizontal: "left" } : { vertical: "bottom", horizontal: "left" }}
        transformOrigin={submenu ? { vertical: "top", horizontal: "right" } : { vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { maxHeight: "80vh" } }, list: { dense: true } }}
      >
        {children.flatMap((child, idx) => {
          const item = child.children
            ? (
                <BaseMenu
                  key={idx}
                  activator={child}
                  submenu
                  onMenu={(event) => {
                    close();
                    onMenu?.(event);
                  }}
                  renderActivator={props => (
                    <MenuItem {...props} dense disabled={child.disabled}>
                      {child.icon && <ListItemIcon><MdiIcon path={child.icon} /></ListItemIcon>}
                      <ListItemText>{child.text}</ListItemText>
                    </MenuItem>
                  )}
                >
                  {child.children}
                </BaseMenu>
              )
            : (
                <MenuItem
                  key={idx}
                  dense
                  disabled={child.disabled}
                  onClick={() => {
                    close();
                    onMenu?.(child.event);
                  }}
                >
                  {child.icon && <ListItemIcon><MdiIcon path={child.icon} /></ListItemIcon>}
                  <ListItemText>{child.text}</ListItemText>
                </MenuItem>
              );
          return child.divider ? [item, <Divider key={`divider-${idx}`} sx={{ my: 0.5 }} />] : [item];
        })}
      </Menu>
    </>
  );
}
