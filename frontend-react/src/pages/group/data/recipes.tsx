import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { GroupExportData } from "@/components/Domain/Group/GroupExportData";
import { RecipeDataTable, type ShowHeaders } from "@/components/Domain/Recipe/RecipeDataTable";
import { RecipeOrganizerSelector } from "@/components/Domain/Recipe/RecipeOrganizerSelector";
import { RecipeSettingsSwitches } from "@/components/Domain/Recipe/RecipeSettingsSwitches";
import { UserAvatar } from "@/components/Domain/User/UserAvatar";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BaseOverflowButton, type MenuItemSpec } from "@/components/global/BaseOverflowButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { useHouseholdStore, useUserStore } from "@/hooks/store";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { allRecipes, useRecipes } from "@/hooks/recipes";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { GroupDataExport } from "@/lib/api/types/group";
import type { Recipe, RecipeCategory, RecipeSettings, RecipeTag } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { useStore } from "@/lib/store";

// Port of pages/group/data/recipes.vue. Middleware comes from the `group/data` parent route.
type DialogMode = "tag" | "category" | "export" | "delete" | "updateSettings" | "changeOwner";

const clipWidth = { maxWidth: 400 };

/** The list of the selected recipes inside the delete/export dialogs (Vue: a `v-virtual-scroll`). */
function SelectedRecipes({ recipes }: { recipes: Recipe[] }) {
  return (
    <Card variant="outlined">
      <List dense disablePadding sx={{ height: 400, overflowY: "auto" }}>
        {recipes.map(recipe => (
          <ListItem key={recipe.id ?? recipe.slug} sx={{ pb: 1 }}>
            <ListItemText primary={recipe.name} />
          </ListItem>
        ))}
      </List>
    </Card>
  );
}

export default function GroupDataRecipesPage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();

  usePageTitle(t("data-pages.recipes.recipe-data"));

  const { refreshRecipes } = useRecipes(true, true, false, `householdId=${auth.user?.householdId || ""}`);
  const recipes = useStore(allRecipes);
  const [selected, setSelected] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [toSetTags, setToSetTags] = useState<RecipeTag[]>([]);
  const [toSetCategories, setToSetCategories] = useState<RecipeCategory[]>([]);

  function resetAll() {
    setSelected([]);
    setToSetTags([]);
    setToSetCategories([]);
    setLoading(false);
  }

  const [headers, setHeaders] = useState<ShowHeaders>({
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
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null);

  const headerLabels: Record<keyof ShowHeaders, string> = {
    id: t("general.id"),
    owner: t("general.owner"),
    tags: t("tag.tags"),
    categories: t("recipe.categories"),
    tools: t("tool.tools"),
    recipeServings: t("recipe.recipe-servings"),
    recipeYieldQuantity: t("recipe.recipe-yield"),
    recipeYield: t("recipe.recipe-yield-text"),
    dateAdded: t("general.date-added"),
  };

  const actions: MenuItemSpec[] = [
    { icon: icons.database, text: t("export.export"), event: "export-selected" },
    { icon: icons.tags, text: t("data-pages.recipes.tag"), event: "tag-selected" },
    { icon: icons.categories, text: t("data-pages.recipes.categorize"), event: "categorize-selected" },
    { icon: icons.cog, text: t("data-pages.recipes.update-settings"), event: "update-settings" },
    { icon: icons.user, text: t("general.change-owner"), event: "change-owner" },
    { icon: icons.delete, text: t("general.delete"), event: "delete-selected" },
  ];

  const actionModes: Record<string, DialogMode> = {
    "export-selected": "export",
    "tag-selected": "tag",
    "categorize-selected": "category",
    "delete-selected": "delete",
    "update-settings": "updateSettings",
    "change-owner": "changeOwner",
  };

  // ===============================================================
  // Group Exports

  const [purgeExportsDialog, setPurgeExportsDialog] = useState(false);
  const [groupExports, setGroupExports] = useState<GroupDataExport[]>([]);

  const refreshExports = useCallback(async () => {
    const { data } = await api.bulk.fetchExports();

    if (data) {
      setGroupExports(data);
    }
  }, [api]);

  async function purgeExports() {
    await api.bulk.purgeExports();
    void refreshExports();
  }

  useEffect(() => {
    let active = true;
    void api.bulk.fetchExports().then(({ data }) => {
      if (active && data) {
        setGroupExports(data);
      }
    });
    return () => {
      active = false;
    };
  }, [api]);

  // ===============================================================
  // All Recipes

  function selectAll() {
    setSelected(recipes);
  }

  async function exportSelected() {
    setLoading(true);
    const { data } = await api.bulk.bulkExport({
      recipes: selected.map(recipe => recipe.slug ?? ""),
      exportType: "json",
    });

    if (data) {
      console.log(data);
    }

    resetAll();
    void refreshExports();
  }

  async function tagSelected() {
    setLoading(true);

    const slugs = selected.map(recipe => recipe.slug ?? "");
    await api.bulk.bulkTag({ recipes: slugs, tags: toSetTags as Parameters<typeof api.bulk.bulkTag>[0]["tags"] });
    await refreshRecipes();
    resetAll();
  }

  async function categorizeSelected() {
    setLoading(true);

    const slugs = selected.map(recipe => recipe.slug ?? "");
    await api.bulk.bulkCategorize({
      recipes: slugs,
      categories: toSetCategories as Parameters<typeof api.bulk.bulkCategorize>[0]["categories"],
    });
    await refreshRecipes();
    resetAll();
  }

  async function deleteSelected() {
    setLoading(true);

    const slugs = selected.map(recipe => recipe.slug ?? "");

    await api.bulk.bulkDelete({ recipes: slugs });

    await refreshRecipes();
    resetAll();
  }

  const [recipeSettings, setRecipeSettings] = useState<RecipeSettings>({
    public: false,
    showNutrition: false,
    showAssets: false,
    landscapeView: false,
    disableComments: false,
    locked: false,
  });

  async function updateSettings() {
    setLoading(true);

    const slugs = selected.map(recipe => recipe.slug ?? "");

    await api.bulk.bulkSetSettings({ recipes: slugs, settings: recipeSettings });

    await refreshRecipes();
    resetAll();
  }

  // ============================================================
  // Change owner
  const { store: allUsers } = useUserStore();
  const { store: households } = useHouseholdStore();
  const [selectedOwner, setSelectedOwner] = useState("");

  const selectedOwnerUser = selectedOwner ? allUsers.find(user => user.id === selectedOwner) : undefined;
  const selectedOwnerHousehold = selectedOwnerUser
    ? households.find(household => household.id === selectedOwnerUser.householdId)
    : null;

  async function changeOwner() {
    if (!selected.length || !selectedOwner) {
      return;
    }

    setLoading(true);
    await api.recipes.patchMany(selected.map(recipe => ({ ...recipe, userId: selectedOwner })));

    await refreshRecipes();
    resetAll();
  }

  // ============================================================
  // Dialog Management

  const [dialog, setDialog] = useState<{ state: boolean; mode: DialogMode }>({ state: false, mode: "tag" });

  const dialogTitles: Record<DialogMode, string> = {
    tag: t("data-pages.recipes.tag-recipes"),
    category: t("data-pages.recipes.categorize-recipes"),
    export: t("data-pages.recipes.export-recipes"),
    delete: t("data-pages.recipes.delete-recipes"),
    updateSettings: t("data-pages.recipes.update-settings"),
    changeOwner: t("general.change-owner"),
  };

  const dialogIcons: Record<DialogMode, string> = {
    tag: icons.tags,
    category: icons.categories,
    export: icons.database,
    delete: icons.delete,
    updateSettings: icons.cog,
    changeOwner: icons.user,
  };

  const dialogCallbacks: Record<DialogMode, () => Promise<void>> = {
    tag: tagSelected,
    category: categorizeSelected,
    export: exportSelected,
    delete: deleteSelected,
    updateSettings,
    changeOwner,
  };

  function openDialog(mode: DialogMode) {
    setDialog({ state: true, mode });
  }

  return (
    <Container maxWidth={false}>
      {/* Export Purge Confirmation Dialog */}
      <BaseDialog
        open={purgeExportsDialog}
        onOpenChange={setPurgeExportsDialog}
        bottomSheet
        title={t("data-pages.recipes.purge-exports")}
        color="error"
        icon={icons.alertCircle}
        canConfirm
        onConfirm={() => void purgeExports()}
      >
        <CardContent>
          {t("data-pages.recipes.are-you-sure-you-want-to-delete-all-export-data")}
        </CardContent>
      </BaseDialog>

      {/* Base Dialog Object */}
      <BaseDialog
        open={dialog.state}
        onOpenChange={state => setDialog(current => ({ ...current, state }))}
        bottomSheet
        width="650px"
        color={dialog.mode === "delete" ? "error" : undefined}
        icon={dialogIcons[dialog.mode]}
        title={dialogTitles[dialog.mode]}
        submitText={t("general.submit")}
        canSubmit={dialog.mode !== "delete"}
        canDelete={dialog.mode === "delete"}
        onSubmit={() => void dialogCallbacks[dialog.mode]()}
        onDelete={() => void dialogCallbacks[dialog.mode]()}
      >
        {dialog.mode === "tag" && (
          <CardContent>
            <RecipeOrganizerSelector<RecipeTag>
              selectorType="tags"
              value={toSetTags}
              onChange={setToSetTags}
            />
          </CardContent>
        )}
        {dialog.mode === "category" && (
          <CardContent>
            <RecipeOrganizerSelector<RecipeCategory>
              selectorType="categories"
              value={toSetCategories}
              onChange={setToSetCategories}
            />
          </CardContent>
        )}
        {dialog.mode === "delete" && (
          <CardContent>
            <Typography component="p" variant="h6">
              {t("data-pages.recipes.confirm-delete-recipes")}
            </Typography>
            <SelectedRecipes recipes={selected} />
          </CardContent>
        )}
        {dialog.mode === "export" && (
          <CardContent>
            <Typography component="p" variant="h6">
              {t("data-pages.recipes.the-following-recipes-selected-length-will-be-exported", [selected.length])}
            </Typography>
            <SelectedRecipes recipes={selected} />
          </CardContent>
        )}
        {dialog.mode === "updateSettings" && (
          <CardContent sx={{ px: 6 }}>
            <p>{t("data-pages.recipes.settings-chosen-explanation")}</p>
            <Box sx={{ mx: "auto" }}>
              <RecipeSettingsSwitches value={recipeSettings} onChange={setRecipeSettings} />
            </Box>
            <Box component="p" sx={{ textAlign: "center", mb: 0 }}>
              <i>{t("data-pages.recipes.selected-length-recipe-s-settings-will-be-updated", selected.length)}</i>
            </Box>
          </CardContent>
        )}
        {dialog.mode === "changeOwner" && (
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <UserAvatar userId={selectedOwner} tooltip={false} />
              <TextField
                select
                fullWidth
                variant="standard"
                label={t("general.owner")}
                value={selectedOwner}
                onChange={event => setSelectedOwner(event.target.value)}
              >
                {allUsers.map(user => (
                  <MenuItem key={user.id} value={user.id}>{user.fullName}</MenuItem>
                ))}
              </TextField>
            </Box>
            {selectedOwnerHousehold && (
              <CardContent sx={{ display: "flex", alignItems: "flex-end" }}>
                <MdiIcon path={icons.household} />
                <Box component="span" sx={{ pl: 0.5 }}>{selectedOwnerHousehold.name}</Box>
              </CardContent>
            )}
          </CardContent>
        )}
      </BaseDialog>

      <section>
        {/* Recipe Data Table */}
        <BaseCardSectionTitle icon={icons.primary} title={t("data-pages.recipes.recipe-data")}>
          {t("data-pages.recipes.recipe-data-description")}
        </BaseCardSectionTitle>
        <CardActions sx={{ mt: -2.5, mb: 0.5 }}>
          <Button
            color="accent"
            variant="contained"
            sx={{ mr: 1 }}
            startIcon={<MdiIcon path={icons.cog} />}
            onClick={event => setColumnsAnchor(event.currentTarget)}
          >
            {t("data-pages.columns")}
          </Button>
          <Popover
            open={columnsAnchor !== null}
            anchorEl={columnsAnchor}
            onClose={() => setColumnsAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <Card>
              <CardHeader sx={{ py: 1 }} title={<div>{t("data-pages.recipes.recipe-columns")}</div>} slotProps={{ title: { variant: "h6" } }} />
              <Divider sx={{ mx: 1 }} />
              <CardContent sx={{ display: "flex", flexDirection: "column" }}>
                {(Object.keys(headers) as (keyof ShowHeaders)[]).map(key => (
                  <FormControlLabel
                    key={key}
                    label={headerLabels[key]}
                    control={(
                      <Checkbox
                        size="small"
                        checked={headers[key]}
                        onChange={event => setHeaders(current => ({ ...current, [key]: event.target.checked }))}
                      />
                    )}
                  />
                ))}
              </CardContent>
            </Card>
          </Popover>
          <BaseOverflowButton
            disabled={selected.length < 1}
            mode="event"
            color="info"
            variant="contained"
            sx={{ "&.Mui-disabled": { opacity: 0.5 } }}
            items={actions}
            onAction={(event) => {
              const mode = actionModes[event];
              if (mode) {
                openDialog(mode);
              }
            }}
          />

          {selected.length > 0 && (
            <Typography component="p" variant="caption" sx={{ my: "auto", ml: 2.5 }}>
              {t("general.selected-count", selected.length)}
            </Typography>
          )}
        </CardActions>
        <Box sx={{ mx: 1, ...clipWidth }}>
          <TextField
            fullWidth
            variant="standard"
            label={t("search.search")}
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </Box>
        <Card>
          <RecipeDataTable
            selected={selected}
            onSelectedChange={setSelected}
            loading={loading}
            recipes={recipes}
            showHeaders={headers}
            search={search}
          />
          <CardActions sx={{ justifyContent: "flex-end" }}>
            <BaseButton
              color="info"
              icon={icons.database}
              onClick={() => {
                selectAll();
                openDialog("export");
              }}
            >
              {t("general.export-all")}
            </BaseButton>
          </CardActions>
        </Card>
      </section>

      <Box component="section" sx={{ mt: 5 }}>
        {/* Data Table */}
        <BaseCardSectionTitle icon={icons.database} section title={t("data-pages.recipes.data-exports")}>
          {t("data-pages.recipes.data-exports-description")}
        </BaseCardSectionTitle>
        <CardActions sx={{ mt: -2.5, mb: 0.5 }}>
          <BaseButton delete onClick={() => setPurgeExportsDialog(true)} />
        </CardActions>
        <Card>
          <GroupExportData exports={groupExports} />
        </Card>
      </Box>
    </Container>
  );
}
