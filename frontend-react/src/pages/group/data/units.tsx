import { useState } from "react";
import { BaseButton } from "~/components/global/BaseButton";
import type { TableConfig, TableHeaders } from "~/components/global/CrudTable";
import { I18nT } from "~/components/global/I18nT";
import { Icon } from "~/components/global/Icon";
import { GroupDataMergeDialog, GroupDataSeedDialog } from "~/components/Domain/Group/GroupDataDialogs";
import { GroupDataPage } from "~/components/Domain/Group/GroupDataPage";
import { RecipeDataAliasManagerDialog } from "~/components/Domain/Recipe/RecipeDataAliasManagerDialog";
import { useUserApi } from "~/hooks/api";
import { fieldTypes } from "~/hooks/forms";
import { useUnitStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";
import type { StandardizedUnitType } from "~/lib/api/types/non-generated";
import type { CreateIngredientUnit, IngredientUnit } from "~/lib/api/types/recipe";
import type { AutoFormItems } from "~/types/auto-forms";

const tableConfig: TableConfig = { hideColumns: true, canExport: true };

type StandardizedUnitTypeOption = { text: string; value: StandardizedUnitType };

const emptyCreate = () => ({ name: "", fraction: false, useAbbreviation: false }) as CreateIngredientUnit;

const checkIcon = (value: boolean | undefined) => <Icon path={value ? icons.check : icons.close} color={value ? "success" : undefined} />;

export default function GroupDataUnitsPage() {
  const userApi = useUserApi();
  const i18n = useI18n();
  const { store: unitStore, actions: unitActions } = useUnitStore();

  const [tableHeaders] = useState<TableHeaders[]>(() => [
    { text: i18n.t("general.id"), value: "id", show: false },
    { text: i18n.t("general.name"), value: "name", show: true, sortable: true },
    { text: i18n.t("general.plural-name"), value: "pluralName", show: true, sortable: true },
    { text: i18n.t("data-pages.units.abbreviation"), value: "abbreviation", show: true, sortable: true },
    { text: i18n.t("data-pages.units.plural-abbreviation"), value: "pluralAbbreviation", show: true, sortable: true },
    { text: i18n.t("data-pages.units.use-abbv"), value: "useAbbreviation", show: true, sortable: true },
    { text: i18n.t("data-pages.units.description"), value: "description", show: false },
    { text: i18n.t("data-pages.units.fraction"), value: "fraction", show: true, sortable: true },
    { text: i18n.t("data-pages.units.standard-quantity"), value: "standardQuantity", show: false },
    { text: i18n.t("data-pages.units.standard-unit"), value: "standardUnit", show: false },
    { text: i18n.t("general.date-added"), value: "createdAt", show: false, sortable: true },
  ]);

  // ============================================================
  // Form items (shared)
  const standardUnitOptions: StandardizedUnitTypeOption[] = [
    { text: i18n.t("data-pages.units.standard-unit-labels.fluid-ounce"), value: "fluid_ounce" },
    { text: i18n.t("data-pages.units.standard-unit-labels.cup"), value: "cup" },
    { text: i18n.t("data-pages.units.standard-unit-labels.ounce"), value: "ounce" },
    { text: i18n.t("data-pages.units.standard-unit-labels.pound"), value: "pound" },
    { text: i18n.t("data-pages.units.standard-unit-labels.milliliter"), value: "milliliter" },
    { text: i18n.t("data-pages.units.standard-unit-labels.liter"), value: "liter" },
    { text: i18n.t("data-pages.units.standard-unit-labels.gram"), value: "gram" },
    { text: i18n.t("data-pages.units.standard-unit-labels.kilogram"), value: "kilogram" },
  ];
  const formItems: AutoFormItems = [
    { cols: 8, label: i18n.t("general.name"), varName: "name", type: fieldTypes.TEXT, rules: [validators.required] },
    { cols: 4, label: i18n.t("data-pages.units.abbreviation"), varName: "abbreviation", type: fieldTypes.TEXT },
    { cols: 8, label: i18n.t("general.plural-name"), varName: "pluralName", type: fieldTypes.TEXT },
    { cols: 4, label: i18n.t("data-pages.units.plural-abbreviation"), varName: "pluralAbbreviation", type: fieldTypes.TEXT },
    { label: i18n.t("data-pages.units.description"), varName: "description", type: fieldTypes.TEXT },
    {
      section: i18n.t("data-pages.units.standardization"),
      sectionDetails: i18n.t("data-pages.units.standardization-description"),
      cols: 2,
      varName: "standardQuantity",
      type: fieldTypes.NUMBER,
      numberInputConfig: { min: 0, max: undefined, controlVariant: "hidden" },
    },
    { cols: 10, varName: "standardUnit", type: fieldTypes.SELECT, selectReturnValue: "value", options: standardUnitOptions },
    { section: i18n.t("general.settings"), cols: 4, label: i18n.t("data-pages.units.use-abbv"), varName: "useAbbreviation", type: fieldTypes.BOOLEAN },
    { cols: 4, label: i18n.t("data-pages.units.fraction"), varName: "fraction", type: fieldTypes.BOOLEAN },
  ];

  // ============================================================
  // Create
  const [createData, setCreateData] = useState(emptyCreate);
  async function handleCreate(data: CreateIngredientUnit) {
    // createOne expects an id, which is not present at creation time
    await unitActions.createOne(data as IngredientUnit);
    setCreateData(emptyCreate());
  }

  // ============================================================
  // Edit
  const [editData, setEditData] = useState({} as IngredientUnit);
  async function handleEdit(data: IngredientUnit) {
    await unitActions.updateOne(data);
    setEditData({} as IngredientUnit);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, items: IngredientUnit[]) {
    if (event === "delete-selected") {
      const ids = items.filter(item => item.id != null).map(item => item.id);
      await unitActions.deleteMany(ids);
    }
  }

  // ============================================================
  // Alias Manager, Merge, Seed
  const [aliasManagerDialog, setAliasManagerDialog] = useState(false);
  const [mergeDialog, setMergeDialog] = useState(false);
  const [seedDialog, setSeedDialog] = useState(false);

  async function mergeUnits(from: IngredientUnit, to: IngredientUnit) {
    const { data } = await userApi.units.merge(from.id, to.id);
    if (data) {
      void unitActions.refresh();
    }
    return !!data;
  }

  async function seedDatabase(locale: string) {
    const { data } = await userApi.seeders.units({ locale });
    if (data) {
      void unitActions.refresh();
    }
  }

  return (
    <div>
      <GroupDataMergeDialog<IngredientUnit>
        open={mergeDialog}
        onOpenChange={setMergeDialog}
        icon={icons.units}
        title={i18n.t("data-pages.units.combine-unit")}
        description={(
          <I18nT
            keypath="data-pages.units.combine-unit-description"
            slots={{ "source-unit-will-be-deleted": <strong>{i18n.t("data-pages.recipes.source-unit-will-be-deleted")}</strong> }}
          />
        )}
        sourceLabel={i18n.t("data-pages.units.source-unit")}
        targetLabel={i18n.t("data-pages.units.target-unit")}
        items={unitStore}
        example={(from, to) => i18n.t("data-pages.units.merging-unit-into-unit", [from.name, to.name])}
        onMerge={mergeUnits}
      />

      {/* Alias Sub-Dialog */}
      <RecipeDataAliasManagerDialog
        open={aliasManagerDialog}
        onOpenChange={setAliasManagerDialog}
        data={editData}
        onSubmit={(aliases) => {
          setEditData(prev => ({ ...prev, aliases }));
          setAliasManagerDialog(false);
        }}
        onCancel={() => setAliasManagerDialog(false)}
      />

      <GroupDataSeedDialog
        open={seedDialog}
        onOpenChange={setSeedDialog}
        icon={icons.foods}
        text={i18n.t("data-pages.units.seed-dialog-text")}
        hasData={unitStore.length > 0}
        onSeed={locale => void seedDatabase(locale)}
      />

      <GroupDataPage<IngredientUnit, CreateIngredientUnit, IngredientUnit>
        icon={icons.units}
        title={i18n.t("general.units")}
        createTitle={i18n.t("data-pages.units.create-unit")}
        editTitle={i18n.t("data-pages.units.edit-unit")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={unitStore || []}
        bulkActions={[{ icon: icons.delete, text: i18n.t("general.delete"), event: "delete-selected" }]}
        createForm={{ items: formItems, data: createData }}
        onCreateFormChange={setCreateData}
        editForm={{ items: formItems, data: editData }}
        onEditFormChange={setEditData}
        onCreateOne={data => void handleCreate(data)}
        onEditOne={data => void handleEdit(data)}
        onDeleteOne={id => void unitActions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
        cells={{
          useAbbreviation: item => checkIcon(item.useAbbreviation),
          fraction: item => checkIcon(item.fraction),
          createdAt: item => (item.createdAt ? i18n.d(new Date(item.createdAt)) : ""),
        }}
        tableButtonRow={(
          <BaseButton icon={icons.externalLink} onClick={() => setMergeDialog(true)}>
            {i18n.t("data-pages.combine")}
          </BaseButton>
        )}
        tableButtonBottom={(
          <BaseButton icon={icons.database} onClick={() => setSeedDialog(true)}>
            {i18n.t("data-pages.seed")}
          </BaseButton>
        )}
        editDialogCustomAction={(
          <BaseButton icon={icons.tags} color="info" onClick={() => setAliasManagerDialog(true)}>
            {i18n.t("data-pages.manage-aliases")}
          </BaseButton>
        )}
      />
    </div>
  );
}
