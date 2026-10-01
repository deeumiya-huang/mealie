import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { AutocompleteInput } from "~/components/global/form";
import type { TableConfig, TableHeaders } from "~/components/global/CrudTable";
import { useUserApi } from "~/hooks/api";
import { fieldTypes } from "~/hooks/forms";
import { useCategoryStore, useTagStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { alert } from "~/hooks/use-toast";
import { normalizeFilter } from "~/hooks/use-utils";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";
import type { RecipeCategory, RecipeTag } from "~/lib/api/types/recipe";
import type { AutoFormItems } from "~/types/auto-forms";
import { GroupDataPage } from "./GroupDataPage";

type Organizer = (RecipeCategory | RecipeTag) & { recipeCount?: number };

const DELETE_UNUSED_PREVIEW_LIMIT = 10;

/** Per-type strings of the (otherwise identical) categories and tags data pages. */
const CONFIG = {
  categories: {
    icon: icons.categories,
    keys: {
      combine: "data-pages.categories.combine-category",
      mergeText: "data-pages.categories.merge-dialog-text",
      source: "data-pages.categories.source-category",
      target: "data-pages.categories.target-category",
      example: "data-pages.categories.merge-category-example",
      deleteUnused: "data-pages.categories.delete-unused-confirm",
      noUnused: "data-pages.categories.no-unused-categories",
      title: "data-pages.categories.category-data",
      createTitle: "data-pages.categories.new-category",
      editTitle: "data-pages.categories.edit-category",
    },
    example: (from: string, to: string) => ({ category1: from, category2: to }),
  },
  tags: {
    icon: icons.tags,
    keys: {
      combine: "data-pages.tags.combine-tag",
      mergeText: "data-pages.tags.merge-dialog-text",
      source: "data-pages.tags.source-tag",
      target: "data-pages.tags.target-tag",
      example: "data-pages.tags.merge-tag-example",
      deleteUnused: "data-pages.tags.delete-unused-confirm",
      noUnused: "data-pages.tags.no-unused-tags",
      title: "data-pages.tags.tag-data",
      createTitle: "data-pages.tags.new-tag",
      editTitle: "data-pages.tags.edit-tag",
    },
    example: (from: string, to: string) => ({ tag1: from, tag2: to }),
  },
} as const;

export function GroupOrganizerDataPage({ type }: { type: "categories" | "tags" }) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const groupSlug = auth.user?.groupSlug || "";
  const userApi = useUserApi();
  const config = CONFIG[type];

  // Both hooks run (hook order must not depend on props); only the chosen store is used
  const categoryStore = useCategoryStore();
  const tagStore = useTagStore();
  const store = type === "categories" ? categoryStore : tagStore;
  const api = type === "categories" ? userApi.categories : userApi.tags;
  const items = store.store as Organizer[];

  useEffect(() => {
    void store.actions.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on mount
  }, []);

  const tableConfig: TableConfig = { hideColumns: true, canExport: true };
  const [tableHeaders] = useState<TableHeaders[]>(() => [
    { text: i18n.t("general.id"), value: "id", show: false },
    { text: i18n.t("general.name"), value: "name", show: true, sortable: true },
    { text: i18n.t("data-pages.recipe-count"), value: "recipeCount", show: true, sortable: true },
  ]);

  // ============================================================
  // Form items (shared)
  const formItems: AutoFormItems = [
    { label: i18n.t("general.name"), varName: "name", type: fieldTypes.TEXT, rules: [validators.required] },
  ];

  // ============================================================
  // Create
  const [createData, setCreateData] = useState<Organizer>({ name: "" } as Organizer);
  async function handleCreate(data: Organizer) {
    await store.actions.createOne(data as RecipeCategory);
    setCreateData({ name: "" } as Organizer);
  }

  // ============================================================
  // Edit
  const [editData, setEditData] = useState<Organizer>({} as Organizer);
  async function handleEdit(data: Organizer) {
    await store.actions.updateOne(data as RecipeCategory);
    setEditData({} as Organizer);
  }

  // ============================================================
  // Bulk Actions
  async function handleBulkAction(event: string, selected: Organizer[]) {
    if (event === "delete-selected") {
      const ids = selected.filter(item => item.id != null).map(item => item.id!);
      await store.actions.deleteMany(ids);
    }
  }

  // ============================================================
  // Merge
  const [mergeDialog, setMergeDialog] = useState(false);
  const [fromItem, setFromItem] = useState<Organizer | null>(null);
  const [toItem, setToItem] = useState<Organizer | null>(null);
  const canMerge = !!fromItem && !!toItem && fromItem.id !== toItem.id;

  async function mergeItems() {
    if (!canMerge || !fromItem?.id || !toItem?.id) {
      return;
    }
    const { data } = await api.merge(fromItem.id, toItem.id);
    if (data) {
      setFromItem(null);
      setToItem(null);
      void store.actions.refresh();
    }
  }

  // ============================================================
  // Delete Unused
  const [deleteUnusedDialog, setDeleteUnusedDialog] = useState(false);
  const [unusedItems, setUnusedItems] = useState<Organizer[]>([]);
  const [loadingEmpty, setLoadingEmpty] = useState(false);
  const unusedIds = unusedItems.filter(c => c.id != null).map(c => c.id!);
  const unusedNamesPreview = unusedItems.slice(0, DELETE_UNUSED_PREVIEW_LIMIT).map(c => c.name);
  const unusedNamesRemaining = Math.max(unusedItems.length - DELETE_UNUSED_PREVIEW_LIMIT, 0);

  async function openDeleteUnusedDialog() {
    setLoadingEmpty(true);
    const { data } = await api.getEmpty();
    setLoadingEmpty(false);
    const unused = (data ?? []) as Organizer[];
    setUnusedItems(unused);
    if (unused.length === 0) {
      alert.info(i18n.t(config.keys.noUnused));
      return;
    }
    setDeleteUnusedDialog(true);
  }

  async function confirmDeleteUnused() {
    await store.actions.deleteMany(unusedIds);
    setUnusedItems([]);
  }

  const picker = (label: string, value: Organizer | null, onChange: (v: Organizer | null) => void) => (
    <AutocompleteInput<Organizer>
      value={value}
      onChange={(v: Organizer | null) => onChange(v)}
      returnObject
      items={items}
      customFilter={(title, query) => normalizeFilter(title, query)}
      itemTitle="name"
      label={label}
    />
  );

  return (
    <div>
      {/* Merge Dialog */}
      <BaseDialog
        open={mergeDialog}
        onOpenChange={setMergeDialog}
        bottomSheet
        icon={config.icon}
        title={i18n.t(config.keys.combine)}
        canConfirm
        onConfirm={() => void mergeItems()}
      >
        <Box sx={{ px: 2, pb: 2 }}>
          <div>{i18n.t(config.keys.mergeText)}</div>
          {picker(i18n.t(config.keys.source), fromItem, setFromItem)}
          {picker(i18n.t(config.keys.target), toItem, setToItem)}
          {canMerge && fromItem && toItem && (
            <Box sx={{ textAlign: "center" }}>
              {i18n.t(config.keys.example, config.example(fromItem.name, toItem.name))}
            </Box>
          )}
        </Box>
      </BaseDialog>

      {/* Delete Unused Dialog */}
      <BaseDialog
        open={deleteUnusedDialog}
        onOpenChange={setDeleteUnusedDialog}
        bottomSheet
        title={i18n.t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => void confirmDeleteUnused()}
      >
        <Box sx={{ px: 2, pb: 2 }}>
          {i18n.t(config.keys.deleteUnused, { count: unusedIds.length }, unusedIds.length)}
          <Box component="ul" sx={{ m: "0.5rem 0 0", pl: "1.25rem", fontSize: "0.85rem", color: "text.secondary", lineHeight: 1.8 }}>
            {unusedNamesPreview.map(name => <li key={name}>{name}</li>)}
          </Box>
          {unusedNamesRemaining > 0 && (
            <Box sx={{ typography: "body2", pl: 1 }}>
              {i18n.t("data-pages.delete-unused-more", { count: unusedNamesRemaining })}
            </Box>
          )}
        </Box>
      </BaseDialog>

      <GroupDataPage<Organizer, Organizer, Organizer>
        icon={config.icon}
        title={i18n.t(config.keys.title)}
        createTitle={i18n.t(config.keys.createTitle)}
        editTitle={i18n.t(config.keys.editTitle)}
        tableHeaders={tableHeaders}
        tableConfig={tableConfig}
        data={items || []}
        bulkActions={[{ icon: icons.delete, text: i18n.t("general.delete"), event: "delete-selected" }]}
        createForm={{ items: formItems, data: createData }}
        onCreateFormChange={setCreateData}
        editForm={{ items: formItems, data: editData }}
        onEditFormChange={setEditData}
        onCreateOne={data => void handleCreate(data)}
        onEditOne={data => void handleEdit(data)}
        onDeleteOne={id => void store.actions.deleteOne(id)}
        onBulkAction={(event, selected) => void handleBulkAction(event, selected)}
        cells={{
          recipeCount: item => (groupSlug && (item.recipeCount ?? 0) > 0
            ? <RouterLink to={`/g/${groupSlug}?${type}=${item.id}`}>{item.recipeCount}</RouterLink>
            : <span>{item.recipeCount || 0}</span>),
        }}
        tableButtonRow={(
          <>
            <BaseButton iconSlot={<Icon path={icons.externalLink} />} onClick={() => setMergeDialog(true)}>
              {i18n.t("data-pages.combine")}
            </BaseButton>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <BaseButton color="error" loading={loadingEmpty} iconSlot={<Icon path={icons.broom} />} onClick={() => void openDeleteUnusedDialog()}>
              {i18n.t("data-pages.delete-unused")}
            </BaseButton>
          </>
        )}
      />
    </div>
  );
}

export default GroupOrganizerDataPage;
