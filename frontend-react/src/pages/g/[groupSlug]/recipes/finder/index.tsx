import { useEffect, useMemo, useRef, useState } from "react";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { useParams } from "react-router";
import { RecipeSuggestion } from "@/components/Domain/Recipe/RecipeSuggestion";
import { QueryFilterBuilder } from "@/components/Domain/QueryFilterBuilder";
import { SearchFilter } from "@/components/Domain/SearchFilter";
import { AppLoader } from "@/components/global/AppLoader";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BaseImg } from "@/components/global/BaseImg";
import { BaseNumberInput } from "@/components/global/BaseNumberInput";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { usePublicExploreApi, useUserApi } from "@/hooks/api";
import { useFoodStore, usePublicFoodStore, usePublicToolStore, useToolStore } from "@/hooks/store";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import type { FieldDefinition } from "@/hooks/use-query-filter-builder";
import { useRecipeFinderPreferences } from "@/hooks/use-users/preferences";
import { useDisplay, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { QueryFilterJSON } from "@/lib/api/types/non-generated";
import { Organizer } from "@/lib/api/types/non-generated";
import type { IngredientFood, RecipeSuggestionQuery, RecipeSuggestionResponseItem, RecipeTool } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { normalizeMissingItemLimit } from "@/lib/recipe/recipe-finder";

interface RecipeSuggestions {
  readyToMake: RecipeSuggestionResponseItem[];
  missingItems: RecipeSuggestionResponseItem[];
}

interface FinderSettings {
  maxMissingFoods: number;
  maxMissingTools: number;
  includeFoodsOnHand: boolean;
  includeToolsOnHand: boolean;
  includeSubstitutions: boolean;
  queryFilter: string;
  limit: number;
}

interface FinderQueryState {
  settings: FinderSettings;
  queryFilterJSON: QueryFilterJSON;
}

const hideOverflow = { display: "inline-block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" } as const;

// The page picks the user's or the public food/tool stores by `isOwnGroup`: remount it when that changes (log in /
// log out while it is shown) so the store hooks never switch in place.
export default function RecipeFinderPage() {
  const { isOwnGroup } = useLoggedInState();
  return <RecipeFinderPageContent key={String(isOwnGroup)} />;
}

function RecipeFinderPageContent() {
  const { t } = useI18n();
  const { smAndDown } = useDisplay();
  const auth = useMealieAuth();
  const params = useParams();

  usePageTitle(t("recipe-finder.recipe-finder"));

  const useMobile = smAndDown;

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const { isOwnGroup } = useLoggedInState();
  const userApi = useUserApi();
  const exploreApi = usePublicExploreApi(groupSlug).explore;
  const api = isOwnGroup ? userApi : exploreApi;

  const [preferences, setPreferences] = useRecipeFinderPreferences();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipesReady, setRecipesReady] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
  const [queryFilterMenu, setQueryFilterMenu] = useState(false);
  const [queryFilterMenuKey, setQueryFilterMenuKey] = useState(0);
  const [queryFilterEditorValue, setQueryFilterEditorValue] = useState("");
  const [queryFilterEditorValueJSON, setQueryFilterEditorValueJSON] = useState<QueryFilterJSON | undefined>({});

  // The settings and the query filter are saved to the stored preferences whenever they change (Vue: a deep watch).
  const [finder, setFinder] = useState<FinderQueryState>(() => ({
    queryFilterJSON: preferences.queryFilterJSON,
    settings: {
      maxMissingFoods: normalizeMissingItemLimit(preferences.maxMissingFoods),
      maxMissingTools: normalizeMissingItemLimit(preferences.maxMissingTools),
      includeFoodsOnHand: preferences.includeFoodsOnHand,
      includeToolsOnHand: preferences.includeToolsOnHand,
      includeSubstitutions: preferences.includeSubstitutions,
      queryFilter: preferences.queryFilter,
      limit: 20,
    },
  }));
  const finderRef = useRef(finder);
  const { settings, queryFilterJSON } = finder;

  function updateFinder(patch: { settings?: Partial<FinderSettings>; queryFilterJSON?: QueryFilterJSON }) {
    const current = finderRef.current;
    const next: FinderQueryState = {
      settings: patch.settings ? { ...current.settings, ...patch.settings } : current.settings,
      queryFilterJSON: patch.queryFilterJSON ?? current.queryFilterJSON,
    };
    finderRef.current = next;
    setFinder(next);
    setPreferences(prefs => ({
      ...prefs,
      queryFilter: next.settings.queryFilter,
      queryFilterJSON: next.queryFilterJSON,
      maxMissingFoods: next.settings.maxMissingFoods,
      maxMissingTools: next.settings.maxMissingTools,
      includeFoodsOnHand: next.settings.includeFoodsOnHand,
      includeToolsOnHand: next.settings.includeToolsOnHand,
      includeSubstitutions: next.settings.includeSubstitutions,
    }));
  }

  // the stores of the user's own group, or the public ones; the same hook sequence runs in both cases
  /* eslint-disable react-hooks/rules-of-hooks -- identical hook sequence; the page remounts when isOwnGroup changes */
  const foodStore = isOwnGroup ? useFoodStore() : usePublicFoodStore(groupSlug);
  const toolStore = isOwnGroup ? useToolStore() : usePublicToolStore(groupSlug);
  /* eslint-enable react-hooks/rules-of-hooks */
  const foods = foodStore.store;
  const tools = toolStore.store;

  const [selectedFoods, setSelectedFoods] = useState<IngredientFood[]>([]);
  const [selectedTools, setSelectedTools] = useState<RecipeTool[]>([]);

  function updateSelectedFoods(next: IngredientFood[]) {
    const sorted = [...next].sort((a, b) => (a.pluralName || a.name).localeCompare(b.pluralName || b.name));
    setSelectedFoods(sorted);
    setPreferences(prefs => ({ ...prefs, foodIds: sorted.map(food => food.id) }));
  }
  function addFood(food: IngredientFood) {
    updateSelectedFoods([...selectedFoods, food]);
  }
  function removeFood(food: IngredientFood) {
    updateSelectedFoods(selectedFoods.filter(f => f.id !== food.id));
  }

  function updateSelectedTools(next: RecipeTool[]) {
    const sorted = [...next].sort((a, b) => a.name.localeCompare(b.name));
    setSelectedTools(sorted);
    setPreferences(prefs => ({ ...prefs, toolIds: sorted.map(tool => tool.id) }));
  }
  function addTool(tool: RecipeTool) {
    updateSelectedTools([...selectedTools, tool]);
  }
  function removeTool(tool: RecipeTool) {
    updateSelectedTools(selectedTools.filter(t => t.id !== tool.id));
  }

  // On mount: a group the user does not belong to has no foods / tools on hand, then the stored selection is restored.
  const mounted = useRef({
    isOwnGroup,
    preferences,
    foods,
    tools,
    foodActions: foodStore.actions,
    toolActions: toolStore.actions,
    updateFinder,
    updateSelectedFoods,
    updateSelectedTools,
  });
  useEffect(() => {
    mounted.current = {
      isOwnGroup,
      preferences,
      foods,
      tools,
      foodActions: foodStore.actions,
      toolActions: toolStore.actions,
      updateFinder,
      updateSelectedFoods,
      updateSelectedTools,
    };
  });

  useEffect(() => {
    const start = mounted.current;
    if (!start.isOwnGroup && (finderRef.current.settings.includeFoodsOnHand || finderRef.current.settings.includeToolsOnHand)) {
      start.updateFinder({ settings: { includeFoodsOnHand: false, includeToolsOnHand: false } });
    }

    async function hydrateFoods() {
      const ids = start.preferences.foodIds;
      if (!ids.length) {
        return;
      }
      let items = start.foods;
      if (!items.length) {
        items = await start.foodActions.getAll();
      }

      const found = ids
        .map(foodId => items.find(food => food.id === foodId))
        .filter(food => !!food);

      mounted.current.updateSelectedFoods(found);
    }

    async function hydrateTools() {
      const ids = start.preferences.toolIds;
      if (!ids.length) {
        return;
      }
      let items = start.tools;
      if (!items.length) {
        items = await start.toolActions.getAll();
      }

      const found = ids
        .map(toolId => items.find(tool => tool.id === toolId))
        .filter(tool => !!tool);

      mounted.current.updateSelectedTools(found);
    }

    void Promise.all([hydrateFoods(), hydrateTools()]).then(() => {
      setReady(true);
      if (!start.preferences.foodIds.length) {
        setRecipesReady(true);
      }
    });
  }, []);

  const [recipeResponseItems, setRecipeResponseItems] = useState<RecipeSuggestionResponseItem[]>([]);
  const recipeSuggestions = useMemo<RecipeSuggestions>(() => {
    const readyToMake: RecipeSuggestionResponseItem[] = [];
    const missingItems: RecipeSuggestionResponseItem[] = [];
    recipeResponseItems.forEach((responseItem) => {
      if (responseItem.missingFoods.length === 0 && responseItem.missingTools.length === 0) {
        readyToMake.push(responseItem);
      }
      else {
        missingItems.push(responseItem);
      };
    });

    return {
      readyToMake,
      missingItems,
    };
  }, [recipeResponseItems]);

  // Search for suggestions 500 ms after the selection or the settings changed (not for the initial values)
  const searchDeps = [selectedFoods, selectedTools, settings];
  const lastSearchDeps = useRef(searchDeps);
  const requestId = useRef(0);
  useEffect(() => {
    if (lastSearchDeps.current.every((value, index) => Object.is(value, searchDeps[index]))) {
      return;
    }
    lastSearchDeps.current = searchDeps;

    const timer = setTimeout(() => {
      void (async () => {
        // don't search for suggestions if no filter are selected
        if (!selectedFoods.length && !selectedTools.length && !settings.queryFilter) {
          requestId.current++;
          setRecipeResponseItems([]);
          setRecipesReady(true);
          return;
        }

        const id = ++requestId.current;
        setLoading(true);
        const { data } = await api.recipes.getSuggestions(
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
        if (id !== requestId.current) {
          // a newer search has started
          return;
        }
        setLoading(false);
        if (!data) {
          return;
        }
        setRecipeResponseItems(data.items);
        setRecipesReady(true);
      })();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchDeps is built from exactly these values
  }, [selectedFoods, selectedTools, settings]);

  const queryFilterBuilderFields: FieldDefinition[] = [
    {
      name: "recipe_category.id",
      label: t("category.categories"),
      type: Organizer.Category,
    },
    {
      name: "tags.id",
      label: t("tag.tags"),
      type: Organizer.Tag,
    },
    {
      name: "recipe_ingredient.food.id",
      label: t("recipe.ingredients"),
      type: Organizer.Food,
    },
    {
      name: "recipe_ingredient.food.label_id",
      label: t("data-pages.foods.food-label"),
      type: Organizer.Label,
    },
    {
      name: "household_id",
      label: t("household.households"),
      type: Organizer.Household,
    },
    {
      name: "user_id",
      label: t("user.users"),
      type: Organizer.User,
    },
    {
      name: "last_made",
      label: t("general.last-made"),
      type: "relativeDate",
    },
    {
      name: "rating",
      label: t("general.rating"),
      type: "number",
    },
    {
      name: "total_time_seconds",
      label: t("recipe.total-time"),
      type: "duration",
    },
  ];

  function clearQueryFilter() {
    setQueryFilterEditorValue("");
    setQueryFilterEditorValueJSON({ parts: [] });
    updateFinder({ settings: { queryFilter: "" }, queryFilterJSON: { parts: [] } });
    setQueryFilterMenu(false);
    setQueryFilterMenuKey(key => key + 1);
  }

  function saveQueryFilter() {
    updateFinder({
      settings: { queryFilter: queryFilterEditorValue || "" },
      queryFilterJSON: queryFilterEditorValueJSON || { parts: [] },
    });
    setQueryFilterMenu(false);
  }

  const filterSx = useMobile ? { ml: 2, mb: 1 } : { mr: 2, mb: 1 };
  const rowJustify = useMobile ? "flex-end" : "flex-start";
  const filterParts = queryFilterJSON.parts || [];

  function chipRows<T extends { id: string }>(items: T[], label: (item: T) => string, onRemove: (item: T) => void) {
    return useMobile
      ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {items.map(item => (
              <Chip
                key={item.id}
                sx={{ m: 0.5, borderRadius: 1 }}
                color="accent"
                variant="filled"
                label={<span style={hideOverflow}>{label(item)}</span>}
                onDelete={() => onRemove(item)}
              />
            ))}
          </Box>
        )
      : (
          <>
            {items.map(item => (
              <Box key={item.id} sx={{ mb: 0.5 }}>
                <Chip
                  sx={{ borderRadius: 1 }}
                  color="accent"
                  variant="filled"
                  label={<span style={hideOverflow}>{label(item)}</span>}
                  onDelete={() => onRemove(item)}
                />
              </Box>
            ))}
          </>
        );
  }

  function suggestionList(items: RecipeSuggestionResponseItem[], suffix: string) {
    return items.map((item, idx) => (
      <Grid key={`${idx}-${suffix}`} size={12}>
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
    <Container>
      <Grid container>
        <Grid size={12} sx={{ display: "flex", justifyContent: "center" }}>
          <AppLoader waitingText={t("general.loading-recipes")} />
        </Grid>
      </Grid>
    </Container>
  );

  return (
    <Container>
      <BasePageTitle
        divider
        header={<BaseImg width={100} maxHeight={100} maxWidth={100} src="/svgs/manage-cookbooks.svg" />}
        title={t("recipe-finder.recipe-finder")}
        content={t("recipe-finder.recipe-finder-description")}
      />
      {ready
        ? (
            <Container>
              <Grid container spacing={2}>
                <Grid size={useMobile ? 12 : 3}>
                  <Container sx={{ m: 0, p: 0 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: rowJustify }}>
                      <Box sx={filterSx}>
                        <SearchFilter items={foods} value={selectedFoods} onChange={updateSelectedFoods}>
                          <MdiIcon path={icons.foods} sx={{ mr: 1 }} />
                          {t("general.foods")}
                        </SearchFilter>
                      </Box>
                      <Box sx={filterSx}>
                        <SearchFilter items={tools} value={selectedTools} onChange={updateSelectedTools}>
                          <MdiIcon path={icons.potSteam} sx={{ mr: 1 }} />
                          {t("tool.tools")}
                        </SearchFilter>
                      </Box>
                      <Box sx={filterSx}>
                        <Badge
                          badgeContent={filterParts.length}
                          invisible={filterParts.length === 0}
                          color="primary"
                        >
                          <Button
                            size="small"
                            variant="contained"
                            color="accent"
                            startIcon={<MdiIcon path={icons.filter} />}
                            onClick={() => setQueryFilterMenu(open => !open)}
                          >
                            {t("recipe-finder.other-filters")}
                          </Button>
                        </Badge>
                        <BaseDialog
                          open={queryFilterMenu}
                          onOpenChange={setQueryFilterMenu}
                          title={t("recipe-finder.other-filters")}
                          icon={icons.filter}
                          width="100%"
                          maxWidth="1100px"
                          submitDisabled={!queryFilterEditorValue}
                          canConfirm
                          onConfirm={saveQueryFilter}
                          customCardAction={(
                            <BaseButton color="error" type="submit" icon={icons.close} onClick={clearQueryFilter}>
                              {t("search.clear-selection")}
                            </BaseButton>
                          )}
                        >
                          <CardContent>
                            <QueryFilterBuilder
                              key={queryFilterMenuKey}
                              initialQueryFilter={queryFilterJSON}
                              fieldDefs={queryFilterBuilderFields}
                              onInput={value => setQueryFilterEditorValue(value ?? "")}
                              onInputJSON={setQueryFilterEditorValueJSON}
                            />
                          </CardContent>
                        </BaseDialog>
                      </Box>
                    </Box>
                    {/* Settings Menu */}
                    <Box sx={{ mb: 1, display: "flex", flexWrap: "wrap", justifyContent: rowJustify }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        aria-haspopup="dialog"
                        aria-expanded={settingsAnchor !== null}
                        startIcon={<MdiIcon path={icons.cog} />}
                        onClick={event => setSettingsAnchor(event.currentTarget)}
                      >
                        {t("general.settings")}
                      </Button>
                      <Popover
                        open={settingsAnchor !== null}
                        anchorEl={settingsAnchor}
                        onClose={() => setSettingsAnchor(null)}
                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                        slotProps={{ paper: { sx: { mt: 0.375 } } }}
                      >
                        <Card elevation={0}>
                          <CardContent>
                            <div>
                              <BaseNumberInput
                                value={settings.maxMissingFoods}
                                onChange={value => updateFinder({ settings: { maxMissingFoods: normalizeMissingItemLimit(value) } })}
                                precision={null}
                                min={0}
                                inset
                                hideDetails
                                label={t("recipe-finder.max-missing-ingredients")}
                              />
                              <BaseNumberInput
                                value={settings.maxMissingTools}
                                onChange={value => updateFinder({ settings: { maxMissingTools: normalizeMissingItemLimit(value) } })}
                                precision={null}
                                min={0}
                                inset
                                hideDetails
                                label={t("recipe-finder.max-missing-tools")}
                                sx={{ mt: 2 }}
                              />
                            </div>
                            <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column" }}>
                              {isOwnGroup && (
                                <FormControlLabel
                                  control={(
                                    <Checkbox
                                      size="small"
                                      checked={settings.includeFoodsOnHand}
                                      onChange={event => updateFinder({ settings: { includeFoodsOnHand: event.target.checked } })}
                                    />
                                  )}
                                  label={t("recipe-finder.include-ingredients-on-hand")}
                                />
                              )}
                              {isOwnGroup && (
                                <FormControlLabel
                                  control={(
                                    <Checkbox
                                      size="small"
                                      checked={settings.includeToolsOnHand}
                                      onChange={event => updateFinder({ settings: { includeToolsOnHand: event.target.checked } })}
                                    />
                                  )}
                                  label={t("recipe-finder.include-tools-on-hand")}
                                />
                              )}
                              <FormControlLabel
                                control={(
                                  <Checkbox
                                    size="small"
                                    checked={settings.includeSubstitutions}
                                    onChange={event => updateFinder({ settings: { includeSubstitutions: event.target.checked } })}
                                  />
                                )}
                                label={t("recipe-finder.include-substitutions")}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Popover>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ mt: 2.5 }}>
                      <Typography variant="h6" component="div" sx={{ m: 0, p: 0 }}>
                        {t("recipe-finder.selected-ingredients")}
                      </Typography>
                      <Container sx={{ m: 0, p: 0, maxHeight: "60vh", overflowY: "auto" }}>
                        {!selectedFoods.length && (
                          <Typography sx={{ m: 0, p: 0 }}>
                            {t("recipe-finder.no-ingredients-selected")}
                          </Typography>
                        )}
                        {chipRows(selectedFoods, food => food.pluralName || food.name, removeFood)}
                      </Container>
                    </Box>
                    {selectedTools.length > 0 && (
                      <Box sx={{ mt: 2.5 }}>
                        <Typography variant="h6" component="div" sx={{ m: 0, p: 0 }}>
                          {t("recipe-finder.selected-tools")}
                        </Typography>
                        <Container sx={{ m: 0, p: 0 }}>
                          {chipRows(selectedTools, tool => tool.name, removeTool)}
                        </Container>
                      </Box>
                    )}
                  </Container>
                </Grid>
                <Grid size={useMobile ? 12 : 9} sx={useMobile ? undefined : { maxHeight: "70vh", overflowY: "auto" }}>
                  {recipeSuggestions.readyToMake.length || recipeSuggestions.missingItems.length
                    ? (
                        <Container sx={{ m: 0, p: 0 }}>
                          {recipeSuggestions.readyToMake.length > 0 && (
                            <Grid container spacing={1}>
                              <Grid size={12}>
                                <Typography variant="h6" component="div" sx={{ m: 0, p: 0 }}>
                                  {t("recipe-finder.ready-to-make")}
                                </Typography>
                              </Grid>
                              {suggestionList(recipeSuggestions.readyToMake, "ready")}
                            </Grid>
                          )}
                          {recipeSuggestions.missingItems.length > 0 && (
                            <Grid container spacing={1}>
                              <Grid size={12}>
                                <Typography
                                  variant="h6"
                                  component="div"
                                  sx={recipeSuggestions.readyToMake.length ? { m: 0, p: 0, mt: 2.5 } : { m: 0, p: 0 }}
                                >
                                  {t("recipe-finder.almost-ready-to-make")}
                                </Typography>
                              </Grid>
                              {suggestionList(recipeSuggestions.missingItems, "missing")}
                            </Grid>
                          )}
                        </Container>
                      )
                    : !recipesReady
                        ? loader
                        : (
                            <Container>
                              <Grid container>
                                <Grid size={12} sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 0.5 }}>
                                  <Typography variant="h6" component="div" sx={{ m: 0, p: 0 }}>
                                    {t("recipe-finder.no-recipes-found")}
                                  </Typography>
                                  <Typography sx={{ m: 0, p: 0, textAlign: "center" }}>
                                    {t("recipe-finder.no-recipes-found-description")}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Container>
                          )}
                </Grid>
              </Grid>
            </Container>
          )
        : loader}
    </Container>
  );
}
