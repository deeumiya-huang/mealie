// Usage: <RecipeTimelineContextMenu event={event} menuTop={false} color="transparent" elevation={0}
//   useItems={{ edit: true, delete: true }} onUpdate={updated => …} onDelete={() => …} />
// The three-dots button of a timeline event: "edit" opens a dialog for the subject and message, "delete" asks for
// confirmation first. Leading/appended items that are not edit/delete are reported through `onEvent(event)`.
import { useState } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { Theme } from "@mui/material/styles";
import { BaseDialog } from "@/components/global/BaseDialog";
import { cssColor } from "@/components/global/colors";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import type { RecipeTimelineEventOut, RecipeTimelineEventUpdate } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

export interface TimelineContextMenuIncludes {
  edit: boolean;
  delete: boolean;
}

export interface ContextMenuItem {
  title: string;
  icon: string;
  color: string | undefined;
  event: string;
}

interface RecipeTimelineContextMenuProps {
  useItems?: TimelineContextMenuIncludes;
  appendItems?: ContextMenuItem[];
  leadingItems?: ContextMenuItem[];
  menuTop?: boolean;
  fab?: boolean;
  elevation?: number | null;
  color?: string;
  event: RecipeTimelineEventOut;
  menuIcon?: string | null;
  onDelete?: () => void;
  onUpdate?: (event: RecipeTimelineEventUpdate) => void;
  /** Any other event of a leading/appended item (Vue emitted it by name). */
  onEvent?: (event: string) => void;
}

export function RecipeTimelineContextMenu({
  useItems,
  appendItems,
  leadingItems,
  menuTop,
  fab = false,
  elevation,
  color,
  event,
  menuIcon,
  onDelete,
  onUpdate,
  onEvent,
}: RecipeTimelineContextMenuProps) {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [recipeEventEditDialog, setRecipeEventEditDialog] = useState(false);
  const [recipeEventDeleteDialog, setRecipeEventDeleteDialog] = useState(false);
  const [localEvent, setLocalEvent] = useState<RecipeTimelineEventOut>({ ...event });

  const defaultItems: Record<string, ContextMenuItem> = {
    edit: {
      title: t("general.edit"),
      icon: icons.edit,
      color: undefined,
      event: "edit",
    },
    delete: {
      title: t("general.delete"),
      icon: icons.delete,
      color: "error",
      event: "delete",
    },
  };

  const items: ContextMenuItem[] = [];
  for (const [key, value] of Object.entries(useItems ?? { edit: true, delete: true })) {
    if (value) {
      const item = defaultItems[key];
      if (item) items.push(item);
    }
  }
  const menuItems = [...items, ...(leadingItems ?? []), ...(appendItems ?? [])];

  const icon = menuIcon || icons.dotsVertical;

  function openEditDialog() {
    setLocalEvent({ ...event });
    setRecipeEventEditDialog(true);
  }

  function contextMenuEventHandler(eventKey: string) {
    setAnchor(null);
    if (eventKey === "edit") {
      openEditDialog();
      return;
    }
    if (eventKey === "delete") {
      setRecipeEventDeleteDialog(true);
      return;
    }
    onEvent?.(eventKey);
  }

  function submitEdit() {
    onUpdate?.({ ...localEvent });
    setRecipeEventEditDialog(false);
  }

  return (
    <Box sx={{ textAlign: "center" }}>
      <BaseDialog
        open={recipeEventEditDialog}
        onOpenChange={setRecipeEventEditDialog}
        title={t("recipe.edit-timeline-event")}
        icon={icons.edit}
        canSubmit
        disableSubmitOnEnter
        submitText={t("general.save")}
        onSubmit={submitEdit}
      >
        <CardContent>
          <form onSubmit={submit => submit.preventDefault()}>
            <TextField
              fullWidth
              variant="standard"
              label={t("general.subject")}
              value={localEvent.subject}
              onChange={change => setLocalEvent({ ...localEvent, subject: change.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              minRows={4}
              variant="standard"
              label={t("general.message")}
              value={localEvent.eventMessage ?? ""}
              onChange={change => setLocalEvent({ ...localEvent, eventMessage: change.target.value })}
            />
          </form>
        </CardContent>
      </BaseDialog>

      <BaseDialog
        open={recipeEventDeleteDialog}
        onOpenChange={setRecipeEventDeleteDialog}
        bottomSheet
        title={t("events.delete-event")}
        color="error"
        icon={icons.alertCircle}
        canConfirm
        onConfirm={() => onDelete?.()}
      >
        <CardContent>
          {t("events.event-delete-confirmation")}
        </CardContent>
      </BaseDialog>

      <IconButton
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        sx={(theme: Theme) => ({
          bgcolor: color ? cssColor(theme, color) : undefined,
          boxShadow: elevation === null || elevation === undefined ? undefined : theme.shadows[elevation],
          borderRadius: fab ? "50%" : undefined,
        })}
        size={fab ? "small" : "medium"}
        onClick={(click) => {
          click.preventDefault();
          setAnchor(click.currentTarget);
        }}
      >
        <MdiIcon path={icon} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: menuTop ? "top" : "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: menuTop ? "bottom" : "top", horizontal: "center" }}
        slotProps={{ list: { dense: true }, root: { sx: { displayPrint: "none" } } }}
      >
        {menuItems.map((item, index) => (
          <MenuItem key={index} onClick={() => contextMenuEventHandler(item.event)}>
            <ListItemIcon>
              <MdiIcon path={item.icon} sx={item.color ? (theme: Theme) => ({ color: cssColor(theme, item.color ?? "") }) : undefined} />
            </ListItemIcon>
            <ListItemText>{item.title}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
