import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import { Link } from "react-router";
import { GroupDataPage, type GroupDataForm } from "@/components/Domain/Group/GroupDataPage";
import { GroupDataSeedDialog } from "@/components/Domain/Group/GroupDataSeedDialog";
import { RecipeDataAliasManagerDialog } from "@/components/Domain/Recipe/RecipeDataAliasManagerDialog";
import {
  RecipeDataSubstitutionManagerDialog,
  type ReverseSubstitutionChanges,
} from "@/components/Domain/Recipe/RecipeDataSubstitutionManagerDialog";
import { MultiPurposeLabel } from "@/components/Domain/ShoppingList/MultiPurposeLabel";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import type { BulkAction, TableConfig, TableHeaders } from "@/components/global/CrudTable";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { fieldTypes } from "@/hooks/forms";
import { useFoodStore, useLabelStore } from "@/hooks/store";
import { useLocales } from "@/hooks/use-locales";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { normalizeFilter } from "@/hooks/use-utils";
import { validators } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import type {
  CreateIngredientFood,
  IngredientFood,
  IngredientFoodAlias,
  IngredientFoodSubstitution,
} from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import type { AutoFormItems } from "@/types/auto-forms";

// Port of pages/group/data/foods.vue. Middleware comes from the `group/data` parent route.
interface CreateIngredientFoodWithOnHand extends CreateIngredientFood {
  onHand: boolean;
  householdsWithIngredientFood: string[];
}

interface IngredientFoodWithOnHand extends IngredientFood {
  onHand: boolean;
}

const tableConfig: TableConfig = {
  hideColumns: true,
  canExport: true,
};

/**
 * `BaseDataTable` sorts and searches a column by `String(item[key])`, and Vuetify's per-header `sort` comparators
 * (label name, substitution count) have no counterpart there (GAP-2). The label and substitutions values therefore
 * carry a non-enumerable `toString` that yields the sort key (label name / zero-padded count), so the table orders
 * them like the Vue comparators; JSON (the table export, API payloads) is unaffected.
 */
function withSortKeys(food: IngredientFoodWithOnHand): IngredientFoodWithOnHand {
  const result = { ...food };
  if (food.label) {
    const labelName = food.label.name || "";
    result.label = Object.defineProperty({ ...food.label }, "toString", { value: () => labelName, enumerable: false });
  }
  if (food.substitutions) {
    const count = String(food.substitutions.length).padStart(8, "0");
    result.substitutions = Object.defineProperty([...food.substitutions], "toString", { value: () => count, enumerable: false });
  }
  return result;
}

interface AffectedRecipe {
  name: string;
  slug: string;
  url: string;
}

export default function GroupDataFoodsPage() {
  const { t, d } = useI18n();
  const userApi = useUserApi();
  const auth = useMealieAuth();

  const tableHeaders: TableHeaders[] = [
    { text: t("general.id"), value: "id", show: false },
    { text: t("general.name"), value: "name", show: true, sortable: true },
    { text: t("general.plural-name"), value: "pluralName", show: true, sortable: true },
    { text: t("recipe.description"), value: "description", show: true },
    { text: t("shopping-list.label"), value: "label", show: true, sortable: true },
    { text: t("tool.on-hand"), value: "onHand", show: true, sortable: true },
    { text: t("data-pages.foods.substitutions"), value: "substitutions", show: true, sortable: true },
    { text: t("general.date-added"), value: "createdAt", show: false, sortable: true },
  ];

  const userHousehold = auth.user?.householdSlug || "";
  const userGroup = auth.user?.groupSlug || "";
  const foodStore = useFoodStore();
  const foods = foodStore.store.map((food) => {
    const onHand = food.householdsWithIngredientFood?.includes(userHousehold) || false;
    return withSortKeys({ ...food, onHand } as IngredientFoodWithOnHand);
  });

  const refreshFoods = foodStore.actions.refresh;
  useEffect(() => {
    void refreshFoods();
  }, [refreshFoods]);

  // ============================================================
  // Labels
  const labelStore = useLabelStore();
  const allLabels = labelStore.store;
  const labelOptions = allLabels.map(label => ({ text: label.name, value: label.id }));

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
      label: t("general.plural-name"),
      varName: "pluralName",
      type: fieldTypes.TEXT,
    },
    {
      label: t("recipe.description"),
      varName: "description",
      type: fieldTypes.TEXT,
    },
    {
      label: t("data-pages.foods.food-label"),
      varName: "labelId",
      type: fieldTypes.SELECT,
      options: labelOptions,
      selectReturnValue: "value",
    },
    {
      label: t("tool.on-hand"),
      varName: "onHand",
      type: fieldTypes.BOOLEAN,
      hint: t("data-pages.foods.on-hand-checkbox-label"),
    },
  ];

  // ===============================================================
  // Create
  const emptyCreateData = (): CreateIngredientFoodWithOnHand => ({ name: "", onHand: false, householdsWithIngredientFood: [] });
  const [createData, setCreateData] = useState<CreateIngredientFoodWithOnHand>(emptyCreateData);
  const createForm: GroupDataForm<CreateIngredientFoodWithOnHand> = { items: formItems, data: createData };

  async function handleCreate(createFormData: CreateIngredientFoodWithOnHand) {
    if (!createFormData || !createFormData.name) {
      return;
    }

    const payload = createFormData.onHand
      ? { ...createFormData, householdsWithIngredientFood: [userHousehold] }
      : createFormData;

    // createOne erroneously expects an id because it uses the IngredientFood type
    await foodStore.actions.createOne(payload as unknown as IngredientFood);
    setCreateData(emptyCreateData());
  }

  // ===============================================================
  // Edit
  const [editData, setEditData] = useState({} as IngredientFoodWithOnHand);
  const editForm: GroupDataForm<IngredientFoodWithOnHand> = { items: formItems, data: editData };

  async function handleEdit(editFormData: IngredientFoodWithOnHand) {
    if (!editFormData) {
      return;
    }

    let households = [...(editFormData.householdsWithIngredientFood ?? [])];
    const foodId = editFormData.id;

    if (editFormData.onHand && !households.includes(userHousehold)) {
      households = [...households, userHousehold];
    }
    else if (!editFormData.onHand && households.includes(userHousehold)) {
      households = households.filter(household => household !== userHousehold);
    }

    await foodStore.actions.updateOne({ ...editFormData, householdsWithIngredientFood: households });
    setEditData({} as IngredientFoodWithOnHand);
    await applyReverseSubstitutions(foodId);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, items: IngredientFoodWithOnHand[]) {
    if (event === "delete-selected") {
      const ids = items.map(item => item.id);
      await foodStore.actions.deleteMany(ids);
      setAffectedRecipes([]);
      setAffectedRecipesTotal(0);
      setAffectedRecipesMoreLink("");
    }
    else if (event === "assign-selected") {
      bulkAssignEventHandler(items);
    }
  }

  const bulkActions: BulkAction[] = [
    { icon: icons.delete, text: t("general.delete"), event: "delete-selected" },
    { icon: icons.tags, text: t("data-pages.labels.assign-label"), event: "assign-selected" },
  ];

  // ============================================================
  // Alias Manager

  const [aliasManagerDialog, setAliasManagerDialog] = useState(false);
  function updateFoodAlias(newAliases: IngredientFoodAlias[]) {
    setEditData(current => ({ ...current, aliases: newAliases }));
    setAliasManagerDialog(false);
  }

  // ============================================================
  // Substitution Manager

  const [substitutionManagerDialog, setSubstitutionManagerDialog] = useState(false);

  // reverse substitutions live on other foods, so they can't ride along with the food being edited.
  // they're held until the edit is confirmed, and tagged with the food they were built for so
  // a cancelled edit can't leak them onto the next food the user opens
  const [pendingReverseSubstitutions, setPendingReverseSubstitutions] = useState<({ foodId: string } & ReverseSubstitutionChanges) | null>(null);

  function updateFoodSubstitutions(
    newSubstitutions: IngredientFoodSubstitution[],
    reverseChanges: ReverseSubstitutionChanges,
  ) {
    setEditData(current => ({ ...current, substitutions: newSubstitutions }));
    setPendingReverseSubstitutions(reverseChanges.add.length || reverseChanges.remove.length
      ? { foodId: editData.id, ...reverseChanges }
      : null);
    setSubstitutionManagerDialog(false);
  }

  async function applyReverseSubstitutions(foodId: string) {
    const pending = pendingReverseSubstitutions;
    setPendingReverseSubstitutions(null);
    if (!pending || !foodId || pending.foodId !== foodId) {
      return;
    }

    // the store was just refreshed by the edit, so read the foods as they are now
    const currentFoods = await foodStore.actions.getAll();

    let updated = false;
    for (const reverseFoodId of [...pending.add, ...pending.remove]) {
      const reverseFood = currentFoods.find(food => food.id === reverseFoodId);
      if (!reverseFood) {
        continue;
      }

      // rebuilt from what's on the other food right now, so a stale dialog can't resurrect
      // a row someone else removed in the meantime
      const others = (reverseFood.substitutions || []).filter(sub => sub.substituteFoodId !== foodId);
      const substitutions = pending.add.includes(reverseFoodId)
        ? [...others, { substituteFoodId: foodId }]
        : others;

      if (substitutions.length === (reverseFood.substitutions || []).length) {
        continue;
      }

      const payload = { ...reverseFood, substitutions };
      await userApi.foods.updateOne(reverseFoodId, payload);
      updated = true;
    }

    if (updated) {
      await foodStore.actions.refresh();
    }
  }

  // ============================================================
  // Delete Foods

  // fetch affected recipes before confirming deletion
  const [affectedRecipes, setAffectedRecipes] = useState<AffectedRecipe[]>([]);
  const [affectedRecipesTotal, setAffectedRecipesTotal] = useState(0);
  const [affectedRecipesMoreLink, setAffectedRecipesMoreLink] = useState("");

  async function onDeleteDialogOpen(items: IngredientFoodWithOnHand[]) {
    const ids = items.map(item => item.id);
    const { data } = await userApi.recipes.search({ foods: ids, perPage: 5 });
    setAffectedRecipes((data?.items ?? []).map(recipe => ({
      name: recipe.name ?? "",
      slug: recipe.slug ?? "",
      url: `/g/${userGroup}/r/${recipe.slug}`,
    })));
    setAffectedRecipesTotal(data?.total ?? 0);
    setAffectedRecipesMoreLink(`/g/${userGroup}?${ids.map(id => `foods=${id}`).join("&")}`);
  }

  // ============================================================
  // Merge Foods

  const [mergeDialog, setMergeDialog] = useState(false);
  const [fromFood, setFromFood] = useState<IngredientFoodWithOnHand | null>(null);
  const [toFood, setToFood] = useState<IngredientFoodWithOnHand | null>(null);

  const canMerge = !!(fromFood && toFood && fromFood.id !== toFood.id);

  async function mergeFoods() {
    if (!canMerge || !fromFood || !toFood) {
      return;
    }

    const { data } = await userApi.foods.merge(fromFood.id, toFood.id);

    if (data) {
      void foodStore.actions.refresh();
    }
  }

  // ============================================================
  // Seed

  const [seedDialog, setSeedDialog] = useState(false);
  const { locale: currentLocale } = useLocales();
  const [locale, setLocale] = useState(currentLocale);

  async function seedDatabase() {
    const { data } = await userApi.seeders.foods({ locale });

    if (data) {
      // seeding foods also creates the labels that group them
      void foodStore.actions.refresh();
      void labelStore.actions.refresh();
    }
  }

  // ============================================================
  // Bulk Assign Labels
  const [bulkAssignLabelDialog, setBulkAssignLabelDialog] = useState(false);
  const [bulkAssignTarget, setBulkAssignTarget] = useState<IngredientFoodWithOnHand[]>([]);
  const [bulkAssignLabelId, setBulkAssignLabelId] = useState<string | undefined>();

  function bulkAssignEventHandler(selection: IngredientFoodWithOnHand[]) {
    setBulkAssignTarget(selection);
    setBulkAssignLabelDialog(true);
  }

  async function assignSelected() {
    if (!bulkAssignLabelId) {
      return;
    }
    for (const item of bulkAssignTarget) {
      await foodStore.actions.updateOne({ ...item, labelId: bulkAssignLabelId });
    }
    setBulkAssignTarget([]);
    setBulkAssignLabelId(undefined);
    void foodStore.actions.refresh();
  }

  return (
    <div>
      {/* Merge Dialog */}
      <BaseDialog
        open={mergeDialog}
        onOpenChange={setMergeDialog}
        bottomSheet
        icon={icons.foods}
        title={t("data-pages.foods.combine-food")}
        canConfirm
        onConfirm={() => void mergeFoods()}
      >
        <CardContent>
          <div>
            {t("data-pages.foods.merge-dialog-text")}
          </div>
          <Autocomplete
            value={fromFood}
            onChange={(_event, value) => setFromFood(value)}
            options={foods}
            getOptionLabel={option => option.name}
            getOptionKey={option => option.id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, { inputValue }) => options.filter(food => normalizeFilter(food.name, inputValue))}
            renderInput={params => <TextField {...params} variant="standard" label={t("data-pages.foods.source-food")} />}
          />
          <Autocomplete
            value={toFood}
            onChange={(_event, value) => setToFood(value)}
            options={foods}
            getOptionLabel={option => option.name}
            getOptionKey={option => option.id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, { inputValue }) => options.filter(food => normalizeFilter(food.name, inputValue))}
            renderInput={params => <TextField {...params} variant="standard" label={t("data-pages.foods.target-food")} />}
          />

          {canMerge && fromFood && toFood && (
            <Box sx={{ textAlign: "center" }}>
              {t("data-pages.foods.merge-food-example", { food1: fromFood.name, food2: toFood.name })}
            </Box>
          )}
        </CardContent>
      </BaseDialog>

      {/* Seed Dialog */}
      <GroupDataSeedDialog
        open={seedDialog}
        onOpenChange={setSeedDialog}
        text={t("data-pages.foods.seed-dialog-text")}
        locale={locale}
        onLocaleChange={setLocale}
        showWarning={foods.length > 0}
        normalizeSearch
        onConfirm={() => void seedDatabase()}
      />

      {/* Alias Sub-Dialog */}
      <RecipeDataAliasManagerDialog
        open={aliasManagerDialog}
        onOpenChange={setAliasManagerDialog}
        data={editData}
        onSubmit={updateFoodAlias}
        onCancel={() => setAliasManagerDialog(false)}
      />

      {/* Substitution Sub-Dialog */}
      <RecipeDataSubstitutionManagerDialog
        open={substitutionManagerDialog}
        onOpenChange={setSubstitutionManagerDialog}
        data={editData}
        onSubmit={updateFoodSubstitutions}
        onCancel={() => setSubstitutionManagerDialog(false)}
      />

      {/* Bulk Assign Labels Dialog */}
      <BaseDialog
        open={bulkAssignLabelDialog}
        onOpenChange={setBulkAssignLabelDialog}
        bottomSheet
        title={t("data-pages.labels.assign-label")}
        icon={icons.tags}
        canConfirm
        onConfirm={() => void assignSelected()}
      >
        <CardContent>
          <Card sx={{ mb: 2 }}>
            <CardHeader title={t("general.caution")} />
            <CardContent>{t("data-pages.foods.label-overwrite-warning")}</CardContent>
          </Card>

          <Autocomplete
            value={allLabels.find(label => label.id === bulkAssignLabelId) ?? null}
            onChange={(_event, value) => setBulkAssignLabelId(value?.id)}
            options={allLabels}
            getOptionLabel={option => option.name}
            getOptionKey={option => option.id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, { inputValue }) => options.filter(label => normalizeFilter(label.name, inputValue))}
            renderInput={params => <TextField {...params} variant="standard" label={t("data-pages.foods.food-label")} />}
          />
          <Card variant="outlined">
            <List dense disablePadding sx={{ height: 400, overflowY: "auto" }}>
              {bulkAssignTarget.map(item => (
                <ListItem key={item.id} sx={{ pb: 1 }}>
                  <ListItemText primary={item.name} />
                </ListItem>
              ))}
            </List>
          </Card>
        </CardContent>
      </BaseDialog>

      <GroupDataPage<IngredientFoodWithOnHand, CreateIngredientFoodWithOnHand | IngredientFoodWithOnHand>
        icon={icons.foods}
        title={t("data-pages.foods.food-data")}
        createTitle={t("data-pages.foods.create-food")}
        editTitle={t("data-pages.foods.edit-food")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={foods}
        bulkActions={bulkActions}
        createForm={createForm}
        onCreateFormChange={form => setCreateData(form.data as CreateIngredientFoodWithOnHand)}
        editForm={editForm}
        onEditFormChange={form => setEditData(form.data as IngredientFoodWithOnHand)}
        onDeleteDialogOpen={onDeleteDialogOpen}
        onCreateOne={data => void handleCreate(data as CreateIngredientFoodWithOnHand)}
        onEditOne={data => void handleEdit(data as IngredientFoodWithOnHand)}
        onDeleteOne={id => void foodStore.actions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
        slots={{
          label: item => (item.label ? <MultiPurposeLabel label={item.label} /> : null),
          onHand: item => (
            <MdiIcon
              color={item.onHand ? "success" : undefined}
              path={item.onHand ? icons.check : icons.close}
            />
          ),
          substitutions: item => (item.substitutions ? item.substitutions.length : 0),
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
          <>
            <BaseButton edit onClick={() => setAliasManagerDialog(true)}>
              {t("data-pages.manage-aliases")}
            </BaseButton>
            <BaseButton edit onClick={() => setSubstitutionManagerDialog(true)}>
              {t("data-pages.foods.manage-substitutions")}
            </BaseButton>
          </>
        )}
        deleteDialogBottom={affectedRecipes.length > 0
          ? (
              <Alert severity="warning" variant="filled" sx={{ mt: 2, mb: 0, py: 0 }}>
                {t("data-pages.foods.delete-affects-recipes", { count: affectedRecipesTotal })}
                <Box component="ul" sx={{ mt: 0.5, pl: 2.5, mb: 0 }}>
                  {affectedRecipes.slice(0, 5).map(recipe => (
                    <li key={recipe.slug}>
                      <Link to={recipe.url} style={{ color: "#fff" }}>{recipe.name}</Link>
                    </li>
                  ))}
                </Box>
                {affectedRecipesTotal > 5 && (
                  <Link to={affectedRecipesMoreLink} style={{ color: "#fff", display: "inline-block", marginTop: 4 }}>
                    {t("data-pages.foods.delete-affects-recipes-more", { count: affectedRecipesTotal })}
                  </Link>
                )}
              </Alert>
            )
          : null}
      />
    </div>
  );
}
