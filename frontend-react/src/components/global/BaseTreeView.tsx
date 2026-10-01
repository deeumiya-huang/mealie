import { useState } from "react";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { icons } from "~/lib/icons";
import { Icon } from "./Icon";

export interface TreeNode {
  icon: string;
  title: string;
  children?: TreeNode[];
}

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!node.children?.length;
  return (
    <>
      <ListItemButton dense sx={{ pl: 1 + depth * 3 }} onClick={() => hasChildren && setOpen(!open)}>
        <ListItemIcon sx={{ minWidth: 28 }}>
          {hasChildren && <Icon path={icons.chevronDown} size="small" sx={{ transform: open ? undefined : "rotate(-90deg)" }} />}
        </ListItemIcon>
        <ListItemIcon sx={{ minWidth: 32 }}><Icon path={node.icon} /></ListItemIcon>
        <ListItemText primary={node.title} />
      </ListItemButton>
      {hasChildren && (
        <Collapse in={open} unmountOnExit>
          <List disablePadding dense>
            {node.children!.map((child, i) => <TreeItem key={i} node={child} depth={depth + 1} />)}
          </List>
        </Collapse>
      )}
    </>
  );
}

/** `<v-treeview density="compact">` with a prepended icon per node; nodes start collapsed. */
export function BaseTreeView({ items }: { items: TreeNode[] }) {
  return (
    <List dense disablePadding>
      {items.map((node, i) => <TreeItem key={i} node={node} depth={0} />)}
    </List>
  );
}

export default BaseTreeView;
