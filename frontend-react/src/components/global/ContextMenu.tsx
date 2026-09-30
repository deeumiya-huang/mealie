import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { icons } from "~/lib/icons";
import type { ContextMenuItem } from "~/hooks/use-context-presents";
import { Icon } from "./Icon";

export interface ContextMenuProps {
  items: ContextMenuItem[];
  menuTop?: boolean;
  onEvent?: (event: string) => void;
}

export function ContextMenu({ items, menuTop = true, onEvent }: ContextMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <Icon path={icons.dotsVertical} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        className="d-print-none"
        anchorOrigin={{ vertical: menuTop ? "top" : "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: menuTop ? "bottom" : "top", horizontal: "left" }}
      >
        {items.map((item, index) => (
          <MenuItem
            key={index}
            dense
            onClick={() => {
              setAnchor(null);
              onEvent?.(item.event);
            }}
          >
            <ListItemIcon><Icon path={item.icon} color={item.color} fontSize="small" /></ListItemIcon>
            <ListItemText>{item.title}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default ContextMenu;
