import { useState } from "react";
import { GroupDataPage, type GroupDataForm } from "@/components/Domain/Group/GroupDataPage";
import type { BulkAction, TableConfig, TableHeaders } from "@/components/global/CrudTable";
import { fieldTypes } from "@/hooks/forms";
import { useGroupRecipeActions } from "@/hooks/use-group-recipe-actions";
import { validators } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import type { GroupRecipeActionOut } from "@/lib/api/types/household";
import { icons } from "@/lib/icons";
import type { AutoFormItems } from "@/types/auto-forms";

// Port of pages/group/data/recipe-actions.vue. Middleware comes from the `group/data` parent route.
const tableConfig: TableConfig = {
  hideColumns: true,
  canExport: true,
};

export default function GroupDataRecipeActionsPage() {
  const { t } = useI18n();

  const tableHeaders: TableHeaders[] = [
    { text: t("general.id"), value: "id", show: false },
    { text: t("general.title"), value: "title", show: true, sortable: true },
    { text: t("general.url"), value: "url", show: true },
    { text: t("data-pages.recipe-actions.action-type"), value: "actionType", show: true, sortable: true },
  ];

  const actionStore = useGroupRecipeActions();

  // ============================================================
  // Form items (shared)
  const formItems: AutoFormItems = [
    {
      label: t("general.title"),
      varName: "title",
      type: fieldTypes.TEXT,
      rules: [validators.required],
    },
    {
      label: t("general.url"),
      varName: "url",
      type: fieldTypes.TEXT,
      rules: [validators.required, validators.url],
    },
    {
      label: t("data-pages.recipe-actions.action-type"),
      varName: "actionType",
      type: fieldTypes.SELECT,
      options: [
        { text: t("data-pages.recipe-actions.action-types.link"), value: "link" },
        { text: t("data-pages.recipe-actions.action-types.post"), value: "post" },
      ],
      selectReturnValue: "value",
      rules: [validators.required],
    },
  ];

  // ============================================================
  // Create
  const [createData, setCreateData] = useState({} as GroupRecipeActionOut);
  const createForm: GroupDataForm<GroupRecipeActionOut> = { items: formItems, data: createData };

  async function handleCreate(createFormData: GroupRecipeActionOut) {
    await actionStore.actions.createOne(createFormData);
    setCreateData({} as GroupRecipeActionOut);
  }

  // ============================================================
  // Edit Action
  const [editData, setEditData] = useState({} as GroupRecipeActionOut);
  const editForm: GroupDataForm<GroupRecipeActionOut> = { items: formItems, data: editData };

  async function handleEdit(editFormData: GroupRecipeActionOut) {
    await actionStore.actions.updateOne(editFormData);
    setEditData({} as GroupRecipeActionOut);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, items: GroupRecipeActionOut[]) {
    console.log("Bulk Action Event:", event, "Items:", items);
    if (event === "delete-selected") {
      const ids = items.filter(item => item.id != null).map(item => item.id);
      await actionStore.actions.deleteMany(ids);
    }
  }

  const bulkActions: BulkAction[] = [{ icon: icons.delete, text: t("general.delete"), event: "delete-selected" }];

  return (
    <div>
      <GroupDataPage<GroupRecipeActionOut, GroupRecipeActionOut>
        icon={icons.link}
        title={t("data-pages.recipe-actions.recipe-actions-data")}
        createTitle={t("data-pages.recipe-actions.new-recipe-action")}
        editTitle={t("data-pages.recipe-actions.edit-recipe-action")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={actionStore.recipeActions || []}
        bulkActions={bulkActions}
        createForm={createForm}
        onCreateFormChange={form => setCreateData(form.data)}
        editForm={editForm}
        onEditFormChange={form => setEditData(form.data)}
        initialSort="title"
        onCreateOne={data => void handleCreate(data)}
        onEditOne={data => void handleEdit(data)}
        onDeleteOne={id => void actionStore.actions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
      />
    </div>
  );
}
