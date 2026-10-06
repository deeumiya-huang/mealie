// Usage: <GroupDataPage icon={icons.tags} title={t("…")} tableHeaders={headers} data={items} bulkActions={actions}
//          createForm={{ items: formItems, data: createData }} onCreateFormChange={form => setCreateData(form.data)}
//          editForm={{ items: formItems, data: editData }} onEditFormChange={form => setEditData(form.data)}
//          onCreateOne={…} onEditOne={…} onDeleteOne={id => …} onBulkAction={(event, items) => …}
//          slots={{ name: item => <b>{item.name}</b> }} tableButtonRow={<BaseButton … />} />
// Port of the group data page frame: create / edit / delete / bulk-delete dialogs around a CrudTable.
// Vue `#item.<key>` slots → `slots[key]`; `#table-button-row`, `#table-button-bottom`, `#create-dialog-top`,
// `#edit-dialog-top`, `#edit-dialog-custom-action`, `#delete-dialog-bottom` → props `tableButtonRow`, `tableButtonBottom`,
// `createDialogTop`, `editDialogTop`, `editDialogCustomAction`, `deleteDialogBottom`; `v-model:createForm/editForm`
// → `createForm`/`editForm` + `onCreateFormChange`/`onEditFormChange`. The create/edit dialogs' open state is local
// (Vue's `v-model:createDialog`/`editDialog` were never bound by a page).
import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { AutoForm } from "@/components/global/AutoForm";
import type { AutoFormItems } from "@/components/global/auto-form-types";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseDialog } from "@/components/global/BaseDialog";
import { CrudTable, type BulkAction, type TableConfig, type TableHeaders } from "@/components/global/CrudTable";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

export interface GroupDataForm<F> {
  items: AutoFormItems;
  data: F;
}

interface GroupDataPageProps<T extends object, F extends object> {
  icon: string;
  title: string;
  createTitle?: string;
  editTitle?: string;
  tableHeaders: TableHeaders[];
  tableConfig?: TableConfig;
  data: T[];
  bulkActions: BulkAction[];
  initialSort?: string;
  createForm: GroupDataForm<F>;
  onCreateFormChange?: (form: GroupDataForm<F>) => void;
  editForm: GroupDataForm<F>;
  onEditFormChange?: (form: GroupDataForm<F>) => void;
  slots?: Record<string, (item: T) => ReactNode>;
  createDialogTop?: ReactNode;
  editDialogTop?: ReactNode;
  editDialogCustomAction?: ReactNode;
  deleteDialogBottom?: ReactNode;
  tableButtonRow?: ReactNode;
  tableButtonBottom?: ReactNode;
  onDeleteDialogOpen?: ((items: T[]) => Promise<void>) | null;
  onCreateOne?: (data: F) => void;
  onEditOne?: (data: F) => void;
  onDeleteOne?: (id: string) => void;
  onBulkAction?: (event: string, items: T[]) => void;
}

const DEFAULT_TABLE_CONFIG: TableConfig = { hideColumns: false, canExport: true };

/** `item.name || item.title || item.id` of the Vue dialogs. */
function itemLabel(item: object): string {
  const record = item as { name?: string; title?: string; id?: string | number | null };
  return record.name || record.title || String(record.id ?? "");
}

export function GroupDataPage<T extends object, F extends object>({
  icon,
  title,
  createTitle,
  editTitle,
  tableHeaders,
  tableConfig = DEFAULT_TABLE_CONFIG,
  data,
  bulkActions,
  initialSort = "name",
  createForm,
  onCreateFormChange,
  editForm,
  onEditFormChange,
  slots,
  createDialogTop,
  editDialogTop,
  editDialogCustomAction,
  deleteDialogBottom,
  tableButtonRow,
  tableButtonBottom,
  onDeleteDialogOpen = null,
  onCreateOne,
  onEditOne,
  onDeleteOne,
  onBulkAction,
}: GroupDataPageProps<T, F>) {
  const { t } = useI18n();

  // ============================================================
  // Create & Edit
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [createFormValid, setCreateFormValid] = useState(false);
  const [editFormValid, setEditFormValid] = useState(false);

  function editEventHandler(item: T) {
    onEditFormChange?.({ ...editForm, data: { ...item } as unknown as F });
    setEditDialog(true);
  }

  // ============================================================
  // Delete Logic
  const [deleteTarget, setDeleteTarget] = useState<(T & { id?: string }) | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  async function deleteEventHandler(item: T) {
    setDeleteTarget(item as T & { id?: string });
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

  // ============================================================
  // Bulk Action Handler
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
        title={createTitle || t("general.create")}
        icon={icon}
        color="primary"
        maxWidth="600px"
        width="100%"
        submitDisabled={!createFormValid}
        canConfirm
        onConfirm={() => onCreateOne?.(createForm.data)}
      >
        <Box sx={{ mx: 1, mt: 1 }}>
          {createDialogTop}
          <AutoForm
            value={createForm.data as Record<string, unknown>}
            onChange={value => onCreateFormChange?.({ ...createForm, data: value as F })}
            onIsValidChange={setCreateFormValid}
            items={createForm.items}
          />
        </Box>
      </BaseDialog>

      {/* Edit Dialog */}
      <BaseDialog
        open={editDialog}
        onOpenChange={setEditDialog}
        title={editTitle || t("general.edit")}
        icon={icon}
        color="primary"
        maxWidth="600px"
        width="100%"
        submitDisabled={!editFormValid}
        canConfirm
        onConfirm={() => onEditOne?.(editForm.data)}
        customCardAction={editDialogCustomAction}
      >
        <Box sx={{ mx: 1, mt: 1 }}>
          {editDialogTop}
          <AutoForm
            value={editForm.data as Record<string, unknown>}
            onChange={value => onEditFormChange?.({ ...editForm, data: value as F })}
            onIsValidChange={setEditFormValid}
            items={editForm.items}
          />
        </Box>
      </BaseDialog>

      {/* Delete Dialog */}
      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        title={t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => onDeleteOne?.(String(deleteTarget?.id ?? ""))}
      >
        <CardContent>
          {t("general.confirm-delete-generic")}
          {deleteTarget && (
            <Typography component="p" sx={{ mt: 2, mb: 0, fontWeight: "bold" }}>
              {itemLabel(deleteTarget)}
            </Typography>
          )}
          {deleteDialogBottom}
        </CardContent>
      </BaseDialog>

      {/* Bulk Delete Dialog */}
      <BaseDialog
        open={bulkDeleteDialog}
        onOpenChange={setBulkDeleteDialog}
        bottomSheet
        width="650px"
        title={t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => onBulkAction?.("delete-selected", bulkDeleteTarget)}
      >
        <CardContent>
          <Typography component="p" variant="h6">
            {t("general.confirm-delete-generic-items")}
          </Typography>
          <Card variant="outlined">
            <List dense disablePadding sx={{ height: 400, overflowY: "auto" }}>
              {bulkDeleteTarget.map((item, index) => (
                <ListItem key={String((item as { id?: string | number | null }).id ?? index)} sx={{ pb: 1 }}>
                  <ListItemText primary={itemLabel(item)} />
                </ListItem>
              ))}
            </List>
          </Card>
          {deleteDialogBottom}
        </CardContent>
      </BaseDialog>

      <BaseCardSectionTitle icon={icon} section title={title} />

      <CrudTable<T>
        headers={tableHeaders}
        tableConfig={tableConfig}
        data={data || []}
        bulkActions={bulkActions}
        initialSort={initialSort}
        slots={slots}
        onEditOne={editEventHandler}
        onDeleteOne={item => void deleteEventHandler(item)}
        onBulkAction={handleBulkAction}
        buttonRow={(
          <>
            <BaseButton create onClick={() => setCreateDialog(true)}>
              {t("general.create")}
            </BaseButton>
            {tableButtonRow}
          </>
        )}
        buttonBottom={tableButtonBottom}
      />
    </>
  );
}
