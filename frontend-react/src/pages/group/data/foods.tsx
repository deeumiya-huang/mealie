import { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseDialog } from "~/components/global/BaseDialog";
import type { TableConfig, TableHeaders } from "~/components/global/CrudTable";
import { Icon } from "~/components/global/Icon";
import { AutocompleteInput } from "~/components/global/form";
import { GroupDataMergeDialog, GroupDataSeedDialog } from "~/components/Domain/Group/GroupDataDialogs";
import { GroupDataPage } from "~/components/Domain/Group/GroupDataPage";
import { RecipeDataAliasManagerDialog } from "~/components/Domain/Recipe/RecipeDataAliasManagerDialog";
import { RecipeDataSubstitutionManagerDialog } from "~/components/Domain/Recipe/RecipeDataSubstitutionManagerDialog";
import type { ReverseSubstitutionChanges } from "~/components/Domain/Recipe/RecipeDataSubstitutionManagerDialog";
import { MultiPurposeLabel } from "~/components/Domain/ShoppingList/MultiPurposeLabel";
import { useUserApi } from "~/hooks/api";
import { fieldTypes } from "~/hooks/forms";
import { useFoodStore, useLabelStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { normalizeFilter } from "~/hooks/use-utils";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";
import type { MultiPurposeLabelOut } from "~/lib/api/types/labels";
import type { CreateIngredientFood, IngredientFood, IngredientFoodSubstitution } from "~/lib/api/types/recipe";
import type { AutoFormItems } from "~/types/auto-forms";

interface CreateIngredientFoodWithOnHand extends CreateIngredientFood {
  onHand: boolean;
  householdsWithIngredientFood: string[];
}

interface IngredientFoodWithOnHand extends IngredientFood {
  onHand: boolean;
}

const tableConfig: TableConfig = { hideColumns: true, canExport: true };

const emptyCreate = (): CreateIngredientFoodWithOnHand => ({ name: "", onHand: false, householdsWithIngredientFood: [] });

export default function GroupDataFoodsPage() {
  const userApi = useUserApi();
  const i18n = useI18n();
  const auth = useMealieAuth();
  const userHousehold = auth.user?.householdSlug || "";
  const userGroup = auth.user?.groupSlug || "";

  const [tableHeaders] = useState<TableHeaders[]>(() => [
    { text: i18n.t("general.id"), value: "id", show: false },
    { text: i18n.t("general.name"), value: "name", show: true, sortable: true },
    { text: i18n.t("general.plural-name"), value: "pluralName", show: true, sortable: true },
    { text: i18n.t("recipe.description"), value: "description", show: true },
    {
      text: i18n.t("shopping-list.label"),
      value: "label",
      show: true,
      sortable: true,
      sort: (label1, label2) => {
        const label1Name = (label1 as MultiPurposeLabelOut | null)?.name || "";
        const label2Name = (label2 as MultiPurposeLabelOut | null)?.name || "";
        return label1Name.localeCompare(label2Name);
      },
    },
    { text: i18n.t("tool.on-hand"), value: "onHand", show: true, sortable: true },
    {
      text: i18n.t("data-pages.foods.substitutions"),
      value: "substitutions",
      show: true,
      sortable: true,
      sort: (subs1, subs2) => ((subs1 as IngredientFoodSubstitution[] | null)?.length || 0) - ((subs2 as IngredientFoodSubstitution[] | null)?.length || 0),
    },
    { text: i18n.t("general.date-added"), value: "createdAt", show: false, sortable: true },
  ]);

  const foodStore = useFoodStore();
  const foods = useMemo(() => foodStore.store.map((food) => {
    const onHand = food.householdsWithIngredientFood?.includes(userHousehold) || false;
    return { ...food, onHand } as IngredientFoodWithOnHand;
  }), [foodStore.store, userHousehold]);

  useEffect(() => {
    void foodStore.actions.refresh();
  }, [foodStore.actions]);

  // ============================================================
  // Labels
  const labelStore = useLabelStore();
  const allLabels = labelStore.store;
  const labelOptions = allLabels.map(label => ({ text: label.name, value: label.id }));

  // ============================================================
  // Form items (shared)
  const formItems: AutoFormItems = [
    { label: i18n.t("general.name"), varName: "name", type: fieldTypes.TEXT, rules: [validators.required] },
    { label: i18n.t("general.plural-name"), varName: "pluralName", type: fieldTypes.TEXT },
    { label: i18n.t("recipe.description"), varName: "description", type: fieldTypes.TEXT },
    { label: i18n.t("data-pages.foods.food-label"), varName: "labelId", type: fieldTypes.SELECT, options: labelOptions, selectReturnValue: "value" },
    { label: i18n.t("tool.on-hand"), varName: "onHand", type: fieldTypes.BOOLEAN, hint: i18n.t("data-pages.foods.on-hand-checkbox-label") },
  ];

  // ===============================================================
  // Create
  const [createData, setCreateData] = useState(emptyCreate);
  async function handleCreate(data: CreateIngredientFoodWithOnHand) {
    if (!data || !data.name) {
      return;
    }
    const payload = data.onHand ? { ...data, householdsWithIngredientFood: [userHousehold] } : data;
    // createOne expects an id because it uses the IngredientFood type
    await foodStore.actions.createOne(payload as unknown as IngredientFood);
    setCreateData(emptyCreate());
  }

  // ===============================================================
  // Edit
  const [editData, setEditData] = useState({} as IngredientFoodWithOnHand);
  async function handleEdit(data: IngredientFoodWithOnHand) {
    if (!data) {
      return;
    }
    let households = data.householdsWithIngredientFood ?? [];
    if (data.onHand && !households.includes(userHousehold)) {
      households = [...households, userHousehold];
    }
    else if (!data.onHand && households.includes(userHousehold)) {
      households = households.filter(h => h !== userHousehold);
    }

    const foodId = data.id;
    await foodStore.actions.updateOne({ ...data, householdsWithIngredientFood: households });
    setEditData({} as IngredientFoodWithOnHand);
    await applyReverseSubstitutions(foodId);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, items: IngredientFoodWithOnHand[]) {
    if (event === "delete-selected") {
      const ids = items.map(item => item.id);
      await foodStore.actions.deleteMany(ids);
      setAffected({ recipes: [], total: 0, moreLink: "" });
    }
    else if (event === "assign-selected") {
      setBulkAssignTarget(items);
      setBulkAssignLabelDialog(true);
    }
  }

  // ============================================================
  // Alias / Substitution Managers
  const [aliasManagerDialog, setAliasManagerDialog] = useState(false);
  const [substitutionManagerDialog, setSubstitutionManagerDialog] = useState(false);

  // reverse substitutions live on other foods, so they can't ride along with the food being edited.
  // they're held until the edit is confirmed, and tagged with the food they were built for so
  // a cancelled edit can't leak them onto the next food the user opens
  const pendingReverseSubstitutions = useRef<({ foodId: string } & ReverseSubstitutionChanges) | null>(null);

  function updateFoodSubstitutions(newSubstitutions: IngredientFoodSubstitution[], reverseChanges: ReverseSubstitutionChanges) {
    setEditData(prev => ({ ...prev, substitutions: newSubstitutions }));
    pendingReverseSubstitutions.current = reverseChanges.add.length || reverseChanges.remove.length
      ? { foodId: editData.id, ...reverseChanges }
      : null;
    setSubstitutionManagerDialog(false);
  }

  async function applyReverseSubstitutions(foodId: string) {
    const pending = pendingReverseSubstitutions.current;
    pendingReverseSubstitutions.current = null;
    if (!pending || !foodId || pending.foodId !== foodId) {
      return;
    }

    let updated = false;
    const current = foodStore.actions.getItems();
    for (const reverseFoodId of [...pending.add, ...pending.remove]) {
      const reverseFood = current.find(food => food.id === reverseFoodId);
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

      await userApi.foods.updateOne(reverseFoodId, { ...reverseFood, substitutions });
      updated = true;
    }

    if (updated) {
      await foodStore.actions.refresh();
    }
  }

  // ============================================================
  // Delete Foods: fetch affected recipes before confirming deletion
  const [affected, setAffected] = useState<{ recipes: { name: string; slug: string; url: string }[]; total: number; moreLink: string }>(
    { recipes: [], total: 0, moreLink: "" },
  );

  async function onDeleteDialogOpen(items: IngredientFoodWithOnHand[]) {
    const ids = items.map(item => item.id);
    const { data } = await userApi.recipes.search({ foods: ids, perPage: 5 });
    setAffected({
      recipes: (data?.items ?? []).map(r => ({ name: r.name ?? "", slug: r.slug ?? "", url: `/g/${userGroup}/r/${r.slug}` })),
      total: data?.total ?? 0,
      moreLink: `/g/${userGroup}?${ids.map(id => `foods=${id}`).join("&")}`,
    });
  }

  // ============================================================
  // Merge & Seed
  const [mergeDialog, setMergeDialog] = useState(false);
  const [seedDialog, setSeedDialog] = useState(false);

  async function mergeFoods(from: IngredientFoodWithOnHand, to: IngredientFoodWithOnHand) {
    const { data } = await userApi.foods.merge(from.id, to.id);
    if (data) {
      void foodStore.actions.refresh();
    }
    return !!data;
  }

  async function seedDatabase(locale: string) {
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
      <GroupDataMergeDialog<IngredientFoodWithOnHand>
        open={mergeDialog}
        onOpenChange={setMergeDialog}
        icon={icons.foods}
        title={i18n.t("data-pages.foods.combine-food")}
        description={i18n.t("data-pages.foods.merge-dialog-text")}
        sourceLabel={i18n.t("data-pages.foods.source-food")}
        targetLabel={i18n.t("data-pages.foods.target-food")}
        items={foods}
        example={(from, to) => i18n.t("data-pages.foods.merge-food-example", { food1: from.name, food2: to.name })}
        onMerge={mergeFoods}
      />

      <GroupDataSeedDialog
        open={seedDialog}
        onOpenChange={setSeedDialog}
        icon={icons.foods}
        text={i18n.t("data-pages.foods.seed-dialog-text")}
        hasData={foods.length > 0}
        onSeed={locale => void seedDatabase(locale)}
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
        title={i18n.t("data-pages.labels.assign-label")}
        icon={icons.tags}
        canConfirm
        onConfirm={() => void assignSelected()}
      >
        <Box sx={{ px: 2, pb: 2 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">{i18n.t("general.caution")}</Typography>
              <Typography variant="body2">{i18n.t("data-pages.foods.label-overwrite-warning")}</Typography>
            </CardContent>
          </Card>
          <AutocompleteInput<MultiPurposeLabelOut>
            value={bulkAssignLabelId ?? null}
            onChange={(v: string | null) => setBulkAssignLabelId(v ?? undefined)}
            clearable
            items={allLabels}
            customFilter={(itemTitle, query) => normalizeFilter(itemTitle, query)}
            itemValue="id"
            itemTitle="name"
            label={i18n.t("data-pages.foods.food-label")}
          />
          <Paper variant="outlined" sx={{ maxHeight: 400, overflowY: "auto" }}>
            <List dense>
              {bulkAssignTarget.map(item => (
                <ListItem key={item.id} sx={{ pb: 1 }}>
                  <ListItemText primary={item.name} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      </BaseDialog>

      <GroupDataPage<IngredientFoodWithOnHand, CreateIngredientFoodWithOnHand, IngredientFoodWithOnHand>
        icon={icons.foods}
        title={i18n.t("data-pages.foods.food-data")}
        createTitle={i18n.t("data-pages.foods.create-food")}
        editTitle={i18n.t("data-pages.foods.edit-food")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={foods}
        bulkActions={[
          { icon: icons.delete, text: i18n.t("general.delete"), event: "delete-selected" },
          { icon: icons.tags, text: i18n.t("data-pages.labels.assign-label"), event: "assign-selected" },
        ]}
        createForm={{ items: formItems, data: createData }}
        onCreateFormChange={setCreateData}
        editForm={{ items: formItems, data: editData }}
        onEditFormChange={setEditData}
        onDeleteDialogOpen={onDeleteDialogOpen}
        onCreateOne={data => void handleCreate(data)}
        onEditOne={data => void handleEdit(data)}
        onDeleteOne={id => void foodStore.actions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
        cells={{
          label: item => item.label && <MultiPurposeLabel label={item.label} />,
          onHand: item => <Icon path={item.onHand ? icons.check : icons.close} color={item.onHand ? "success" : undefined} />,
          substitutions: item => (item.substitutions ? item.substitutions.length : 0),
          createdAt: item => (item.createdAt ? i18n.d(new Date(item.createdAt)) : ""),
        }}
        tableButtonRow={(
          <BaseButton iconSlot={<Icon path={icons.externalLink} />} onClick={() => setMergeDialog(true)}>
            {i18n.t("data-pages.combine")}
          </BaseButton>
        )}
        tableButtonBottom={(
          <BaseButton iconSlot={<Icon path={icons.database} />} onClick={() => setSeedDialog(true)}>
            {i18n.t("data-pages.seed")}
          </BaseButton>
        )}
        editDialogCustomAction={(
          <>
            <BaseButton edit onClick={() => setAliasManagerDialog(true)}>{i18n.t("data-pages.manage-aliases")}</BaseButton>
            <BaseButton edit onClick={() => setSubstitutionManagerDialog(true)}>{i18n.t("data-pages.foods.manage-substitutions")}</BaseButton>
          </>
        )}
        deleteDialogBottom={affected.recipes.length > 0 && (
          <Alert severity="warning" variant="filled" sx={{ "mt": 2, "mb": 0, "& a": { color: "#fff" } }}>
            {i18n.t("data-pages.foods.delete-affects-recipes", { count: affected.total })}
            <Box component="ul" sx={{ mt: 0.5, pl: 2.5, mb: 0 }}>
              {affected.recipes.slice(0, 5).map(recipe => (
                <li key={recipe.slug}><RouterLink to={recipe.url}>{recipe.name}</RouterLink></li>
              ))}
            </Box>
            {affected.total > 5 && (
              <RouterLink to={affected.moreLink} style={{ display: "inline-block", marginTop: 4 }}>
                {i18n.t("data-pages.foods.delete-affects-recipes-more", { count: affected.total })}
              </RouterLink>
            )}
          </Alert>
        )}
      />
    </div>
  );
}
