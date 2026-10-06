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
import { useTagStore } from "@/hooks/store";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { alert } from "@/hooks/use-toast";
import { normalizeFilter } from "@/hooks/use-utils";
import { validators } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import type { RecipeTag } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import type { AutoFormItems } from "@/types/auto-forms";

// Port of pages/group/data/tags.vue. Middleware comes from the `group/data` parent route.
const DELETE_UNUSED_PREVIEW_LIMIT = 10;

const tableConfig: TableConfig = {
  hideColumns: true,
  canExport: true,
};

type TagWithCount = RecipeTag & { recipeCount?: number };

export default function GroupDataTagsPage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const groupSlug = auth.user?.groupSlug || "";
  const userApi = useUserApi();

  const tableHeaders: TableHeaders[] = [
    { text: t("general.id"), value: "id", show: false },
    { text: t("general.name"), value: "name", show: true, sortable: true },
    { text: t("data-pages.recipe-count"), value: "recipeCount", show: true, sortable: true },
  ];
  const tagStore = useTagStore();

  const refreshTags = tagStore.actions.refresh;
  useEffect(() => {
    void refreshTags();
  }, [refreshTags]);

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
  const [createData, setCreateData] = useState({ name: "" } as RecipeTag);
  const createForm: GroupDataForm<RecipeTag> = { items: formItems, data: createData };

  async function handleCreate(createFormData: RecipeTag) {
    await tagStore.actions.createOne(createFormData);
    setCreateData(current => ({ ...current, name: "" }));
  }

  // ============================================================
  // Edit
  const [editData, setEditData] = useState({} as RecipeTag);
  const editForm: GroupDataForm<RecipeTag> = { items: formItems, data: editData };

  async function handleEdit(editFormData: RecipeTag) {
    await tagStore.actions.updateOne(editFormData);
    setEditData({} as RecipeTag);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, items: RecipeTag[]) {
    if (event === "delete-selected") {
      const ids = items.filter(item => item.id != null).map(item => item.id!);
      await tagStore.actions.deleteMany(ids);
    }
  }

  const bulkActions: BulkAction[] = [{ icon: icons.delete, text: t("general.delete"), event: "delete-selected" }];

  // ============================================================
  // Merge Tags
  const [mergeDialog, setMergeDialog] = useState(false);
  const [fromTag, setFromTag] = useState<RecipeTag | null>(null);
  const [toTag, setToTag] = useState<RecipeTag | null>(null);

  const canMerge = !!(fromTag && toTag && fromTag.id !== toTag.id);

  async function mergeTags() {
    if (!canMerge || !fromTag?.id || !toTag?.id) {
      return;
    }

    const { data } = await userApi.tags.merge(fromTag.id, toTag.id);

    if (data) {
      setFromTag(null);
      setToTag(null);
      void tagStore.actions.refresh();
    }
  }

  // ============================================================
  // Delete Unused
  const [deleteUnusedDialog, setDeleteUnusedDialog] = useState(false);
  const [unusedTags, setUnusedTags] = useState<RecipeTag[]>([]);
  const unusedTagIds = unusedTags.filter(tag => tag.id != null).map(tag => tag.id!);
  const unusedTagNamesPreview = unusedTags.slice(0, DELETE_UNUSED_PREVIEW_LIMIT).map(tag => tag.name);
  const unusedTagNamesRemaining = Math.max(unusedTags.length - DELETE_UNUSED_PREVIEW_LIMIT, 0);
  const [loadingEmpty, setLoadingEmpty] = useState(false);

  async function openDeleteUnusedDialog() {
    setLoadingEmpty(true);
    const { data } = await userApi.tags.getEmpty();
    setLoadingEmpty(false);
    const unused = data ?? [];
    setUnusedTags(unused);

    if (unused.length === 0) {
      alert.info(t("data-pages.tags.no-unused-tags"));
      return;
    }

    setDeleteUnusedDialog(true);
  }

  async function confirmDeleteUnused() {
    await tagStore.actions.deleteMany(unusedTagIds);
    setUnusedTags([]);
  }

  return (
    <div>
      {/* Merge Dialog */}
      <BaseDialog
        open={mergeDialog}
        onOpenChange={setMergeDialog}
        bottomSheet
        icon={icons.tags}
        title={t("data-pages.tags.combine-tag")}
        canConfirm
        onConfirm={() => void mergeTags()}
      >
        <CardContent>
          <div>
            {t("data-pages.tags.merge-dialog-text")}
          </div>
          <Autocomplete
            value={fromTag}
            onChange={(_event, value) => setFromTag(value)}
            options={tagStore.store}
            getOptionLabel={option => option.name}
            getOptionKey={option => option.id ?? option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, { inputValue }) => options.filter(tag => normalizeFilter(tag.name, inputValue))}
            renderInput={params => <TextField {...params} variant="standard" label={t("data-pages.tags.source-tag")} />}
          />
          <Autocomplete
            value={toTag}
            onChange={(_event, value) => setToTag(value)}
            options={tagStore.store}
            getOptionLabel={option => option.name}
            getOptionKey={option => option.id ?? option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, { inputValue }) => options.filter(tag => normalizeFilter(tag.name, inputValue))}
            renderInput={params => <TextField {...params} variant="standard" label={t("data-pages.tags.target-tag")} />}
          />

          {canMerge && fromTag && toTag && (
            <Box sx={{ textAlign: "center" }}>
              {t("data-pages.tags.merge-tag-example", { tag1: fromTag.name, tag2: toTag.name })}
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
          {t("data-pages.tags.delete-unused-confirm", { count: unusedTagIds.length }, unusedTagIds.length)}
          <Box
            component="ul"
            sx={{ m: "0.5rem 0 0", pl: "1.25rem", fontSize: "0.85rem", color: "text.secondary", lineHeight: 1.8 }}
          >
            {unusedTagNamesPreview.map(name => (
              <li key={name}>
                {name}
              </li>
            ))}
          </Box>
          {unusedTagNamesRemaining > 0 && (
            <Box sx={{ pl: 1, typography: "body2" }}>
              {t("data-pages.delete-unused-more", { count: unusedTagNamesRemaining })}
            </Box>
          )}
        </CardContent>
      </BaseDialog>

      <GroupDataPage<TagWithCount, RecipeTag>
        icon={icons.tags}
        title={t("data-pages.tags.tag-data")}
        createTitle={t("data-pages.tags.new-tag")}
        editTitle={t("data-pages.tags.edit-tag")}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={(tagStore.store || []) as TagWithCount[]}
        bulkActions={bulkActions}
        createForm={createForm}
        onCreateFormChange={form => setCreateData(form.data)}
        editForm={editForm}
        onEditFormChange={form => setEditData(form.data)}
        onCreateOne={data => void handleCreate(data)}
        onEditOne={data => void handleEdit(data)}
        onDeleteOne={id => void tagStore.actions.deleteOne(id)}
        onBulkAction={(event, items) => void handleBulkAction(event, items)}
        slots={{
          recipeCount: item => (
            groupSlug && (item.recipeCount ?? 0) > 0
              ? <Link to={`/g/${groupSlug}?tags=${item.id}`}>{item.recipeCount}</Link>
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
