import { useState } from "react";
import Box from "@mui/material/Box";
import type { TableConfig, TableHeaders } from "~/components/global/CrudTable";
import { GroupDataPage } from "~/components/Domain/Group/GroupDataPage";
import { MultiPurposeLabel } from "~/components/Domain/ShoppingList/MultiPurposeLabel";
import { fieldTypes } from "~/hooks/forms";
import { useLabelStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";
import type { MultiPurposeLabelSummary } from "~/lib/api/types/labels";
import type { AutoFormItems } from "~/types/auto-forms";

const tableConfig: TableConfig = { hideColumns: true, canExport: true };

export default function GroupDataLabelsPage() {
  const i18n = useI18n();
  const labelStore = useLabelStore();

  const [tableHeaders] = useState<TableHeaders[]>(() => [
    { text: i18n.t("general.id"), value: "id", show: false },
    { text: i18n.t("general.name"), value: "name", show: true, sortable: true },
  ]);

  // ============================================================
  // Form items (shared)
  const formItems: AutoFormItems = [
    { label: i18n.t("general.name"), varName: "name", type: fieldTypes.TEXT, rules: [validators.required] },
    { label: i18n.t("general.color"), varName: "color", type: fieldTypes.COLOR },
  ];

  // ============================================================
  // Create
  const [createData, setCreateData] = useState({ name: "", color: "" } as MultiPurposeLabelSummary);
  async function handleCreate(data: MultiPurposeLabelSummary) {
    await labelStore.actions.createOne(data);
    setCreateData({ name: "", color: "#7417BE" } as MultiPurposeLabelSummary);
  }

  // ============================================================
  // Edit
  const [editData, setEditData] = useState({} as MultiPurposeLabelSummary);
  async function handleEdit(data: MultiPurposeLabelSummary) {
    await labelStore.actions.updateOne(data);
    setEditData({} as MultiPurposeLabelSummary);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, items: MultiPurposeLabelSummary[]) {
    if (event === "delete-selected") {
      const ids = items.filter(item => item.id != null).map(item => item.id!);
      await labelStore.actions.deleteMany(ids);
    }
  }

  const preview = (label: MultiPurposeLabelSummary) => label.name && <Box sx={{ my: 1 }}><MultiPurposeLabel label={label} /></Box>;

  return (
    <div>
      <GroupDataPage<MultiPurposeLabelSummary, MultiPurposeLabelSummary, MultiPurposeLabelSummary>
        icon={icons.tags}
        title={i18n.t("data-pages.labels.labels")}
        createTitle={i18n.t("data-pages.labels.new-label")}
        editTitle={i18n.t("data-pages.labels.edit-label")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={labelStore.store || []}
        bulkActions={[{ icon: icons.delete, text: i18n.t("general.delete"), event: "delete-selected" }]}
        createForm={{ items: formItems, data: createData }}
        onCreateFormChange={setCreateData}
        editForm={{ items: formItems, data: editData }}
        onEditFormChange={setEditData}
        onCreateOne={data => void handleCreate(data)}
        onEditOne={data => void handleEdit(data)}
        onDeleteOne={id => void labelStore.actions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
        cells={{ name: item => <MultiPurposeLabel label={item} /> }}
        createDialogTop={preview(createData)}
        editDialogTop={preview(editData)}
      />
    </div>
  );
}
