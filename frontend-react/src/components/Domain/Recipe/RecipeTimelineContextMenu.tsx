import { useState } from "react";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { icons } from "~/lib/icons";
import type { RecipeTimelineEventOut, RecipeTimelineEventUpdate } from "~/lib/api/types/recipe";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { TextInput } from "~/components/global/form";

export interface TimelineContextMenuIncludes {
  edit: boolean;
  delete: boolean;
}

export interface TimelineContextMenuItem {
  title: string;
  icon: string;
  color: string | undefined;
  event: string;
}

export interface RecipeTimelineContextMenuProps {
  useItems?: TimelineContextMenuIncludes;
  appendItems?: TimelineContextMenuItem[];
  leadingItems?: TimelineContextMenuItem[];
  menuTop?: boolean;
  event: RecipeTimelineEventOut;
  menuIcon?: string | null;
  onUpdate?: (event: RecipeTimelineEventUpdate) => void;
  onDelete?: () => void;
}

export function RecipeTimelineContextMenu({ useItems, appendItems = [], leadingItems = [], menuTop = false, event, menuIcon, onUpdate, onDelete }: RecipeTimelineContextMenuProps) {
  const i18n = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [localEvent, setLocalEvent] = useState({ ...event });

  const defaultItems: Record<string, TimelineContextMenuItem> = {
    edit: { title: i18n.t("general.edit"), icon: icons.edit, color: undefined, event: "edit" },
    delete: { title: i18n.t("general.delete"), icon: icons.delete, color: "error", event: "delete" },
  };
  const items: TimelineContextMenuItem[] = [];
  for (const [key, value] of Object.entries(useItems ?? { edit: true, delete: true })) {
    if (value && defaultItems[key]) items.push(defaultItems[key]);
  }
  const menuItems = [...items, ...leadingItems, ...appendItems];

  function handle(eventKey: string) {
    setAnchor(null);
    if (eventKey === "edit") {
      setLocalEvent({ ...event });
      setEditDialog(true);
    }
    else if (eventKey === "delete") {
      setDeleteDialog(true);
    }
  }

  return (
    <div style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
      <BaseDialog
        open={editDialog}
        onOpenChange={setEditDialog}
        title={i18n.t("recipe.edit-timeline-event")}
        icon={icons.edit}
        canSubmit
        disableSubmitOnEnter
        submitText={i18n.t("general.save")}
        onSubmit={() => {
          onUpdate?.({ ...localEvent });
          setEditDialog(false);
        }}
      >
        <CardContent>
          <TextInput value={localEvent.subject} onChange={subject => setLocalEvent({ ...localEvent, subject })} label={i18n.t("general.subject")} />
          <TextInput value={localEvent.eventMessage} onChange={eventMessage => setLocalEvent({ ...localEvent, eventMessage })} label={i18n.t("general.message")} multiline rows={4} />
        </CardContent>
      </BaseDialog>
      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        title={i18n.t("events.delete-event")}
        color="error"
        icon={icons.alertCircle}
        canConfirm
        onConfirm={() => onDelete?.()}
      >
        <CardContent>{i18n.t("events.event-delete-confirmation")}</CardContent>
      </BaseDialog>
      <IconButton
        onClick={(e) => {
          e.preventDefault();
          setAnchor(e.currentTarget);
        }}
      >
        <Icon path={menuIcon || icons.dotsVertical} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        className="d-print-none"
        anchorOrigin={{ vertical: menuTop ? "top" : "bottom", horizontal: "left" }}
      >
        {menuItems.map((item, index) => (
          <MenuItem key={index} dense onClick={() => handle(item.event)}>
            <ListItemIcon><Icon path={item.icon} color={item.color} /></ListItemIcon>
            <ListItemText>{item.title}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}

export default RecipeTimelineContextMenu;
