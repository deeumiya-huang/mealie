import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BaseOverflowButton } from "~/components/global/BaseOverflowButton";
import type { MenuItemDef } from "~/components/global/BaseOverflowButton";
import { Icon } from "~/components/global/Icon";
import { SelectInput, TextInput } from "~/components/global/form";
import { GroupExportData } from "~/components/Domain/Group/GroupExportData";
import { RecipeDataTable } from "~/components/Domain/Recipe/RecipeDataTable";
import type { RecipeDataTableShowHeaders } from "~/components/Domain/Recipe/RecipeDataTable";
import { RecipeOrganizerSelector } from "~/components/Domain/Recipe/RecipeOrganizerSelector";
import { RecipeSettingsSwitches } from "~/components/Domain/Recipe/RecipeSettingsSwitches";
import { UserAvatar } from "~/components/Domain/User/UserAvatar";
import { useUserApi } from "~/hooks/api";
import { useRecipes } from "~/hooks/recipes";
import { useHouseholdStore, useUserStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { icons } from "~/lib/icons";
import type { GroupDataExport } from "~/lib/api/types/group";
import type { CategoryBase, Recipe, RecipeSettings, TagBase } from "~/lib/api/types/recipe";

enum MODES {
  tag = "tag",
  category = "category",
  export = "export",
  delete = "delete",
  updateSettings = "updateSettings",
  changeOwner = "changeOwner",
}

const defaultSettings: RecipeSettings = {
  public: false,
  showNutrition: false,
  showAssets: false,
  landscapeView: false,
  disableComments: false,
  locked: false,
};

export default function GroupDataRecipesPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();

  useSeoMeta({ title: i18n.t("data-pages.recipes.recipe-data") });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { recipes: allRecipes, refreshRecipes } = useRecipes(true, true, false, `householdId=${auth.user?.householdId || ""}`);
  const [selected, setSelected] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [toSetTags, setToSetTags] = useState<TagBase[]>([]);
  const [toSetCategories, setToSetCategories] = useState<CategoryBase[]>([]);
  const [recipeSettings, setRecipeSettings] = useState<RecipeSettings>(defaultSettings);
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null);

  function resetAll() {
    setSelected([]);
    setToSetTags([]);
    setToSetCategories([]);
    setLoading(false);
  }

  const [headers, setHeaders] = useState<RecipeDataTableShowHeaders>({
    id: false,
    owner: false,
    tags: true,
    tools: true,
    categories: true,
    recipeServings: false,
    recipeYieldQuantity: false,
    recipeYield: false,
    dateAdded: false,
  });

  const headerLabels: Record<keyof RecipeDataTableShowHeaders, string> = {
    id: i18n.t("general.id"),
    owner: i18n.t("general.owner"),
    tags: i18n.t("tag.tags"),
    categories: i18n.t("recipe.categories"),
    tools: i18n.t("tool.tools"),
    recipeServings: i18n.t("recipe.recipe-servings"),
    recipeYieldQuantity: i18n.t("recipe.recipe-yield"),
    recipeYield: i18n.t("recipe.recipe-yield-text"),
    dateAdded: i18n.t("general.date-added"),
  };

  const actions: MenuItemDef[] = [
    { icon: icons.database, text: i18n.t("export.export"), event: "export-selected" },
    { icon: icons.tags, text: i18n.t("data-pages.recipes.tag"), event: "tag-selected" },
    { icon: icons.categories, text: i18n.t("data-pages.recipes.categorize"), event: "categorize-selected" },
    { icon: icons.cog, text: i18n.t("data-pages.recipes.update-settings"), event: "update-settings" },
    { icon: icons.user, text: i18n.t("general.change-owner"), event: "change-owner" },
    { icon: icons.delete, text: i18n.t("general.delete"), event: "delete-selected" },
  ];

  // ===============================================================
  // Group Exports

  const [purgeExportsDialog, setPurgeExportsDialog] = useState(false);
  const [groupExports, setGroupExports] = useState<GroupDataExport[]>([]);

  async function refreshExports() {
    const { data } = await api.bulk.fetchExports();
    if (data) {
      setGroupExports(data);
    }
  }

  async function purgeExports() {
    await api.bulk.purgeExports();
    void refreshExports();
  }

  useEffect(() => {
    void refreshExports();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- on mount
  }, []);

  // ===============================================================
  // Bulk actions (each receives the current selection)

  const slugs = (recipes: Recipe[]) => recipes.map(x => x.slug ?? "");

  async function exportSelected(recipes: Recipe[]) {
    setLoading(true);
    await api.bulk.bulkExport({ recipes: slugs(recipes), exportType: "json" });
    resetAll();
    void refreshExports();
  }

  async function tagSelected(recipes: Recipe[]) {
    setLoading(true);
    await api.bulk.bulkTag({ recipes: slugs(recipes), tags: toSetTags });
    await refreshRecipes();
    resetAll();
  }

  async function categorizeSelected(recipes: Recipe[]) {
    setLoading(true);
    await api.bulk.bulkCategorize({ recipes: slugs(recipes), categories: toSetCategories });
    await refreshRecipes();
    resetAll();
  }

  async function deleteSelected(recipes: Recipe[]) {
    setLoading(true);
    await api.bulk.bulkDelete({ recipes: slugs(recipes) });
    await refreshRecipes();
    resetAll();
  }

  async function updateSettings(recipes: Recipe[]) {
    setLoading(true);
    await api.bulk.bulkSetSettings({ recipes: slugs(recipes), settings: recipeSettings });
    await refreshRecipes();
    resetAll();
  }

  async function changeOwner(recipes: Recipe[]) {
    if (!recipes.length || !selectedOwner) {
      return;
    }
    setLoading(true);
    await api.recipes.patchMany(recipes.map(r => ({ ...r, userId: selectedOwner })));
    await refreshRecipes();
    resetAll();
  }

  // ============================================================
  // Dialog Management

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<MODES>(MODES.tag);
  // "Export all" selects everything and opens the dialog in one click, so the target is kept here
  const [dialogTarget, setDialogTarget] = useState<Recipe[]>([]);

  const titles: Record<MODES, string> = {
    [MODES.tag]: i18n.t("data-pages.recipes.tag-recipes"),
    [MODES.category]: i18n.t("data-pages.recipes.categorize-recipes"),
    [MODES.export]: i18n.t("data-pages.recipes.export-recipes"),
    [MODES.delete]: i18n.t("data-pages.recipes.delete-recipes"),
    [MODES.updateSettings]: i18n.t("data-pages.recipes.update-settings"),
    [MODES.changeOwner]: i18n.t("general.change-owner"),
  };
  const callbacks: Record<MODES, (recipes: Recipe[]) => Promise<void>> = {
    [MODES.tag]: tagSelected,
    [MODES.category]: categorizeSelected,
    [MODES.export]: exportSelected,
    [MODES.delete]: deleteSelected,
    [MODES.updateSettings]: updateSettings,
    [MODES.changeOwner]: changeOwner,
  };
  const modeIcons: Record<MODES, string> = {
    [MODES.tag]: icons.tags,
    [MODES.category]: icons.categories,
    [MODES.export]: icons.database,
    [MODES.delete]: icons.delete,
    [MODES.updateSettings]: icons.cog,
    [MODES.changeOwner]: icons.user,
  };

  function openDialog(mode: MODES, target = selected) {
    setDialogMode(mode);
    setDialogTarget(target);
    setDialogOpen(true);
  }

  const onMenuEvent: Record<string, MODES> = {
    "export-selected": MODES.export,
    "tag-selected": MODES.tag,
    "categorize-selected": MODES.category,
    "delete-selected": MODES.delete,
    "update-settings": MODES.updateSettings,
    "change-owner": MODES.changeOwner,
  };

  const { store: allUsers } = useUserStore();
  const { store: households } = useHouseholdStore();
  const [selectedOwner, setSelectedOwner] = useState("");
  const owner = selectedOwner ? allUsers.find(u => u.id === selectedOwner) : undefined;
  const selectedOwnerHousehold = owner ? households.find(h => h.id === owner.householdId) : null;

  const recipeList = (recipes: Recipe[]) => (
    <Paper variant="outlined" sx={{ maxHeight: 400, overflowY: "auto" }}>
      <List dense>
        {recipes.map(item => (
          <ListItem key={item.id ?? item.slug} sx={{ pb: 1 }}>
            <ListItemText primary={item.name} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  return (
    <Box sx={{ py: 2 }}>
      {/* Export Purge Confirmation Dialog */}
      <BaseDialog
        open={purgeExportsDialog}
        onOpenChange={setPurgeExportsDialog}
        bottomSheet
        title={i18n.t("data-pages.recipes.purge-exports")}
        color="error"
        icon={icons.alertCircle}
        canConfirm
        onConfirm={() => void purgeExports()}
      >
        <Box sx={{ px: 2, pb: 2 }}>{i18n.t("data-pages.recipes.are-you-sure-you-want-to-delete-all-export-data")}</Box>
      </BaseDialog>

      {/* Base Dialog Object */}
      <BaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bottomSheet
        width="650px"
        color={dialogMode === MODES.delete ? "error" : undefined}
        icon={modeIcons[dialogMode]}
        title={titles[dialogMode]}
        submitText={i18n.t("general.submit")}
        canSubmit={dialogMode !== MODES.delete}
        canDelete={dialogMode === MODES.delete}
        onSubmit={() => void callbacks[dialogMode](dialogTarget)}
        onDelete={() => void callbacks[dialogMode](dialogTarget)}
      >
        <Box sx={{ px: dialogMode === MODES.updateSettings ? 6 : 2, pb: 2 }}>
          {dialogMode === MODES.tag && (
            <RecipeOrganizerSelector value={toSetTags} onChange={v => setToSetTags(v as TagBase[])} selectorType="tags" />
          )}
          {dialogMode === MODES.category && (
            <RecipeOrganizerSelector value={toSetCategories} onChange={v => setToSetCategories(v as CategoryBase[])} selectorType="categories" />
          )}
          {dialogMode === MODES.delete && (
            <>
              <p>{i18n.t("data-pages.recipes.confirm-delete-recipes")}</p>
              {recipeList(dialogTarget)}
            </>
          )}
          {dialogMode === MODES.export && (
            <>
              <p>{i18n.t("data-pages.recipes.the-following-recipes-selected-length-will-be-exported", [dialogTarget.length])}</p>
              {recipeList(dialogTarget)}
            </>
          )}
          {dialogMode === MODES.updateSettings && (
            <>
              <p>{i18n.t("data-pages.recipes.settings-chosen-explanation")}</p>
              <Box sx={{ mx: "auto" }}>
                <RecipeSettingsSwitches value={recipeSettings} onChange={setRecipeSettings} />
              </Box>
              <p style={{ textAlign: "center", marginBottom: 0 }}>
                <i>{i18n.t("data-pages.recipes.selected-length-recipe-s-settings-will-be-updated", dialogTarget.length)}</i>
              </p>
            </>
          )}
          {dialogMode === MODES.changeOwner && (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <UserAvatar userId={selectedOwner} tooltip={false} />
                <SelectInput
                  value={selectedOwner}
                  onChange={v => setSelectedOwner((v as string) || "")}
                  items={allUsers}
                  itemTitle="fullName"
                  itemValue="id"
                  label={i18n.t("general.owner")}
                  hideDetails
                />
              </Box>
              {selectedOwnerHousehold && (
                <Box sx={{ display: "flex", alignItems: "flex-end", p: 2 }}>
                  <Icon path={icons.household} />
                  <span style={{ paddingLeft: 4 }}>{selectedOwnerHousehold.name}</span>
                </Box>
              )}
            </>
          )}
        </Box>
      </BaseDialog>

      <section>
        {/* Recipe Data Table */}
        <BaseCardSectionTitle icon={icons.primary} title={i18n.t("data-pages.recipes.recipe-data")}>
          {i18n.t("data-pages.recipes.recipe-data-description")}
        </BaseCardSectionTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Button variant="contained" color="accent" startIcon={<Icon path={icons.cog} />} onClick={e => setColumnsAnchor(e.currentTarget)}>
            {i18n.t("data-pages.columns")}
          </Button>
          <Popover
            open={!!columnsAnchor}
            anchorEl={columnsAnchor}
            onClose={() => setColumnsAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            slotProps={{ paper: { sx: { mt: 0.75 } } }}
          >
            <Card>
              <Typography variant="subtitle1" sx={{ px: 2, py: 1 }}>{i18n.t("data-pages.recipes.recipe-columns")}</Typography>
              <Divider sx={{ mx: 1 }} />
              <CardContent sx={{ display: "flex", flexDirection: "column", py: 1 }}>
                {(Object.keys(headers) as (keyof RecipeDataTableShowHeaders)[]).map(key => (
                  <FormControlLabel
                    key={key}
                    control={<Checkbox size="small" checked={headers[key]} onChange={e => setHeaders(prev => ({ ...prev, [key]: e.target.checked }))} />}
                    label={headerLabels[key]}
                  />
                ))}
              </CardContent>
            </Card>
          </Popover>
          <BaseOverflowButton
            disabled={selected.length < 1}
            mode="event"
            items={actions}
            onEvent={event => onMenuEvent[event] && openDialog(onMenuEvent[event])}
          />
          {selected.length > 0 && (
            <Typography variant="caption" sx={{ my: "auto", ml: 2.5 }}>
              {i18n.t("general.selected-count", selected.length)}
            </Typography>
          )}
        </Box>
        <Box sx={{ mx: 1, maxWidth: 400 }}>
          <TextInput value={search} onChange={setSearch} variant="underlined" label={i18n.t("search.search")} />
        </Box>
        <Card>
          <RecipeDataTable
            selected={selected}
            onSelectedChange={setSelected}
            loading={loading}
            recipes={allRecipes}
            showHeaders={headers}
            search={search}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
            <BaseButton
              color="info"
              iconSlot={<Icon path={icons.database} />}
              onClick={() => {
                setSelected(allRecipes);
                openDialog(MODES.export, allRecipes);
              }}
            >
              {i18n.t("general.export-all")}
            </BaseButton>
          </Box>
        </Card>
      </section>

      <Box component="section" sx={{ mt: 5 }}>
        <BaseCardSectionTitle icon={icons.database} section title={i18n.t("data-pages.recipes.data-exports")}>
          {i18n.t("data-pages.recipes.data-exports-description")}
        </BaseCardSectionTitle>
        <Box sx={{ mb: 1 }}>
          <BaseButton delete onClick={() => setPurgeExportsDialog(true)} />
        </Box>
        <Card>
          <GroupExportData exports={groupExports} />
        </Card>
      </Box>
    </Box>
  );
}
