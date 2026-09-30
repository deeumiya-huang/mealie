import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { AppLoader } from "~/components/global/AppLoader";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { Icon } from "~/components/global/Icon";
import { NumberInput } from "~/components/global/form";
import { QueryFilterBuilder } from "~/components/Domain/QueryFilterBuilder";
import { RecipeSuggestion } from "~/components/Domain/Recipe/RecipeSuggestion";
import { SearchFilter } from "~/components/Domain/SearchFilter";
import { publicExploreApi, useUserApi } from "~/hooks/api";
import { useFoodStoreFor, useToolStoreFor } from "~/hooks/store";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import type { FieldDefinition } from "~/hooks/use-query-filter-builder";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { useRecipeFinderPreferences } from "~/hooks/use-users/preferences";
import { icons } from "~/lib/icons";
import { normalizeMissingItemLimit } from "~/lib/recipe/recipe-finder";
import { Organizer } from "~/lib/api/types/non-generated";
import type { QueryFilterJSON } from "~/lib/api/types/non-generated";
import type { IngredientFood, RecipeSuggestionQuery, RecipeSuggestionResponseItem, RecipeTool } from "~/lib/api/types/recipe";

interface FinderSettings {
  maxMissingFoods: number;
  maxMissingTools: number;
  includeFoodsOnHand: boolean;
  includeToolsOnHand: boolean;
  includeSubstitutions: boolean;
  queryFilter: string;
  limit: number;
}

const sortFoods = (foods: IngredientFood[]) => [...foods].sort((a, b) => (a.pluralName || a.name).localeCompare(b.pluralName || b.name));
const sortTools = (tools: RecipeTool[]) => [...tools].sort((a, b) => a.name.localeCompare(b.name));

export default function RecipeFinderPage() {
  const display = useDisplay();
  const i18n = useI18n();
  const auth = useMealieAuth();
  const params = useParams();

  useSeoMeta({ title: i18n.t("recipe-finder.recipe-finder") });

  const useMobile = display.smAndDown;

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const { isOwnGroup } = useLoggedInState();
  const userApi = useUserApi();
  const api = isOwnGroup ? userApi : publicExploreApi(groupSlug).explore;

  const [preferences, setPreferences] = useRecipeFinderPreferences();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipesReady, setRecipesReady] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
  const [queryFilterMenu, setQueryFilterMenu] = useState(false);
  const [queryFilterMenuKey, setQueryFilterMenuKey] = useState(0);
  const [queryFilterEditorValue, setQueryFilterEditorValue] = useState("");
  const [queryFilterEditorValueJSON, setQueryFilterEditorValueJSON] = useState<QueryFilterJSON | undefined>(undefined);
  const [queryFilterJSON, setQueryFilterJSON] = useState<QueryFilterJSON>(preferences.queryFilterJSON);
  const [settings, setSettings] = useState<FinderSettings>(() => ({
    maxMissingFoods: normalizeMissingItemLimit(preferences.maxMissingFoods),
    maxMissingTools: normalizeMissingItemLimit(preferences.maxMissingTools),
    // on-hand foods and tools only apply to the user's own group
    includeFoodsOnHand: isOwnGroup ? preferences.includeFoodsOnHand : false,
    includeToolsOnHand: isOwnGroup ? preferences.includeToolsOnHand : false,
    includeSubstitutions: preferences.includeSubstitutions,
    queryFilter: preferences.queryFilter,
    limit: 20,
  }));
  const updateSettings = (patch: Partial<FinderSettings>) => setSettings(prev => ({ ...prev, ...patch }));

  const foodStore = useFoodStoreFor(isOwnGroup, groupSlug);
  const toolStore = useToolStoreFor(isOwnGroup, groupSlug);
  const foods = foodStore.store;
  const tools = toolStore.store;
  const [selectedFoods, setSelectedFoodsState] = useState<IngredientFood[]>([]);
  const [selectedTools, setSelectedToolsState] = useState<RecipeTool[]>([]);

  const setSelectedFoods = (value: IngredientFood[]) => setSelectedFoodsState(sortFoods(value));
  const setSelectedTools = (value: RecipeTool[]) => setSelectedToolsState(sortTools(value));
  const addFood = (food: IngredientFood) => setSelectedFoodsState(prev => sortFoods([...prev, food]));
  const removeFood = (food: IngredientFood) => setSelectedFoodsState(prev => prev.filter(f => f.id !== food.id));
  const addTool = (tool: RecipeTool) => setSelectedToolsState(prev => sortTools([...prev, tool]));
  const removeTool = (tool: RecipeTool) => setSelectedToolsState(prev => prev.filter(t => t.id !== tool.id));

  // Persist the finder state
  useEffect(() => {
    if (!ready) return;
    setPreferences(prev => ({
      ...prev,
      foodIds: selectedFoods.map(food => food.id),
      toolIds: selectedTools.map(tool => tool.id),
      queryFilter: settings.queryFilter,
      queryFilterJSON,
      maxMissingFoods: settings.maxMissingFoods,
      maxMissingTools: settings.maxMissingTools,
      includeFoodsOnHand: settings.includeFoodsOnHand,
      includeToolsOnHand: settings.includeToolsOnHand,
      includeSubstitutions: settings.includeSubstitutions,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setPreferences is a storage setter
  }, [ready, selectedFoods, selectedTools, settings, queryFilterJSON]);

  // Restore the previously selected foods and tools
  useEffect(() => {
    let active = true;
    async function hydrate<T extends { id: string }>(ids: string[], store: { actions: { getItems(): T[]; refresh(): Promise<void> } }) {
      if (!ids.length) {
        return [];
      }
      if (!store.actions.getItems().length) {
        await store.actions.refresh();
      }
      const items = store.actions.getItems();
      return ids.map(id => items.find(item => item.id === id)).filter((item): item is T => !!item);
    }

    void (async () => {
      const [hydratedFoods, hydratedTools] = await Promise.all([
        hydrate<IngredientFood>(preferences.foodIds, foodStore),
        hydrate<RecipeTool>(preferences.toolIds, toolStore),
      ]);
      if (!active) return;
      setSelectedFoods(hydratedFoods);
      setSelectedTools(hydratedTools);
      setReady(true);
      if (!hydratedFoods.length) {
        setRecipesReady(true);
      }
    })();
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount
  }, []);

  const [recipeResponseItems, setRecipeResponseItems] = useState<RecipeSuggestionResponseItem[]>([]);
  const recipeSuggestions = useMemo(() => {
    const readyToMake: RecipeSuggestionResponseItem[] = [];
    const missingItems: RecipeSuggestionResponseItem[] = [];
    recipeResponseItems.forEach((responseItem) => {
      if (responseItem.missingFoods.length === 0 && responseItem.missingTools.length === 0) {
        readyToMake.push(responseItem);
      }
      else {
        missingItems.push(responseItem);
      }
    });
    return { readyToMake, missingItems };
  }, [recipeResponseItems]);

  // Debounced suggestion search
  const apiRef = useRef(api);
  apiRef.current = api;
  const skipFirst = useRef(true);
  useEffect(() => {
    // watchDebounced does not fire for the initial values
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      // don't search for suggestions if no filter are selected
      if (!selectedFoods.length && !selectedTools.length && !settings.queryFilter) {
        setRecipeResponseItems([]);
        setRecipesReady(true);
        return;
      }

      setLoading(true);
      const { data } = await apiRef.current.recipes.getSuggestions(
        {
          limit: settings.limit,
          queryFilter: settings.queryFilter,
          maxMissingFoods: settings.maxMissingFoods,
          maxMissingTools: settings.maxMissingTools,
          includeFoodsOnHand: settings.includeFoodsOnHand,
          includeToolsOnHand: settings.includeToolsOnHand,
          includeSubstitutions: settings.includeSubstitutions,
        } as RecipeSuggestionQuery,
        selectedFoods.map(food => food.id),
        selectedTools.map(tool => tool.id),
      );
      if (!active) return;
      setLoading(false);
      if (!data) {
        return;
      }
      setRecipeResponseItems(data.items);
      setRecipesReady(true);
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedFoods, selectedTools, settings]);

  const queryFilterBuilderFields = useMemo<FieldDefinition[]>(() => [
    { name: "recipe_category.id", label: i18n.t("category.categories"), type: Organizer.Category },
    { name: "tags.id", label: i18n.t("tag.tags"), type: Organizer.Tag },
    { name: "recipe_ingredient.food.id", label: i18n.t("recipe.ingredients"), type: Organizer.Food },
    { name: "recipe_ingredient.food.label_id", label: i18n.t("data-pages.foods.food-label"), type: Organizer.Label },
    { name: "household_id", label: i18n.t("household.households"), type: Organizer.Household },
    { name: "user_id", label: i18n.t("user.users"), type: Organizer.User },
    { name: "last_made", label: i18n.t("general.last-made"), type: "relativeDate" },
    { name: "rating", label: i18n.t("general.rating"), type: "number" },
    { name: "total_time_seconds", label: i18n.t("recipe.total-time"), type: "duration" },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- labels follow the locale
  ], [i18n.locale]);

  function clearQueryFilter() {
    setQueryFilterEditorValue("");
    setQueryFilterEditorValueJSON({ parts: [] });
    updateSettings({ queryFilter: "" });
    setQueryFilterJSON({ parts: [] });
    setQueryFilterMenu(false);
    setQueryFilterMenuKey(k => k + 1);
  }

  function saveQueryFilter() {
    updateSettings({ queryFilter: queryFilterEditorValue || "" });
    setQueryFilterJSON(queryFilterEditorValueJSON || { parts: [] });
    setQueryFilterMenu(false);
  }

  const flexRow = { display: "flex", flexWrap: "wrap", justifyContent: useMobile ? "flex-end" : "flex-start" } as const;
  const filterSx = useMobile ? { ml: 2, mb: 1 } : { mr: 2, mb: 1 };
  const filterCount = (queryFilterJSON.parts || []).length;

  function selectedChips<T extends { id: string }>(items: T[], label: (item: T) => string, onRemove: (item: T) => void) {
    const chip = (item: T, sx: object) => (
      <Chip
        key={item.id}
        color="accent"
        sx={{ borderRadius: 1, maxWidth: "100%", ...sx }}
        label={<span className="text-hide-overflow">{label(item)}</span>}
        onDelete={() => onRemove(item)}
      />
    );
    if (useMobile) {
      return <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end" }}>{items.map(item => chip(item, { m: 0.5 }))}</Box>;
    }
    return items.map(item => <Box key={item.id} sx={{ mb: 0.5 }}>{chip(item, {})}</Box>);
  }

  function suggestionList(items: RecipeSuggestionResponseItem[], key: string) {
    return items.map((item, idx) => (
      <Grid key={`${idx}-${key}`} size={12}>
        <RecipeSuggestion
          recipe={item.recipe}
          missingFoods={item.missingFoods}
          missingTools={item.missingTools}
          substitutedFoods={item.substitutedFoods}
          disableCheckbox={loading}
          onAddFood={addFood}
          onRemoveFood={removeFood}
          onAddTool={addTool}
          onRemoveTool={removeTool}
        />
      </Grid>
    ));
  }

  const loader = (
    <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
      <AppLoader waitingText={i18n.t("general.loading-recipes")} />
    </Box>
  );

  return (
    <BaseContainer>
      <BasePageTitle
        divider
        header={<BasePageTitleImage src="/svgs/manage-cookbooks.svg" maxWidth={100} maxHeight={100} />}
        title={i18n.t("recipe-finder.recipe-finder")}
        content={i18n.t("recipe-finder.recipe-finder-description")}
      />
      {!ready
        ? loader
        : (
            <Grid container spacing={3} sx={{ py: 2 }}>
              <Grid size={useMobile ? 12 : 3}>
                <Box sx={flexRow}>
                  <Box sx={filterSx}>
                    <SearchFilter value={selectedFoods} items={foods} onChange={setSelectedFoods}>
                      <Icon path={icons.foods} start />
                      {i18n.t("general.foods")}
                    </SearchFilter>
                  </Box>
                  <Box sx={filterSx}>
                    <SearchFilter value={selectedTools} items={tools} onChange={setSelectedTools}>
                      <Icon path={icons.potSteam} start />
                      {i18n.t("tool.tools")}
                    </SearchFilter>
                  </Box>
                  <Box sx={filterSx}>
                    <Badge badgeContent={filterCount} color="primary" invisible={!filterCount}>
                      <Button
                        size="small"
                        variant="contained"
                        color="accent"
                        startIcon={<Icon path={icons.filter} />}
                        onClick={() => setQueryFilterMenu(!queryFilterMenu)}
                      >
                        {i18n.t("recipe-finder.other-filters")}
                      </Button>
                    </Badge>
                    <BaseDialog
                      open={queryFilterMenu}
                      onOpenChange={setQueryFilterMenu}
                      title={i18n.t("recipe-finder.other-filters")}
                      icon={icons.filter}
                      width="100%"
                      maxWidth="1100px"
                      submitDisabled={!queryFilterEditorValue}
                      canConfirm
                      onConfirm={saveQueryFilter}
                      customCardAction={(
                        <BaseButton color="error" icon={icons.close} onClick={clearQueryFilter}>
                          {i18n.t("search.clear-selection")}
                        </BaseButton>
                      )}
                    >
                      <Box sx={{ px: 2 }}>
                        <QueryFilterBuilder
                          key={queryFilterMenuKey}
                          initialQueryFilter={queryFilterJSON}
                          fieldDefs={queryFilterBuilderFields}
                          onInput={value => setQueryFilterEditorValue(value || "")}
                          onInputJSON={value => setQueryFilterEditorValueJSON(value)}
                        />
                      </Box>
                    </BaseDialog>
                  </Box>
                </Box>

                {/* Settings Menu */}
                <Box sx={{ ...flexRow, mb: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={<Icon path={icons.cog} />}
                    onClick={e => setSettingsAnchor(e.currentTarget)}
                  >
                    {i18n.t("general.settings")}
                  </Button>
                  <Popover
                    open={!!settingsAnchor}
                    anchorEl={settingsAnchor}
                    onClose={() => setSettingsAnchor(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    slotProps={{ paper: { sx: { mt: 0.5 } } }}
                  >
                    <Card>
                      <CardContent>
                        <NumberInput
                          value={settings.maxMissingFoods}
                          min={0}
                          hideDetails
                          label={i18n.t("recipe-finder.max-missing-ingredients")}
                          onChange={v => updateSettings({ maxMissingFoods: normalizeMissingItemLimit(v) })}
                        />
                        <NumberInput
                          value={settings.maxMissingTools}
                          min={0}
                          hideDetails
                          label={i18n.t("recipe-finder.max-missing-tools")}
                          sx={{ mt: 2 }}
                          onChange={v => updateSettings({ maxMissingTools: normalizeMissingItemLimit(v) })}
                        />
                        <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column" }}>
                          {isOwnGroup && (
                            <FormControlLabel
                              control={<Checkbox size="small" checked={settings.includeFoodsOnHand} onChange={e => updateSettings({ includeFoodsOnHand: e.target.checked })} />}
                              label={i18n.t("recipe-finder.include-ingredients-on-hand")}
                            />
                          )}
                          {isOwnGroup && (
                            <FormControlLabel
                              control={<Checkbox size="small" checked={settings.includeToolsOnHand} onChange={e => updateSettings({ includeToolsOnHand: e.target.checked })} />}
                              label={i18n.t("recipe-finder.include-tools-on-hand")}
                            />
                          )}
                          <FormControlLabel
                            control={<Checkbox size="small" checked={settings.includeSubstitutions} onChange={e => updateSettings({ includeSubstitutions: e.target.checked })} />}
                            label={i18n.t("recipe-finder.include-substitutions")}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Popover>
                </Box>
                <Divider sx={{ my: 1 }} />

                <Box sx={{ mt: 2.5 }}>
                  <Typography variant="h6">{i18n.t("recipe-finder.selected-ingredients")}</Typography>
                  <Box sx={{ maxHeight: "60vh", overflowY: "auto" }}>
                    {!selectedFoods.length && <Typography variant="body2">{i18n.t("recipe-finder.no-ingredients-selected")}</Typography>}
                    {selectedChips(selectedFoods, food => food.pluralName || food.name, removeFood)}
                  </Box>
                </Box>
                {!!selectedTools.length && (
                  <Box sx={{ mt: 2.5 }}>
                    <Typography variant="h6">{i18n.t("recipe-finder.selected-tools")}</Typography>
                    {selectedChips(selectedTools, tool => tool.name, removeTool)}
                  </Box>
                )}
              </Grid>

              <Grid size={useMobile ? 12 : 9} sx={useMobile ? undefined : { maxHeight: "70vh", overflowY: "auto" }}>
                {recipeSuggestions.readyToMake.length || recipeSuggestions.missingItems.length
                  ? (
                      <>
                        {!!recipeSuggestions.readyToMake.length && (
                          <Grid container spacing={1}>
                            <Grid size={12}>
                              <Typography variant="h6">{i18n.t("recipe-finder.ready-to-make")}</Typography>
                            </Grid>
                            {suggestionList(recipeSuggestions.readyToMake, "ready")}
                          </Grid>
                        )}
                        {!!recipeSuggestions.missingItems.length && (
                          <Grid container spacing={1} sx={recipeSuggestions.readyToMake.length ? { mt: 2.5 } : undefined}>
                            <Grid size={12}>
                              <Typography variant="h6">{i18n.t("recipe-finder.almost-ready-to-make")}</Typography>
                            </Grid>
                            {suggestionList(recipeSuggestions.missingItems, "missing")}
                          </Grid>
                        )}
                      </>
                    )
                  : !recipesReady
                      ? loader
                      : (
                          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 0.5, p: 2 }}>
                            <Typography variant="h6">{i18n.t("recipe-finder.no-recipes-found")}</Typography>
                            <Typography variant="body2" sx={{ textAlign: "center" }}>{i18n.t("recipe-finder.no-recipes-found-description")}</Typography>
                          </Box>
                        )}
              </Grid>
            </Grid>
          )}
    </BaseContainer>
  );
}
