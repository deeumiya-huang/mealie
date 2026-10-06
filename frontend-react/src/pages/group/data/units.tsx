import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import { GroupDataPage, type GroupDataForm } from "@/components/Domain/Group/GroupDataPage";
import { GroupDataSeedDialog } from "@/components/Domain/Group/GroupDataSeedDialog";
import { RecipeDataAliasManagerDialog } from "@/components/Domain/Recipe/RecipeDataAliasManagerDialog";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import type { BulkAction, TableConfig, TableHeaders } from "@/components/global/CrudTable";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { fieldTypes } from "@/hooks/forms";
import { useUnitStore } from "@/hooks/store";
import { useLocales } from "@/hooks/use-locales";
import { normalizeFilter } from "@/hooks/use-utils";
import { validators } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import { I18nT } from "@/i18n/I18nT";
import type { StandardizedUnitType } from "@/lib/api/types/non-generated";
import type { CreateIngredientUnit, IngredientUnit, IngredientUnitAlias } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import type { AutoFormItems } from "@/types/auto-forms";

// Port of pages/group/data/units.vue. Middleware comes from the `group/data` parent route.
const tableConfig: TableConfig = {
  hideColumns: true,
  canExport: true,
};

interface StandardizedUnitTypeOption {
  text: string;
  value: StandardizedUnitType;
}

const emptyCreateData = (): CreateIngredientUnit => ({
  name: "",
  fraction: false,
  useAbbreviation: false,
});

export default function GroupDataUnitsPage() {
  const { t, d } = useI18n();
  const userApi = useUserApi();

  const tableHeaders: TableHeaders[] = [
    { text: t("general.id"), value: "id", show: false },
    { text: t("general.name"), value: "name", show: true, sortable: true },
    { text: t("general.plural-name"), value: "pluralName", show: true, sortable: true },
    { text: t("data-pages.units.abbreviation"), value: "abbreviation", show: true, sortable: true },
    { text: t("data-pages.units.plural-abbreviation"), value: "pluralAbbreviation", show: true, sortable: true },
    { text: t("data-pages.units.use-abbv"), value: "useAbbreviation", show: true, sortable: true },
    { text: t("data-pages.units.description"), value: "description", show: false },
    { text: t("data-pages.units.fraction"), value: "fraction", show: true, sortable: true },
    { text: t("data-pages.units.standard-quantity"), value: "standardQuantity", show: false },
    { text: t("data-pages.units.standard-unit"), value: "standardUnit", show: false },
    { text: t("general.date-added"), value: "createdAt", show: false, sortable: true },
  ];

  const { store: unitStore, actions: unitActions } = useUnitStore();

  // ============================================================
  // Form items (shared)
  const standardUnitOptions: StandardizedUnitTypeOption[] = [
    { text: t("data-pages.units.standard-unit-labels.fluid-ounce"), value: "fluid_ounce" },
    { text: t("data-pages.units.standard-unit-labels.cup"), value: "cup" },
    { text: t("data-pages.units.standard-unit-labels.ounce"), value: "ounce" },
    { text: t("data-pages.units.standard-unit-labels.pound"), value: "pound" },
    { text: t("data-pages.units.standard-unit-labels.milliliter"), value: "milliliter" },
    { text: t("data-pages.units.standard-unit-labels.liter"), value: "liter" },
    { text: t("data-pages.units.standard-unit-labels.gram"), value: "gram" },
    { text: t("data-pages.units.standard-unit-labels.kilogram"), value: "kilogram" },
  ];

  const formItems: AutoFormItems = [
    {
      cols: 8,
      label: t("general.name"),
      varName: "name",
      type: fieldTypes.TEXT,
      rules: [validators.required],
    },
    {
      cols: 4,
      label: t("data-pages.units.abbreviation"),
      varName: "abbreviation",
      type: fieldTypes.TEXT,
    },
    {
      cols: 8,
      label: t("general.plural-name"),
      varName: "pluralName",
      type: fieldTypes.TEXT,
    },
    {
      cols: 4,
      label: t("data-pages.units.plural-abbreviation"),
      varName: "pluralAbbreviation",
      type: fieldTypes.TEXT,
    },
    {
      label: t("data-pages.units.description"),
      varName: "description",
      type: fieldTypes.TEXT,
    },
    {
      section: t("data-pages.units.standardization"),
      sectionDetails: t("data-pages.units.standardization-description"),
      cols: 2,
      varName: "standardQuantity",
      type: fieldTypes.NUMBER,
      numberInputConfig: {
        min: 0,
        max: undefined,
        precision: undefined,
        controlVariant: "hidden",
      },
    },
    {
      cols: 10,
      varName: "standardUnit",
      type: fieldTypes.SELECT,
      selectReturnValue: "value",
      options: standardUnitOptions,
    },
    {
      section: t("general.settings"),
      cols: 4,
      label: t("data-pages.units.use-abbv"),
      varName: "useAbbreviation",
      type: fieldTypes.BOOLEAN,
    },
    {
      cols: 4,
      label: t("data-pages.units.fraction"),
      varName: "fraction",
      type: fieldTypes.BOOLEAN,
    },
  ];

  // ============================================================
  // Create
  const [createData, setCreateData] = useState<CreateIngredientUnit>(emptyCreateData);
  const createForm: GroupDataForm<CreateIngredientUnit> = { items: formItems, data: createData };

  async function handleCreate(createFormData: CreateIngredientUnit) {
    // createOne erroneously expects an id, which is not present at the time of creation
    await unitActions.createOne(createFormData as IngredientUnit);
    setCreateData(emptyCreateData());
  }

  // ============================================================
  // Edit
  const [editData, setEditData] = useState({} as IngredientUnit);
  const editForm: GroupDataForm<IngredientUnit> = { items: formItems, data: editData };

  async function handleEdit(editFormData: IngredientUnit) {
    await unitActions.updateOne(editFormData);
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

  const bulkActions: BulkAction[] = [{ icon: icons.delete, text: t("general.delete"), event: "delete-selected" }];

  // ============================================================
  // Alias Manager

  const [aliasManagerDialog, setAliasManagerDialog] = useState(false);
  function updateUnitAlias(newAliases: IngredientUnitAlias[]) {
    setEditData(current => ({ ...current, aliases: newAliases }));
    setAliasManagerDialog(false);
  }

  // ============================================================
  // Merge Units

  const [mergeDialog, setMergeDialog] = useState(false);
  const [fromUnit, setFromUnit] = useState<IngredientUnit | null>(null);
  const [toUnit, setToUnit] = useState<IngredientUnit | null>(null);

  const canMerge = !!(fromUnit && toUnit && fromUnit.id !== toUnit.id);

  async function mergeUnits() {
    if (!canMerge || !fromUnit || !toUnit) {
      return;
    }

    const { data } = await userApi.units.merge(fromUnit.id, toUnit.id);

    if (data) {
      void unitActions.refresh();
    }
  }

  // ============================================================
  // Seed

  const [seedDialog, setSeedDialog] = useState(false);
  const { locale: currentLocale } = useLocales();
  const [locale, setLocale] = useState(currentLocale);

  async function seedDatabase() {
    const { data } = await userApi.seeders.units({ locale });

    if (data) {
      void unitActions.refresh();
    }
  }

  return (
    <div>
      {/* Merge Dialog */}
      <BaseDialog
        open={mergeDialog}
        onOpenChange={setMergeDialog}
        bottomSheet
        icon={icons.units}
        title={t("data-pages.units.combine-unit")}
        canConfirm
        onConfirm={() => void mergeUnits()}
      >
        <CardContent>
          <I18nT
            keypath="data-pages.units.combine-unit-description"
            slots={{
              "source-unit-will-be-deleted": (
                <strong>
                  {" "}
                  {t("data-pages.recipes.source-unit-will-be-deleted")}
                  {" "}
                </strong>
              ),
            }}
          />

          <Autocomplete
            sx={{ mt: 1 }}
            value={fromUnit}
            onChange={(_event, value) => setFromUnit(value)}
            options={unitStore}
            getOptionLabel={option => option.name}
            getOptionKey={option => option.id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, { inputValue }) => options.filter(unit => normalizeFilter(unit.name, inputValue))}
            renderInput={params => <TextField {...params} variant="standard" label={t("data-pages.units.source-unit")} />}
          />
          <Autocomplete
            value={toUnit}
            onChange={(_event, value) => setToUnit(value)}
            options={unitStore}
            getOptionLabel={option => option.name}
            getOptionKey={option => option.id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, { inputValue }) => options.filter(unit => normalizeFilter(unit.name, inputValue))}
            renderInput={params => <TextField {...params} variant="standard" label={t("data-pages.units.target-unit")} />}
          />

          {canMerge && fromUnit && toUnit && (
            <Box sx={{ textAlign: "center" }}>
              {t("data-pages.units.merging-unit-into-unit", [fromUnit.name, toUnit.name])}
            </Box>
          )}
        </CardContent>
      </BaseDialog>

      {/* Alias Sub-Dialog */}
      <RecipeDataAliasManagerDialog
        open={aliasManagerDialog}
        onOpenChange={setAliasManagerDialog}
        data={editData}
        onSubmit={updateUnitAlias}
        onCancel={() => setAliasManagerDialog(false)}
      />

      {/* Seed Dialog */}
      <GroupDataSeedDialog
        open={seedDialog}
        onOpenChange={setSeedDialog}
        text={t("data-pages.units.seed-dialog-text")}
        locale={locale}
        onLocaleChange={setLocale}
        showWarning={unitStore.length > 0}
        onConfirm={() => void seedDatabase()}
      />

      <GroupDataPage<IngredientUnit, CreateIngredientUnit | IngredientUnit>
        icon={icons.units}
        title={t("general.units")}
        createTitle={t("data-pages.units.create-unit")}
        editTitle={t("data-pages.units.edit-unit")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={unitStore || []}
        bulkActions={bulkActions}
        createForm={createForm}
        onCreateFormChange={form => setCreateData(form.data as CreateIngredientUnit)}
        editForm={editForm}
        onEditFormChange={form => setEditData(form.data as IngredientUnit)}
        onCreateOne={data => void handleCreate(data as CreateIngredientUnit)}
        onEditOne={data => void handleEdit(data as IngredientUnit)}
        onDeleteOne={id => void unitActions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
        slots={{
          useAbbreviation: item => (
            <MdiIcon
              color={item.useAbbreviation ? "success" : undefined}
              path={item.useAbbreviation ? icons.check : icons.close}
            />
          ),
          fraction: item => (
            <MdiIcon
              color={item.fraction ? "success" : undefined}
              path={item.fraction ? icons.check : icons.close}
            />
          ),
          createdAt: item => (item.createdAt ? d(new Date(item.createdAt)) : ""),
        }}
        tableButtonRow={(
          <BaseButton icon={icons.externalLink} onClick={() => setMergeDialog(true)}>
            {t("data-pages.combine")}
          </BaseButton>
        )}
        tableButtonBottom={(
          <BaseButton icon={icons.database} onClick={() => setSeedDialog(true)}>
            {t("data-pages.seed")}
          </BaseButton>
        )}
        editDialogCustomAction={(
          <BaseButton icon={icons.tags} color="info" onClick={() => setAliasManagerDialog(true)}>
            {t("data-pages.manage-aliases")}
          </BaseButton>
        )}
      />
    </div>
  );
}
