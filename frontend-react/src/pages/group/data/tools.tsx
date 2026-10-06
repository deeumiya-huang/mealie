import { useState } from "react";
import { GroupDataPage, type GroupDataForm } from "@/components/Domain/Group/GroupDataPage";
import type { BulkAction, TableConfig, TableHeaders } from "@/components/global/CrudTable";
import { MdiIcon } from "@/components/global/MdiIcon";
import { fieldTypes } from "@/hooks/forms";
import { useToolStore } from "@/hooks/store";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { validators } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import type { RecipeTool, RecipeToolCreate } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import type { AutoFormItems } from "@/types/auto-forms";

// Port of pages/group/data/tools.vue. Middleware comes from the `group/data` parent route.
interface RecipeToolWithOnHand extends RecipeTool {
  onHand: boolean;
}

const tableConfig: TableConfig = {
  hideColumns: true,
  canExport: true,
};

export default function GroupDataToolsPage() {
  const { t } = useI18n();

  const tableHeaders: TableHeaders[] = [
    { text: t("general.id"), value: "id", show: false },
    { text: t("general.name"), value: "name", show: true, sortable: true },
    { text: t("tool.on-hand"), value: "onHand", show: true, sortable: true },
  ];

  const auth = useMealieAuth();
  const userHousehold = auth.user?.householdSlug || "";
  const toolStore = useToolStore();
  const tools = toolStore.store.map((tool) => {
    const onHand = tool.householdsWithTool?.includes(userHousehold) || false;
    return { ...tool, onHand } as RecipeToolWithOnHand;
  });

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
      label: t("tool.on-hand"),
      varName: "onHand",
      type: fieldTypes.BOOLEAN,
    },
  ];

  // ============================================================
  // Create
  const [createData, setCreateData] = useState({ name: "", onHand: false } as unknown as RecipeToolCreate);
  const createForm: GroupDataForm<RecipeToolCreate> = { items: formItems, data: createData };

  async function handleCreate(createFormData: RecipeToolCreate) {
    // createOne expects id and slug, which are not present at the time of creation
    await toolStore.actions.createOne({
      name: createFormData.name,
      householdsWithTool: (createFormData as RecipeToolCreate & { onHand?: boolean }).onHand ? [userHousehold] : [],
    } as RecipeTool);
    setCreateData({ name: "", onHand: false } as unknown as RecipeToolCreate);
  }

  // ============================================================
  // Edit
  const [editData, setEditData] = useState({} as RecipeToolWithOnHand);
  const editForm: GroupDataForm<RecipeToolWithOnHand> = { items: formItems, data: editData };

  async function handleEdit(editFormData: RecipeToolWithOnHand) {
    // if list of households is undefined default to empty array
    let households = [...(editFormData.householdsWithTool ?? [])];

    if (editFormData.onHand && !households.includes(userHousehold)) {
      households = [...households, userHousehold];
    }
    else if (!editFormData.onHand && households.includes(userHousehold)) {
      households = households.filter(household => household !== userHousehold);
    }

    await toolStore.actions.updateOne({ ...editFormData, householdsWithTool: households, id: editFormData.id } as RecipeTool);
    setEditData({} as RecipeToolWithOnHand);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, items: RecipeToolWithOnHand[]) {
    if (event === "delete-selected") {
      const ids = items.filter(item => item.id != null).map(item => item.id);
      await toolStore.actions.deleteMany(ids);
    }
  }

  const bulkActions: BulkAction[] = [{ icon: icons.delete, text: t("general.delete"), event: "delete-selected" }];

  return (
    <div>
      <GroupDataPage<RecipeToolWithOnHand, RecipeToolCreate | RecipeToolWithOnHand>
        icon={icons.tools}
        title={t("data-pages.tools.tool-data")}
        createTitle={t("data-pages.tools.new-tool")}
        editTitle={t("data-pages.tools.edit-tool")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={tools}
        bulkActions={bulkActions}
        createForm={createForm}
        onCreateFormChange={form => setCreateData(form.data as RecipeToolCreate)}
        editForm={editForm as GroupDataForm<RecipeToolCreate | RecipeToolWithOnHand>}
        onEditFormChange={form => setEditData(form.data as RecipeToolWithOnHand)}
        onCreateOne={data => void handleCreate(data as RecipeToolCreate)}
        onEditOne={data => void handleEdit(data as RecipeToolWithOnHand)}
        onDeleteOne={id => void toolStore.actions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
        slots={{
          onHand: item => (
            <MdiIcon
              color={item.onHand ? "success" : undefined}
              path={item.onHand ? icons.check : icons.close}
            />
          ),
        }}
      />
    </div>
  );
}
