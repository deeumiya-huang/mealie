import { useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import { AutoForm } from "~/components/global/AutoForm";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseDialog } from "~/components/global/BaseDialog";
import { CrudTable } from "~/components/global/CrudTable";
import type { BulkAction, TableConfig, TableHeaders } from "~/components/global/CrudTable";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";
import type { AutoFormItems } from "~/types/auto-forms";

/** Anything shown in the table: the delete dialogs label items by name, title or id. */
export interface GroupDataItem {
  id?: string | null;
  name?: string | null;
  title?: string | null;
}

export interface GroupDataForm<D> {
  items: AutoFormItems;
  data: D;
}

export interface GroupDataPageProps<T extends GroupDataItem, C extends object, E extends object> {
  icon: string;
  title: string;
  createTitle?: string;
  editTitle?: string;
  tableHeaders: TableHeaders[];
  tableConfig?: TableConfig;
  data: T[];
  bulkActions: BulkAction[];
  initialSort?: string;
  onDeleteDialogOpen?: (items: T[]) => Promise<void>;

  createForm: GroupDataForm<C>;
  onCreateFormChange: (data: C) => void;
  /** Controlled create dialog (optional; the Vue `v-model:create-dialog`). */
  createDialog?: boolean;
  onCreateDialogChange?: (open: boolean) => void;

  editForm: GroupDataForm<E>;
  onEditFormChange: (data: E) => void;
  editDialog?: boolean;
  onEditDialogChange?: (open: boolean) => void;

  onCreateOne: (data: C) => void;
  onEditOne: (data: E) => void;
  onDeleteOne: (id: string) => void;
  onBulkAction?: (event: string, items: T[]) => void;

  /** Custom table cells (the Vue `#item.<key>` slots). */
  cells?: Partial<Record<string, (item: T) => ReactNode>>;
  createDialogTop?: ReactNode;
  editDialogTop?: ReactNode;
  editDialogCustomAction?: ReactNode;
  deleteDialogBottom?: ReactNode;
  tableButtonRow?: ReactNode;
  tableButtonBottom?: ReactNode;
}

function itemLabel(item: GroupDataItem | null) {
  return item ? (item.name || item.title || item.id) : "";
}

/** Controlled when `value` is given, otherwise local state. */
function useMaybeControlled(value: boolean | undefined, onChange: ((open: boolean) => void) | undefined): [boolean, (open: boolean) => void] {
  const [local, setLocal] = useState(false);
  const controlled = value !== undefined;
  return [
    controlled ? value : local,
    (open: boolean) => {
      if (!controlled) setLocal(open);
      onChange?.(open);
    },
  ];
}

export function GroupDataPage<T extends GroupDataItem, C extends object, E extends object>(props: GroupDataPageProps<T, C, E>) {
  const {
    icon, title, createTitle, editTitle, tableHeaders, tableConfig = { hideColumns: false, canExport: true }, data, bulkActions,
    initialSort = "name", onDeleteDialogOpen, createForm, onCreateFormChange, editForm, onEditFormChange, onCreateOne, onEditOne,
    onDeleteOne, onBulkAction, cells, createDialogTop, editDialogTop, editDialogCustomAction, deleteDialogBottom, tableButtonRow,
    tableButtonBottom,
  } = props;
  const i18n = useI18n();

  const [createDialog, setCreateDialog] = useMaybeControlled(props.createDialog, props.onCreateDialogChange);
  const [editDialog, setEditDialog] = useMaybeControlled(props.editDialog, props.onEditDialogChange);

  // ============================================================
  // Create & Edit
  const [createFormValid, setCreateFormValid] = useState(false);
  const [editFormValid, setEditFormValid] = useState(false);

  function editEventHandler(item: T) {
    onEditFormChange({ ...item } as unknown as E);
    setEditDialog(true);
  }

  // ============================================================
  // Delete Logic
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  async function deleteEventHandler(item: T) {
    setDeleteTarget(item);
    if (onDeleteDialogOpen) {
      await onDeleteDialogOpen([item]);
    }
    setDeleteDialog(true);
  }

  // ============================================================
  // Bulk Delete Logic
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<T[]>([]);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  async function bulkDeleteEventHandler(items: T[]) {
    setBulkDeleteTarget(items);
    if (onDeleteDialogOpen) {
      await onDeleteDialogOpen(items);
    }
    setBulkDeleteDialog(true);
  }

  function handleBulkAction(event: string, items: T[]) {
    if (event === "delete-selected") {
      void bulkDeleteEventHandler(items);
      return;
    }
    onBulkAction?.(event, items);
  }

  return (
    <>
      {/* Create Dialog */}
      <BaseDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        title={createTitle || i18n.t("general.create")}
        icon={icon}
        color="primary"
        maxWidth="600px"
        width="100%"
        submitDisabled={!createFormValid}
        canConfirm
        onConfirm={() => onCreateOne(createForm.data)}
      >
        <Box sx={{ mx: 1, mt: 1 }}>
          {createDialogTop}
          <Box sx={{ py: 1 }}>
            <AutoForm value={createForm.data} onChange={onCreateFormChange} onValidChange={setCreateFormValid} items={createForm.items} />
          </Box>
        </Box>
      </BaseDialog>

      {/* Edit Dialog */}
      <BaseDialog
        open={editDialog}
        onOpenChange={setEditDialog}
        title={editTitle || i18n.t("general.edit")}
        icon={icon}
        color="primary"
        maxWidth="600px"
        width="100%"
        submitDisabled={!editFormValid}
        canConfirm
        onConfirm={() => onEditOne(editForm.data)}
        customCardAction={editDialogCustomAction}
      >
        <Box sx={{ mx: 1, mt: 1 }}>
          {editDialogTop}
          <Box sx={{ py: 1 }}>
            <AutoForm value={editForm.data} onChange={onEditFormChange} onValidChange={setEditFormValid} items={editForm.items} />
          </Box>
        </Box>
      </BaseDialog>

      {/* Delete Dialog */}
      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        title={i18n.t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => deleteTarget?.id && onDeleteOne(deleteTarget.id)}
      >
        <Box sx={{ px: 2, pb: 2 }}>
          {i18n.t("general.confirm-delete-generic")}
          {deleteTarget && <p style={{ margin: "16px 0 0", fontWeight: "bold" }}>{itemLabel(deleteTarget)}</p>}
          {deleteDialogBottom}
        </Box>
      </BaseDialog>

      {/* Bulk Delete Dialog */}
      <BaseDialog
        open={bulkDeleteDialog}
        onOpenChange={setBulkDeleteDialog}
        bottomSheet
        width="650px"
        title={i18n.t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => handleBulkActionConfirm()}
      >
        <Box sx={{ px: 2, pb: 2 }}>
          <p>{i18n.t("general.confirm-delete-generic-items")}</p>
          <Paper variant="outlined" sx={{ maxHeight: 400, overflowY: "auto" }}>
            <List dense>
              {bulkDeleteTarget.map((item, i) => (
                <ListItem key={item.id ?? i} sx={{ pb: 1 }}>
                  <ListItemText primary={itemLabel(item)} />
                </ListItem>
              ))}
            </List>
          </Paper>
          {deleteDialogBottom}
        </Box>
      </BaseDialog>

      <BaseCardSectionTitle icon={icon} section title={title} />

      <CrudTable<T>
        headers={tableHeaders}
        tableConfig={tableConfig}
        data={data || []}
        bulkActions={bulkActions}
        initialSort={initialSort}
        onEditOne={editEventHandler}
        onDeleteOne={item => void deleteEventHandler(item)}
        onBulkAction={handleBulkAction}
        cells={cells}
        buttonRow={(
          <>
            <BaseButton create onClick={() => setCreateDialog(true)}>
              {i18n.t("general.create")}
            </BaseButton>
            {tableButtonRow}
          </>
        )}
        buttonBottom={tableButtonBottom}
      />
    </>
  );

  function handleBulkActionConfirm() {
    onBulkAction?.("delete-selected", bulkDeleteTarget);
  }
}

export default GroupDataPage;
