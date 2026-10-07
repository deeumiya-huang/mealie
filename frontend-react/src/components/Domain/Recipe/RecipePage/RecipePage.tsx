// Usage: <RecipePage recipe={recipe} onRecipeChange={update} /> — the recipe page: info card and actions, the edit form
// (or the JSON editor), ingredients and tools, steps, organizers, notes, comments and the print layout; cook mode
// shows ingredients and steps side by side. Owns the page mode (view / edit / cook, synced with ?edit, ?parse and
// ?cook), saving, deleting, the unsaved-changes prompt and the parse dialog.
// (Vue `v-model` → `recipe` + `onRecipeChange`, which takes a recipe or an updater.)
import { useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { useBlocker, useNavigate, useParams } from "react-router";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Fab from "@mui/material/Fab";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Mode } from "vanilla-jsoneditor";
import { RecipeDialogBulkAdd } from "@/components/Domain/Recipe/RecipeDialogBulkAdd";
import { RecipeIngredients } from "@/components/Domain/Recipe/RecipeIngredients";
import { RecipeNotes } from "@/components/Domain/Recipe/RecipeNotes";
import { RecipePrintContainer } from "@/components/Domain/Recipe/RecipePrintContainer";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { RecipeJsonEditor } from "@/components/global/RecipeJsonEditor";
import { WakelockSwitch } from "@/components/global/WakelockSwitch";
import { useUserApi } from "@/hooks/api";
import { clearPageState, PageMode, usePageState } from "@/hooks/recipe-page/shared-state";
import { useCookModeQuery, type BooleanString } from "@/hooks/recipe-page/use-cook-mode-query";
import { useUnitConversion, useUnitSystem } from "@/hooks/recipes";
import { useHouseholdSelf } from "@/hooks/use-households";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useNavigationWarning } from "@/hooks/use-navigation-warning";
import { useRouteQuery } from "@/hooks/use-router";
import { deepCopy, uuid4 } from "@/hooks/use-utils";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { NoUndefinedField } from "@/lib/api/types/non-generated";
import type { Recipe, RecipeAsset, RecipeCategory, RecipeIngredient, RecipeStep, RecipeTag, RecipeTool } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { applyUpdate, asModel, type RecipeChange, type RecipeModel } from "./recipe-model";
import { RecipePageComments } from "./RecipePageParts/RecipePageComments";
import { RecipePageEditorToolbar } from "./RecipePageParts/RecipePageEditorToolbar";
import { RecipePageFooter } from "./RecipePageParts/RecipePageFooter";
import { RecipePageHeader } from "./RecipePageParts/RecipePageHeader";
import { RecipePageInfoEditor } from "./RecipePageParts/RecipePageInfoEditor";
import { RecipePageIngredientEditor } from "./RecipePageParts/RecipePageIngredientEditor";
import { RecipePageIngredientToolsView } from "./RecipePageParts/RecipePageIngredientToolsView";
import { RecipePageInstructions } from "./RecipePageParts/RecipePageInstructions";
import { RecipePageOrganizers } from "./RecipePageParts/RecipePageOrganizers";
import { RecipePageScale } from "./RecipePageParts/RecipePageScale";
import { RecipePageParseDialog } from "./RecipePageParts/RecipeParseDialog/RecipePageParseDialog";

interface RecipePageProps {
  recipe: RecipeModel;
  onRecipeChange: RecipeChange;
}

export function RecipePage({ recipe, onRecipeChange }: RecipePageProps) {
  const { t } = useI18n();
  const display = useDisplay();
  const auth = useMealieAuth();
  const params = useParams();
  const { isOwnGroup } = useLoggedInState();

  const { household } = useHouseholdSelf();

  const disableComments = household?.preferences?.recipeDisableComments
    || recipe?.settings?.disableComments
    || false;

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const ingredientStorageKey = `recipe-ingredients:${recipe.id || recipe.slug}:checked`;

  const navigate = useNavigate();
  const api = useUserApi();
  const { pageMode, setMode, isEditForm, isEditJSON, isCookMode, isEditMode, isParsing, toggleCookMode, toggleIsParsing }
    = usePageState(recipe.slug);
  const { deactivateNavigationWarning } = useNavigationWarning();
  const [scale, setScale] = useState(1);

  const { unitSystem } = useUnitSystem();
  const { convertIngredient } = useUnitConversion();

  /**
   * The recipe as the reader asked to see it — the recipe itself unless they've opted into a unit
   * system. Cook mode, print and the ingredient list all read this, so they convert together.
   *
   * Returns `recipe` by identity whenever nothing is being converted, and always does so in edit
   * mode, so the editors below always edit the recipe itself. Conversion is display-only and never
   * reaches anything that saves.
   */
  const displayedRecipe = useMemo<RecipeModel>(() => {
    if (isEditMode || !unitSystem) {
      return recipe;
    }

    return {
      ...recipe,
      recipeIngredient: recipe.recipeIngredient.map(
        ingredient => asModel(convertIngredient(ingredient, unitSystem, scale)),
      ),
    };
  }, [isEditMode, unitSystem, recipe, convertIngredient, scale]);

  const notLinkedIngredients = displayedRecipe.recipeIngredient.filter((ingredient) => {
    return !recipe.recipeInstructions.some(step =>
      step.ingredientReferences?.map(ref => ref.referenceId).includes(ingredient.referenceId),
    );
  });

  /** =============================================================
   * Floating save button — track toolbar visibility
   */
  const recipeToolbar = useRef<HTMLDivElement>(null);
  const [toolbarVisible, setToolbarVisible] = useState(true);

  useEffect(() => {
    const el = recipeToolbar.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const toolbarObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry) setToolbarVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );
    toolbarObserver.observe(el);
    return () => toolbarObserver.disconnect();
  }, []);

  /** =============================================================
   * Recipe Snapshot on Mount
   * this is used to determine if the recipe has been changed since the last save
   * and prompts the user to save if they have unsaved changes.
   */
  const originalRecipe = useRef<Recipe | null>(null);
  const [discardDialog, setDiscardDialog] = useState(false);
  // the latest values, for the navigation blocker and the async save (which run between renders)
  const latest = useRef({ recipe, isEditMode });
  useEffect(() => {
    latest.current = { recipe, isEditMode };
  });

  useEffect(() => {
    originalRecipe.current = deepCopy(latest.current.recipe);
  }, []);

  function hasUnsavedChanges(): boolean {
    if (originalRecipe.current === null) {
      return false;
    }
    return JSON.stringify(latest.current.recipe) !== JSON.stringify(originalRecipe.current);
  }

  function restoreOriginalRecipe() {
    if (originalRecipe.current) {
      const restored = deepCopy(originalRecipe.current) as NoUndefinedField<Recipe>;
      latest.current = { ...latest.current, recipe: restored };
      onRecipeChange(restored);
    }
  }

  // Vue: onBeforeRouteLeave — only leaving the page (not a query change) asks to discard unsaved edits
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    currentLocation.pathname !== nextLocation.pathname
    && latest.current.isEditMode
    && hasUnsavedChanges(),
  );
  const pendingRoute = blocker.state === "blocked";

  function closeEditor() {
    if (hasUnsavedChanges()) {
      setDiscardDialog(true);
    }
    else {
      setMode(PageMode.VIEW);
    }
  }

  function confirmDiscard() {
    restoreOriginalRecipe();
    setDiscardDialog(false);

    if (blocker.state === "blocked") {
      blocker.proceed();
    }
    else {
      setMode(PageMode.VIEW);
    }
  }

  function cancelDiscard() {
    setDiscardDialog(false);
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }

  // Vue: onUnmounted(() => { deactivateNavigationWarning(); clearPageState(recipe.slug) }); the clear waits a tick
  // so a StrictMode remount keeps its state
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    const slug = latest.current.recipe.slug || "";
    return () => {
      alive.current = false;
      deactivateNavigationWarning();
      setTimeout(() => {
        if (!alive.current) {
          clearPageState(slug);
        }
      }, 0);
    };
  }, [deactivateNavigationWarning]);

  const hasLinkedIngredients = recipe.recipeInstructions.some(
    step => step.ingredientReferences && step.ingredientReferences.length > 0,
  );

  /** =============================================================
   * Set State onMounted
   */

  const [paramsEdit, setParamsEdit] = useRouteQuery<BooleanString>("edit", "");
  const [paramsParse, setParamsParse] = useRouteQuery<BooleanString>("parse", "");
  const [paramsCook, setParamsCook] = useRouteQuery<BooleanString>("cook", "");
  const { hydrateCookMode } = useCookModeQuery({
    cookQuery: paramsCook ?? undefined,
    setCookQuery: value => setParamsCook(value ?? null),
    isEditMode,
    pageMode,
    setMode,
  });

  useEffect(() => {
    const enterEdit = paramsEdit === "true" && isOwnGroup;
    if (enterEdit) {
      setMode(PageMode.EDIT);
    }

    if (paramsParse === "true" && isOwnGroup) {
      toggleIsParsing(true);
    }

    hydrateCookMode(enterEdit ? { isEditMode: true, pageMode: PageMode.EDIT } : undefined);
    // runs on mount only, like onMounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When set, the isEditMode watcher skips its URL cleanup because saveRecipe
  // is navigating to a new slug that naturally omits ?edit=true.
  const isNavigatingAfterRename = useRef(false);

  const prevEditMode = useRef(isEditMode);
  useEffect(() => {
    if (prevEditMode.current === isEditMode) {
      return;
    }
    prevEditMode.current = isEditMode;
    if (!isEditMode) {
      if (isNavigatingAfterRename.current) {
        isNavigatingAfterRename.current = false;
        return;
      }
      setParamsEdit(null);
    }
  }, [isEditMode, setParamsEdit]);

  const prevParsing = useRef(isParsing);
  useEffect(() => {
    if (prevParsing.current === isParsing) {
      return;
    }
    prevParsing.current = isParsing;
    if (!isParsing) {
      setParamsParse(null);
    }
  }, [isParsing, setParamsParse]);

  /** =============================================================
   * Recipe Save Delete
   */

  async function saveRecipe() {
    const routeSlug = params.slug || "";
    const { data, error } = await api.recipes.updateOne(routeSlug, latest.current.recipe);
    if (!error) {
      if (data?.slug && data.slug !== routeSlug) {
        isNavigatingAfterRename.current = true;
      }
      setMode(PageMode.VIEW);
    }
    if (data?.slug) {
      const saved = data as NoUndefinedField<Recipe>;
      latest.current = { recipe: saved, isEditMode: false };
      onRecipeChange(saved);
      originalRecipe.current = deepCopy(saved);
      if (data.slug !== routeSlug) {
        void navigate(`/g/${groupSlug}/r/` + data.slug, { replace: true });
      }
    }
  }

  async function saveParsedIngredients(ingredients: NoUndefinedField<RecipeIngredient[]>) {
    const returnToEdit = isEditMode;
    const updated = { ...latest.current.recipe, recipeIngredient: ingredients };
    latest.current = { ...latest.current, recipe: updated };
    onRecipeChange(updated);
    await saveRecipe();
    toggleIsParsing(false);
    if (returnToEdit) {
      setMode(PageMode.EDIT);
    }
  }

  async function deleteRecipe() {
    const { data } = await api.recipes.deleteOne(recipe.slug);
    if (data?.slug) {
      void navigate(`/g/${groupSlug}`);
    }
  }

  /** =============================================================
   * View Preferences
   */
  const preferLandscape = recipe.settings?.landscapeView;
  const smallScreen = !display.smAndUp;
  const landscape = !!preferLandscape || smallScreen;

  /** =============================================================
   * Bulk Step Editor
   */

  function addStep(steps: Array<string> | null = null) {
    if (!recipe.recipeInstructions) {
      return;
    }

    const newSteps: RecipeStep[] = steps
      ? steps.map((step) => {
          return { id: uuid4(), text: step, title: "", summary: "", ingredientReferences: [], noteReferences: [] };
        })
      : [{
          id: uuid4(),
          text: "",
          title: "",
          summary: "",
          ingredientReferences: [],
          noteReferences: [],
        }];

    onRecipeChange(prev => ({ ...prev, recipeInstructions: [...prev.recipeInstructions, ...asModel(newSteps)] }));
  }

  /** =============================================================
   * RecipeChip Clicked
   */

  function chipClicked(item: RecipeTag | RecipeCategory | RecipeTool, itemType: string) {
    if (!item.id) {
      return;
    }
    void navigate(`/g/${groupSlug}?${itemType}=${item.id}`);
  }

  const setInstructions = (update: SetStateAction<RecipeStep[]>) =>
    onRecipeChange(prev => ({ ...prev, recipeInstructions: asModel(applyUpdate(update, prev.recipeInstructions as RecipeStep[])) }));
  const setAssets = (update: SetStateAction<RecipeAsset[]>) =>
    onRecipeChange(prev => ({ ...prev, assets: asModel(applyUpdate(update, (prev.assets ?? []) as RecipeAsset[])) }));

  const instructions = () => (
    <RecipePageInstructions
      value={recipe.recipeInstructions}
      onChange={setInstructions}
      assets={recipe.assets ?? []}
      onAssetsChange={setAssets}
      recipe={displayedRecipe}
      scale={scale}
      ingredientStorageKey={ingredientStorageKey}
    />
  );

  return (
    <div>
      <BaseDialog
        open={discardDialog || pendingRoute}
        onOpenChange={(open) => {
          if (!open) setDiscardDialog(false);
        }}
        bottomSheet
        title={t("general.discard-changes")}
        color="warning"
        icon={icons.alertCircle}
        canConfirm
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      >
        <CardContent>
          {t("general.discard-changes-description")}
        </CardContent>
      </BaseDialog>
      <RecipePageParseDialog
        open={isParsing}
        ingredients={recipe.recipeIngredient}
        width={display.smAndDown ? "100%" : "80%"}
        onOpenChange={toggleIsParsing}
        onSave={ingredients => void saveParsedIngredients(ingredients)}
      />
      <Container
        key="recipe-page"
        maxWidth={false}
        sx={{ display: isCookMode ? "none" : undefined, px: 0, ...(display.smAndDown ? { p: 0 } : {}) }}
      >
        <Card elevation={0} sx={{ displayPrint: "none" }}>
          <RecipePageHeader
            ref={recipeToolbar}
            recipe={recipe}
            recipeScale={scale}
            landscape={landscape}
            onSave={() => void saveRecipe()}
            onDelete={() => void deleteRecipe()}
            onClose={closeEditor}
          />
          {isEditJSON
            ? (
                <Box sx={{ mt: 10 }}>
                  <RecipeJsonEditor
                    value={recipe}
                    onChange={value => onRecipeChange(value as RecipeModel)}
                    mode={Mode.text}
                    mainMenuBar={false}
                  />
                </Box>
              )
            : (
                <CardContent>
                  {/*
                    This is where most of the main content is rendered. Some components include state for both Edit and View modes
                    which is why some have explicit conditions and others use the page state to determine and manage
                    the shared state internally.

                    The recipe lives in the page's state; every part gets it with `onChange`, which takes a new recipe or an
                    updater of the previous one (Vue mutated one shared object in place).
                  */}
                  <div>
                    {isEditMode && <RecipePageInfoEditor recipe={recipe} onChange={onRecipeChange} />}
                  </div>
                  <div>
                    {isEditForm && <RecipePageEditorToolbar recipe={recipe} onChange={onRecipeChange} />}
                  </div>
                  <div>
                    {isEditForm && <RecipePageIngredientEditor recipe={recipe} onChange={onRecipeChange} />}
                  </div>
                  <div>
                    <RecipePageScale value={scale} onChange={setScale} recipe={recipe} />
                  </div>

                  {/*
                    This section contains the 2 column layout for the recipe steps and other content.
                  */}
                  <Grid container spacing={3}>
                    {/*
                      The left column is conditionally rendered based on cook mode.
                    */}
                    {(!isCookMode || isEditForm) && (
                      <Grid
                        size={{ xs: 12, sm: 12, md: 4 }}
                        sx={display.mdAndUp ? { borderRight: 1, borderColor: "divider" } : undefined}
                      >
                        {!isEditForm && (
                          <RecipePageIngredientToolsView
                            recipe={displayedRecipe}
                            scale={scale}
                            ingredientStorageKey={ingredientStorageKey}
                            sx={{ pr: 1 }}
                          />
                        )}
                        {display.mdAndUp && (
                          <RecipePageOrganizers
                            recipe={recipe}
                            onChange={onRecipeChange}
                            sx={{ pr: 1 }}
                            onItemSelected={chipClicked}
                          />
                        )}
                      </Grid>
                    )}
                    {/*
                      the right column is always rendered, but it's layout width is determined by where the left column is
                      rendered.
                    */}
                    <Grid size={{ xs: 12, sm: 12, md: 8 + (isCookMode ? 1 : 0) * 4 }}>
                      {instructions()}
                      {isEditForm && (
                        <Box sx={{ display: "flex" }}>
                          <Box sx={{ ml: "auto", my: 1, mr: 0.5 }}>
                            <RecipeDialogBulkAdd onBulkData={addStep} />
                          </Box>
                          <Box sx={{ my: 1 }}>
                            <BaseButton onClick={() => addStep()}>
                              {t("general.add")}
                            </BaseButton>
                          </Box>
                        </Box>
                      )}
                      {!display.mdAndUp && (
                        <div>
                          <RecipePageOrganizers recipe={recipe} onChange={onRecipeChange} />
                        </div>
                      )}
                      <RecipeNotes
                        value={recipe.notes}
                        onChange={notes => onRecipeChange(prev => ({ ...prev, notes: asModel(notes) }))}
                        edit={isEditForm}
                      />
                    </Grid>
                  </Grid>
                  <RecipePageFooter recipe={recipe} onChange={onRecipeChange} />
                </CardContent>
              )}
        </Card>
        <WakelockSwitch />
        {!disableComments && !isEditForm && !isCookMode && (
          <RecipePageComments
            recipe={recipe}
            onChange={onRecipeChange}
            sx={{ px: 0.5, my: 2, displayPrint: "none" }}
          />
        )}
        <RecipePrintContainer recipe={displayedRecipe} scale={scale} />
      </Container>
      {/* Floating save button when toolbar scrolls out of view */}
      {isEditMode && !toolbarVisible && (
        <Tooltip title={t("general.save")} placement="left">
          <Fab
            color="success"
            size="large"
            sx={{ position: "fixed", right: 16, bottom: 16, zIndex: theme => theme.zIndex.speedDial, displayPrint: "none" }}
            onClick={() => void saveRecipe()}
          >
            <MdiIcon path={icons.save} />
          </Fab>
        </Tooltip>
      )}
      {/* Cook mode displayes two columns with ingredients and instructions side by side, each being scrolled individually, allowing to view both at the same time */}
      {/* The calc is to account for the navabar height (48px) */}
      {isCookMode && !hasLinkedIngredients && (
        <Paper
          key="cookmode"
          elevation={0}
          square
          sx={{ height: display.smAndUp ? "calc(100vh - 48px)" : "auto", overflow: "hidden" }}
        >
          {/* the calc is to account for the toolbar a more dynamic solution could be needed  */}
          <Grid container sx={{ height: "100%", overflow: "hidden" }}>
            <Grid size={{ xs: 12, sm: 5 }} sx={{ overflowY: "auto", pl: 2, pr: 1.5, py: 1, height: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <RecipePageScale value={scale} onChange={setScale} recipe={recipe} />
              </Box>
              {!isEditForm && (
                <RecipePageIngredientToolsView
                  recipe={displayedRecipe}
                  scale={scale}
                  isCookMode={isCookMode}
                  ingredientStorageKey={ingredientStorageKey}
                />
              )}
              <Divider />
            </Grid>
            <Grid
              size={{ xs: 12, sm: 7 }}
              sx={{ overflowY: "auto", py: display.smAndDown ? 1 : 3, height: "100%" }}
            >
              <Typography variant="h5" component="h2" sx={{ px: 2, fontWeight: 500, opacity: 0.8 }}>
                {t("recipe.instructions")}
              </Typography>
              <Box sx={{ overflowY: "hidden", px: 2 }}>
                {instructions()}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
      {isCookMode && hasLinkedIngredients && (
        <Paper elevation={0} square>
          <Box sx={{ mt: 1, px: { xs: 1, md: 2 } }}>
            <RecipePageScale value={scale} onChange={setScale} recipe={recipe} />
          </Box>
          <Box sx={{ overflowY: "hidden", mt: -2.5, px: { xs: 1, md: 2 } }}>
            {instructions()}
          </Box>

          {notLinkedIngredients.length > 0 && (
            <Box sx={{ px: { xs: 1, md: 2 }, pb: 2 }}>
              <Divider />
              <Card elevation={0}>
                <Typography variant="h6" component="div" sx={{ px: 2, pt: 2 }}>
                  {t("recipe.not-linked-ingredients")}
                </Typography>
                <RecipeIngredients
                  value={notLinkedIngredients}
                  scale={scale}
                  isCookMode={isCookMode}
                  storageKey={ingredientStorageKey}
                />
              </Card>
            </Box>
          )}
        </Paper>
      )}
      {isCookMode && (
        <IconButton
          aria-label={t("general.close")}
          sx={{
            "position": "fixed",
            "right": 12,
            "top": 60,
            "bgcolor": "primary.main",
            "color": "primary.contrastText",
            "boxShadow": 2,
            "&:hover": { bgcolor: "primary.dark" },
          }}
          onClick={() => toggleCookMode()}
        >
          <MdiIcon path={icons.close} />
        </IconButton>
      )}
    </div>
  );
}
