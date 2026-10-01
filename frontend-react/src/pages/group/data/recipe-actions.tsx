import { useState } from "react";
import type { TableConfig, TableHeaders } from "~/components/global/CrudTable";
import { GroupDataPage } from "~/components/Domain/Group/GroupDataPage";
import { fieldTypes } from "~/hooks/forms";
import { useGroupRecipeActions } from "~/hooks/use-group-recipe-actions";
import { useI18n } from "~/hooks/use-global-i18n";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";
import type { GroupRecipeActionOut } from "~/lib/api/types/household";
import type { AutoFormItems } from "~/types/auto-forms";

const tableConfig: TableConfig = { hideColumns: true, canExport: true };

export default function GroupDataRecipeActionsPage() {
  const i18n = useI18n();
  const actionStore = useGroupRecipeActions();

  const [tableHeaders] = useState<TableHeaders[]>(() => [
    { text: i18n.t("general.id"), value: "id", show: false },
    { text: i18n.t("general.title"), value: "title", show: true, sortable: true },
    { text: i18n.t("general.url"), value: "url", show: true },
    { text: i18n.t("data-pages.recipe-actions.action-type"), value: "actionType", show: true, sortable: true },
  ]);

  // ============================================================
  // Form items (shared)
  const formItems: AutoFormItems = [
    { label: i18n.t("general.title"), varName: "title", type: fieldTypes.TEXT, rules: [validators.required] },
    { label: i18n.t("general.url"), varName: "url", type: fieldTypes.TEXT, rules: [validators.required, validators.url] },
    {
      label: i18n.t("data-pages.recipe-actions.action-type"),
      varName: "actionType",
      type: fieldTypes.SELECT,
      options: [
        { text: i18n.t("data-pages.recipe-actions.action-types.link"), value: "link" },
        { text: i18n.t("data-pages.recipe-actions.action-types.post"), value: "post" },
      ],
      selectReturnValue: "value",
      rules: [validators.required],
    },
  ];

  // ============================================================
  // Create
  const [createData, setCreateData] = useState({} as GroupRecipeActionOut);
  async function handleCreate(data: GroupRecipeActionOut) {
    await actionStore.actions.createOne(data);
    setCreateData({} as GroupRecipeActionOut);
  }

  // ============================================================
  // Edit Action
  const [editData, setEditData] = useState({} as GroupRecipeActionOut);
  async function handleEdit(data: GroupRecipeActionOut) {
    await actionStore.actions.updateOne(data);
    setEditData({} as GroupRecipeActionOut);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, items: GroupRecipeActionOut[]) {
    if (event === "delete-selected") {
      const ids = items.filter(item => item.id != null).map(item => item.id);
      await actionStore.actions.deleteMany(ids);
    }
  }

  return (
    <div>
      <GroupDataPage<GroupRecipeActionOut, GroupRecipeActionOut, GroupRecipeActionOut>
        icon={icons.link}
        title={i18n.t("data-pages.recipe-actions.recipe-actions-data")}
        createTitle={i18n.t("data-pages.recipe-actions.new-recipe-action")}
        editTitle={i18n.t("data-pages.recipe-actions.edit-recipe-action")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={actionStore.recipeActions || []}
        bulkActions={[{ icon: icons.delete, text: i18n.t("general.delete"), event: "delete-selected" }]}
        createForm={{ items: formItems, data: createData }}
        onCreateFormChange={setCreateData}
        editForm={{ items: formItems, data: editData }}
        onEditFormChange={setEditData}
        initialSort="title"
        onCreateOne={data => void handleCreate(data)}
        onEditOne={data => void handleEdit(data)}
        onDeleteOne={id => void actionStore.actions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
      />
    </div>
  );
}
