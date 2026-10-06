import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import { Link } from "react-router";
import { GroupDataPage, type GroupDataForm } from "@/components/Domain/Group/GroupDataPage";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import type { BulkAction, TableConfig, TableHeaders } from "@/components/global/CrudTable";
import { useUserApi } from "@/hooks/api";
import { fieldTypes } from "@/hooks/forms";
import { useCategoryStore } from "@/hooks/store";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { alert } from "@/hooks/use-toast";
import { normalizeFilter } from "@/hooks/use-utils";
import { validators } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import type { RecipeCategory } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import type { AutoFormItems } from "@/types/auto-forms";

// Port of pages/group/data/categories.vue. Middleware comes from the `group/data` parent route.
const DELETE_UNUSED_PREVIEW_LIMIT = 10;

const tableConfig: TableConfig = {
  hideColumns: true,
  canExport: true,
};

type CategoryWithCount = RecipeCategory & { recipeCount?: number };

export default function GroupDataCategoriesPage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const groupSlug = auth.user?.groupSlug || "";
  const userApi = useUserApi();

  const tableHeaders: TableHeaders[] = [
    { text: t("general.id"), value: "id", show: false },
    { text: t("general.name"), value: "name", show: true, sortable: true },
    { text: t("data-pages.recipe-count"), value: "recipeCount", show: true, sortable: true },
  ];
  const categoryStore = useCategoryStore();

  const refreshCategories = categoryStore.actions.refresh;
  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  // ============================================================
  // Form items (shared)
  const formItems: AutoFormItems = [
    {
      label: t("general.name"),
      varName: "name",
      type: fieldTypes.TEXT,
      rules: [validators.required],
    },
  ];

  // ============================================================
  // Create
  const [createData, setCreateData] = useState({ name: "" } as RecipeCategory);
  const createForm: GroupDataForm<RecipeCategory> = { items: formItems, data: createData };

  async function handleCreate(createFormData: RecipeCategory) {
    await categoryStore.actions.createOne(createFormData);
    setCreateData(current => ({ ...current, name: "" }));
  }

  // ============================================================
  // Edit
  const [editData, setEditData] = useState({} as RecipeCategory);
  const editForm: GroupDataForm<RecipeCategory> = { items: formItems, data: editData };

  async function handleEdit(editFormData: RecipeCategory) {
    await categoryStore.actions.updateOne(editFormData);
    setEditData({} as RecipeCategory);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, items: RecipeCategory[]) {
    if (event === "delete-selected") {
      const ids = items.filter(item => item.id != null).map(item => item.id!);
      await categoryStore.actions.deleteMany(ids);
    }
  }

  const bulkActions: BulkAction[] = [{ icon: icons.delete, text: t("general.delete"), event: "delete-selected" }];

  // ============================================================
  // Merge Categories
  const [mergeDialog, setMergeDialog] = useState(false);
  const [fromCategory, setFromCategory] = useState<RecipeCategory | null>(null);
  const [toCategory, setToCategory] = useState<RecipeCategory | null>(null);

  const canMerge = !!(fromCategory && toCategory && fromCategory.id !== toCategory.id);

  async function mergeCategories() {
    if (!canMerge || !fromCategory?.id || !toCategory?.id) {
      return;
    }

    const { data } = await userApi.categories.merge(fromCategory.id, toCategory.id);

    if (data) {
      setFromCategory(null);
      setToCategory(null);
      void categoryStore.actions.refresh();
    }
  }

  // ============================================================
  // Delete Unused
  const [deleteUnusedDialog, setDeleteUnusedDialog] = useState(false);
  const [unusedCategories, setUnusedCategories] = useState<RecipeCategory[]>([]);
  const unusedCategoryIds = unusedCategories.filter(category => category.id != null).map(category => category.id!);
  const unusedCategoryNamesPreview = unusedCategories.slice(0, DELETE_UNUSED_PREVIEW_LIMIT).map(category => category.name);
  const unusedCategoryNamesRemaining = Math.max(unusedCategories.length - DELETE_UNUSED_PREVIEW_LIMIT, 0);
  const [loadingEmpty, setLoadingEmpty] = useState(false);

  async function openDeleteUnusedDialog() {
    setLoadingEmpty(true);
    const { data } = await userApi.categories.getEmpty();
    setLoadingEmpty(false);
    const unused = data ?? [];
    setUnusedCategories(unused);

    if (unused.length === 0) {
      alert.info(t("data-pages.categories.no-unused-categories"));
      return;
    }

    setDeleteUnusedDialog(true);
  }

  async function confirmDeleteUnused() {
    await categoryStore.actions.deleteMany(unusedCategoryIds);
    setUnusedCategories([]);
  }

  return (
    <div>
      {/* Merge Dialog */}
      <BaseDialog
        open={mergeDialog}
        onOpenChange={setMergeDialog}
        bottomSheet
        icon={icons.categories}
        title={t("data-pages.categories.combine-category")}
        canConfirm
        onConfirm={() => void mergeCategories()}
      >
        <CardContent>
          <div>
            {t("data-pages.categories.merge-dialog-text")}
          </div>
          <Autocomplete
            value={fromCategory}
            onChange={(_event, value) => setFromCategory(value)}
            options={categoryStore.store}
            getOptionLabel={option => option.name}
            getOptionKey={option => option.id ?? option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, { inputValue }) => options.filter(category => normalizeFilter(category.name, inputValue))}
            renderInput={params => <TextField {...params} variant="standard" label={t("data-pages.categories.source-category")} />}
          />
          <Autocomplete
            value={toCategory}
            onChange={(_event, value) => setToCategory(value)}
            options={categoryStore.store}
            getOptionLabel={option => option.name}
            getOptionKey={option => option.id ?? option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, { inputValue }) => options.filter(category => normalizeFilter(category.name, inputValue))}
            renderInput={params => <TextField {...params} variant="standard" label={t("data-pages.categories.target-category")} />}
          />

          {canMerge && fromCategory && toCategory && (
            <Box sx={{ textAlign: "center" }}>
              {t("data-pages.categories.merge-category-example", { category1: fromCategory.name, category2: toCategory.name })}
            </Box>
          )}
        </CardContent>
      </BaseDialog>

      {/* Delete Unused Dialog */}
      <BaseDialog
        open={deleteUnusedDialog}
        onOpenChange={setDeleteUnusedDialog}
        bottomSheet
        title={t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => void confirmDeleteUnused()}
      >
        <CardContent>
          {t("data-pages.categories.delete-unused-confirm", { count: unusedCategoryIds.length }, unusedCategoryIds.length)}
          <Box
            component="ul"
            sx={{ m: "0.5rem 0 0", pl: "1.25rem", fontSize: "0.85rem", color: "text.secondary", lineHeight: 1.8 }}
          >
            {unusedCategoryNamesPreview.map(name => (
              <li key={name}>
                {name}
              </li>
            ))}
          </Box>
          {unusedCategoryNamesRemaining > 0 && (
            <Box sx={{ pl: 1, typography: "body2" }}>
              {t("data-pages.delete-unused-more", { count: unusedCategoryNamesRemaining })}
            </Box>
          )}
        </CardContent>
      </BaseDialog>

      <GroupDataPage<CategoryWithCount, RecipeCategory>
        icon={icons.categories}
        title={t("data-pages.categories.category-data")}
        createTitle={t("data-pages.categories.new-category")}
        editTitle={t("data-pages.categories.edit-category")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={(categoryStore.store || []) as CategoryWithCount[]}
        bulkActions={bulkActions}
        createForm={createForm}
        onCreateFormChange={form => setCreateData(form.data)}
        editForm={editForm}
        onEditFormChange={form => setEditData(form.data)}
        onCreateOne={data => void handleCreate(data)}
        onEditOne={data => void handleEdit(data)}
        onDeleteOne={id => void categoryStore.actions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
        slots={{
          recipeCount: item => (
            groupSlug && (item.recipeCount ?? 0) > 0
              ? <Link to={`/g/${groupSlug}?categories=${item.id}`}>{item.recipeCount}</Link>
              : <span>{item.recipeCount || 0}</span>
          ),
        }}
        tableButtonRow={(
          <>
            <BaseButton icon={icons.externalLink} onClick={() => setMergeDialog(true)}>
              {t("data-pages.combine")}
            </BaseButton>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            <BaseButton color="error" icon={icons.broom} loading={loadingEmpty} onClick={() => void openDeleteUnusedDialog()}>
              {t("data-pages.delete-unused")}
            </BaseButton>
          </>
        )}
      />
    </div>
  );
}
