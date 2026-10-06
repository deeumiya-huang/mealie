// Usage: <ContextMenu items={[{ title: t("general.edit"), icon: icons.edit, event: "edit" }]} onAction={event => …} />
// Three-dots icon button that opens a compact list; picking an item calls `onAction(item.event)`.
import { useState, type MouseEvent } from "react";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import type { Theme } from "@mui/material/styles";
import type { ContextMenuItem } from "@/hooks/use-context-presents";
import { icons } from "@/lib/icons";
import { cssColor } from "./colors";
import { MdiIcon } from "./MdiIcon";

// The item type is declared next to the presets in hooks/use-context-presents.
export type { ContextMenuItem };

interface ContextMenuProps {
  items: ContextMenuItem[];
  menuTop?: boolean;
  onAction?: (event: string) => void;
}

export function ContextMenu({ items, menuTop = true, onAction }: ContextMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  function open(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    setAnchor(event.currentTarget);
  }

  return (
    <>
      <IconButton size="small" aria-haspopup="menu" aria-expanded={anchor !== null} onClick={open}>
        <MdiIcon path={icons.dotsVertical} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        anchorOrigin={{ vertical: menuTop ? "top" : "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: menuTop ? "bottom" : "top", horizontal: "left" }}
        slotProps={{ list: { dense: true }, root: { sx: { "@media print": { display: "none" } } } }}
      >
        {items.map((item, index) => (
          <MenuItem
            key={index}
            dense
            onClick={() => {
              close();
              onAction?.(item.event);
            }}
          >
            <ListItemIcon>
              <MdiIcon path={item.icon} sx={item.color ? (theme: Theme) => ({ color: cssColor(theme, item.color ?? "") }) : undefined} />
            </ListItemIcon>
            <ListItemText>{item.title}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
