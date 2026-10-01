import { useEffect, useMemo, useState } from "react";
import type { TableConfig, TableHeaders } from "~/components/global/CrudTable";
import { Icon } from "~/components/global/Icon";
import { GroupDataPage } from "~/components/Domain/Group/GroupDataPage";
import { fieldTypes } from "~/hooks/forms";
import { useToolStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";
import type { RecipeTool, RecipeToolCreate } from "~/lib/api/types/recipe";
import type { AutoFormItems } from "~/types/auto-forms";

interface RecipeToolWithOnHand extends RecipeTool {
  onHand: boolean;
}

type ToolCreateForm = RecipeToolCreate & { onHand: boolean };

const tableConfig: TableConfig = { hideColumns: true, canExport: true };

export default function GroupDataToolsPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const toolStore = useToolStore();
  const userHousehold = auth.user?.householdSlug || "";

  const [tableHeaders] = useState<TableHeaders[]>(() => [
    { text: i18n.t("general.id"), value: "id", show: false },
    { text: i18n.t("general.name"), value: "name", show: true, sortable: true },
    { text: i18n.t("tool.on-hand"), value: "onHand", show: true, sortable: true },
  ]);

  const tools = useMemo(() => toolStore.store.map((tool) => {
    const onHand = tool.householdsWithTool?.includes(userHousehold) || false;
    return { ...tool, onHand } as RecipeToolWithOnHand;
  }), [toolStore.store, userHousehold]);

  useEffect(() => {
    void toolStore.actions.refresh();
  }, [toolStore.actions]);

  // ============================================================
  // Form items (shared)
  const formItems: AutoFormItems = [
    { label: i18n.t("general.name"), varName: "name", type: fieldTypes.TEXT, rules: [validators.required] },
    { label: i18n.t("tool.on-hand"), varName: "onHand", type: fieldTypes.BOOLEAN },
  ];

  // ============================================================
  // Create
  const [createData, setCreateData] = useState({ name: "", onHand: false } as ToolCreateForm);
  async function handleCreate(data: ToolCreateForm) {
    // createOne expects id and slug, which are not present at creation time
    await toolStore.actions.createOne({ name: data.name, householdsWithTool: data.onHand ? [userHousehold] : [] } as RecipeToolCreate as RecipeTool);
    setCreateData({ name: "", onHand: false } as ToolCreateForm);
  }

  // ============================================================
  // Edit
  const [editData, setEditData] = useState({} as RecipeToolWithOnHand);
  async function handleEdit(data: RecipeToolWithOnHand) {
    // if list of households is undefined default to empty array
    let households = data.householdsWithTool ?? [];
    if (data.onHand && !households.includes(userHousehold)) {
      households = [...households, userHousehold];
    }
    else if (!data.onHand && households.includes(userHousehold)) {
      households = households.filter(h => h !== userHousehold);
    }
    await toolStore.actions.updateOne({ ...data, householdsWithTool: households } as RecipeTool);
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

  return (
    <div>
      <GroupDataPage<RecipeToolWithOnHand, ToolCreateForm, RecipeToolWithOnHand>
        icon={icons.tools}
        title={i18n.t("data-pages.tools.tool-data")}
        createTitle={i18n.t("data-pages.tools.new-tool")}
        editTitle={i18n.t("data-pages.tools.edit-tool")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={tools}
        bulkActions={[{ icon: icons.delete, text: i18n.t("general.delete"), event: "delete-selected" }]}
        createForm={{ items: formItems, data: createData }}
        onCreateFormChange={setCreateData}
        editForm={{ items: formItems, data: editData }}
        onEditFormChange={setEditData}
        onCreateOne={data => void handleCreate(data)}
        onEditOne={data => void handleEdit(data)}
        onDeleteOne={id => void toolStore.actions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
        cells={{
          onHand: item => <Icon path={item.onHand ? icons.check : icons.close} color={item.onHand ? "success" : undefined} />,
        }}
      />
    </div>
  );
}
