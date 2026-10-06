import { useState } from "react";
import { GroupDataPage, type GroupDataForm } from "@/components/Domain/Group/GroupDataPage";
import { MultiPurposeLabel } from "@/components/Domain/ShoppingList/MultiPurposeLabel";
import type { BulkAction, TableConfig, TableHeaders } from "@/components/global/CrudTable";
import { fieldTypes } from "@/hooks/forms";
import { useLabelStore } from "@/hooks/store";
import { validators } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import type { MultiPurposeLabelOut, MultiPurposeLabelSummary } from "@/lib/api/types/labels";
import { icons } from "@/lib/icons";
import type { AutoFormItems } from "@/types/auto-forms";

// Port of pages/group/data/labels.vue. Middleware comes from the `group/data` parent route.
const tableConfig: TableConfig = {
  hideColumns: true,
  canExport: true,
};

export default function GroupDataLabelsPage() {
  const { t } = useI18n();

  const tableHeaders: TableHeaders[] = [
    { text: t("general.id"), value: "id", show: false },
    { text: t("general.name"), value: "name", show: true, sortable: true },
  ];

  const labelStore = useLabelStore();

  // ============================================================
  // Form items (shared)
  const formItems: AutoFormItems = [
    {
      label: t("general.name"),
      varName: "name",
      type: fieldTypes.TEXT,
      rules: [validators.required],
    },
    {
      label: t("general.color"),
      varName: "color",
      type: fieldTypes.COLOR,
    },
  ];

  // ============================================================
  // Create
  const [createData, setCreateData] = useState({ name: "", color: "" } as MultiPurposeLabelSummary);
  const createForm: GroupDataForm<MultiPurposeLabelSummary> = { items: formItems, data: createData };

  async function handleCreate(createFormData: MultiPurposeLabelSummary) {
    await labelStore.actions.createOne(createFormData as MultiPurposeLabelOut);
    setCreateData({ name: "", color: "#7417BE" } as MultiPurposeLabelSummary);
  }

  // ============================================================
  // Edit
  const [editData, setEditData] = useState({} as MultiPurposeLabelSummary);
  const editForm: GroupDataForm<MultiPurposeLabelSummary> = { items: formItems, data: editData };

  async function handleEdit(editFormData: MultiPurposeLabelSummary) {
    await labelStore.actions.updateOne(editFormData as MultiPurposeLabelOut);
    setEditData({} as MultiPurposeLabelSummary);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, items: MultiPurposeLabelOut[]) {
    if (event === "delete-selected") {
      const ids = items.filter(item => item.id != null).map(item => item.id);
      await labelStore.actions.deleteMany(ids);
    }
  }

  const bulkActions: BulkAction[] = [{ icon: icons.delete, text: t("general.delete"), event: "delete-selected" }];

  return (
    <div>
      <GroupDataPage<MultiPurposeLabelOut, MultiPurposeLabelSummary>
        icon={icons.tags}
        title={t("data-pages.labels.labels")}
        createTitle={t("data-pages.labels.new-label")}
        editTitle={t("data-pages.labels.edit-label")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={labelStore.store || []}
        bulkActions={bulkActions}
        createForm={createForm}
        onCreateFormChange={form => setCreateData(form.data)}
        editForm={editForm}
        onEditFormChange={form => setEditData(form.data)}
        onCreateOne={data => void handleCreate(data)}
        onEditOne={data => void handleEdit(data)}
        onDeleteOne={id => void labelStore.actions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
        slots={{
          name: item => (item ? <MultiPurposeLabel label={item} /> : null),
        }}
        createDialogTop={createData.name ? <MultiPurposeLabel label={createData} sx={{ my: 1 }} /> : null}
        editDialogTop={editData.name ? <MultiPurposeLabel label={editData} sx={{ my: 1 }} /> : null}
      />
    </div>
  );
}
