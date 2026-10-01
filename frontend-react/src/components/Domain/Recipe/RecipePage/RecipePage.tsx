import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Fab from "@mui/material/Fab";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useBlocker, useNavigate, useParams, useSearchParams } from "react-router";
import { icons } from "~/lib/icons";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe, RecipeCategory, RecipeIngredient, RecipeTag, RecipeTool } from "~/lib/api/types/recipe";
import { useUserApi } from "~/hooks/api";
import { clearPageState, PageMode, usePageState } from "~/hooks/recipe-page/shared-state";
import { useCookModeQuery } from "~/hooks/recipe-page/use-cook-mode-query";
import type { BooleanString } from "~/hooks/recipe-page/use-cook-mode-query";
import { getUnitConversion, useUnitSystem } from "~/hooks/recipes";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useHouseholdSelf } from "~/hooks/use-households";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { getNavigationWarning } from "~/hooks/use-navigation-warning";
import { deepCopy, uuid4 } from "~/hooks/use-utils";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { RecipeJsonEditor } from "~/components/global/RecipeJsonEditor";
import { WakelockSwitch } from "~/components/global/WakelockSwitch";
import { RecipeDialogBulkAdd } from "../RecipeDialogBulkAdd";
import { RecipeIngredients } from "../RecipeIngredients";
import { RecipeNotes } from "../RecipeNotes";
import { RecipePrintContainer } from "../RecipePrintContainer";
import { RecipePageComments } from "./RecipePageParts/RecipePageComments";
import { RecipePageEditorToolbar } from "./RecipePageParts/RecipePageEditorToolbar";
import { RecipePageFooter } from "./RecipePageParts/RecipePageFooter";
import { RecipePageHeader } from "./RecipePageParts/RecipePageHeader";
import { RecipePageIngredientEditor } from "./RecipePageParts/RecipePageIngredientEditor";
import { RecipePageIngredientToolsView } from "./RecipePageParts/RecipePageIngredientToolsView";
import { RecipePageInfoEditor } from "./RecipePageParts/RecipePageInfoEditor";
import { RecipePageInstructions } from "./RecipePageParts/RecipePageInstructions";
import { RecipePageOrganizers } from "./RecipePageParts/RecipePageOrganizers";
import { RecipePageScale } from "./RecipePageParts/RecipePageScale";
import { RecipePageParseDialog } from "./RecipePageParts/RecipeParseDialog/RecipePageParseDialog";

type R = NoUndefinedField<Recipe>;

export interface RecipePageProps {
  value: R;
  onChange: Dispatch<SetStateAction<R>>;
}

/**
 * The recipe view/edit/cook page. The recipe is owned by the route page and passed down with a
 * setter; parts update it immutably (the Vue components mutated the shared object in place).
 */
export function RecipePage({ value: recipe, onChange: setRecipe }: RecipePageProps) {
  const i18n = useI18n();
  const display = useDisplay();
  const auth = useMealieAuth();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOwnGroup } = useLoggedInState();
  const { household } = useHouseholdSelf();
  const api = useUserApi();
  const page = usePageState(recipe.slug);
  const { pageMode, setMode, isEditForm, isEditJSON, isCookMode, isEditMode, isParsing, toggleCookMode, toggleIsParsing } = page;
  const { deactivateNavigationWarning } = getNavigationWarning();
  const [scale, setScale] = useState(1);
  const { unitSystem } = useUnitSystem();
  const { convertIngredient } = getUnitConversion();

  const disableComments = household?.preferences?.recipeDisableComments || recipe?.settings?.disableComments || false;
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const ingredientStorageKey = `recipe-ingredients:${recipe.id || recipe.slug}:checked`;

  const latest = useRef(recipe);
  latest.current = recipe;

  /**
   * The recipe as the reader asked to see it — the recipe itself unless they've opted into a unit
   * system. Cook mode, print and the ingredient list all read this, so they convert together.
   * Always the recipe itself in edit mode: conversion is display-only and never reaches a save.
   */
  const displayedRecipe = useMemo<R>(() => {
    if (isEditMode || !unitSystem) return recipe;
    return {
      ...recipe,
      recipeIngredient: recipe.recipeIngredient.map(ingredient => convertIngredient(ingredient, unitSystem, scale)) as R["recipeIngredient"],
    };
  }, [recipe, isEditMode, unitSystem, scale, convertIngredient]);

  const notLinkedIngredients = displayedRecipe.recipeIngredient.filter(ingredient =>
    !recipe.recipeInstructions.some(step => step.ingredientReferences?.map(ref => ref.referenceId).includes(ingredient.referenceId)),
  );
  const hasLinkedIngredients = recipe.recipeInstructions.some(step => step.ingredientReferences && step.ingredientReferences.length > 0);

  // Floating save button — track toolbar visibility
  const recipeToolbar = useRef<HTMLDivElement>(null);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  useEffect(() => {
    const el = recipeToolbar.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setToolbarVisible(!!entry?.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Snapshot to detect unsaved changes
  const originalRecipe = useRef<Recipe | null>(deepCopy(recipe));
  const [discardDialog, setDiscardDialog] = useState(false);
  const hasUnsavedChanges = useCallback(() => {
    if (originalRecipe.current === null) return false;
    return JSON.stringify(latest.current) !== JSON.stringify(originalRecipe.current);
  }, []);

  const isEditModeRef = useRef(isEditMode);
  isEditModeRef.current = isEditMode;
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    currentLocation.pathname !== nextLocation.pathname && isEditModeRef.current && hasUnsavedChanges());

  useEffect(() => {
    if (blocker.state === "blocked") setDiscardDialog(true);
  }, [blocker.state]);

  function restoreOriginalRecipe() {
    if (originalRecipe.current) setRecipe(deepCopy(originalRecipe.current) as R);
  }

  function closeEditor() {
    if (hasUnsavedChanges()) setDiscardDialog(true);
    else setMode(PageMode.VIEW);
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
    if (blocker.state === "blocked") blocker.reset();
  }

  const slugRef = useRef(recipe.slug);
  useEffect(() => () => {
    deactivateNavigationWarning();
    clearPageState(slugRef.current || "");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- on unmount
  }, []);

  // Query params: ?edit=true, ?parse=true, ?cook=true
  const setQuery = useCallback((key: string, value: string | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === undefined) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const cookQuery = (searchParams.get("cook") ?? undefined) as BooleanString | undefined;
  const { hydrateCookMode } = useCookModeQuery({
    cookQuery,
    setCookQuery: v => setQuery("cook", v),
    isEditMode,
    pageMode,
    setMode,
  });

  useEffect(() => {
    if (searchParams.get("edit") === "true" && isOwnGroup) setMode(PageMode.EDIT);
    if (searchParams.get("parse") === "true" && isOwnGroup) toggleIsParsing(true);
    hydrateCookMode();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onMounted
  }, []);

  // When set, leaving edit mode skips its URL cleanup because saveRecipe navigates to a new slug.
  const isNavigatingAfterRename = useRef(false);
  const prevEditMode = useRef(isEditMode);
  useEffect(() => {
    if (prevEditMode.current && !isEditMode) {
      if (isNavigatingAfterRename.current) isNavigatingAfterRename.current = false;
      else if (searchParams.has("edit")) setQuery("edit", undefined);
    }
    prevEditMode.current = isEditMode;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- watch(isEditMode)
  }, [isEditMode]);

  const prevParsing = useRef(isParsing);
  useEffect(() => {
    if (prevParsing.current && !isParsing && searchParams.has("parse")) setQuery("parse", undefined);
    prevParsing.current = isParsing;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- watch(isParsing)
  }, [isParsing]);

  async function saveRecipe(toSave: R = latest.current) {
    const { data, error } = await api.recipes.updateOne(params.slug as string, toSave);
    if (!error) {
      if (data?.slug && data.slug !== params.slug) isNavigatingAfterRename.current = true;
      setMode(PageMode.VIEW);
    }
    if (data?.slug) {
      setRecipe(data as R);
      latest.current = data as R;
      originalRecipe.current = deepCopy(data);
      if (data.slug !== params.slug) {
        void navigate(`/g/${groupSlug}/r/` + data.slug, { replace: true });
      }
    }
  }

  async function saveParsedIngredients(ingredients: NoUndefinedField<RecipeIngredient[]>) {
    const returnToEdit = isEditMode;
    const next = { ...latest.current, recipeIngredient: ingredients as R["recipeIngredient"] };
    setRecipe(next);
    latest.current = next;
    await saveRecipe(next);
    toggleIsParsing(false);
    if (returnToEdit) setMode(PageMode.EDIT);
  }

  async function deleteRecipe() {
    const { data } = await api.recipes.deleteOne(recipe.slug);
    if (data?.slug) void navigate(`/g/${groupSlug}`);
  }

  const landscape = !!recipe.settings?.landscapeView || !display.smAndUp;

  function addStep(steps: string[] | null = null) {
    if (!recipe.recipeInstructions) return;
    const newSteps = steps
      ? steps.map(step => ({ id: uuid4(), text: step, title: "", summary: "", ingredientReferences: [], noteReferences: [] }))
      : [{ id: uuid4(), text: "", title: "", summary: "", ingredientReferences: [], noteReferences: [] }];
    setRecipe(prev => ({ ...prev, recipeInstructions: [...prev.recipeInstructions, ...newSteps] as R["recipeInstructions"] }));
  }

  function chipClicked(item: RecipeTag | RecipeCategory | RecipeTool, itemType: string) {
    if (!item.id) return;
    void navigate(`/g/${groupSlug}?${itemType}=${item.id}`);
  }

  const instructions = (sx?: object) => (
    <RecipePageInstructions
      value={recipe.recipeInstructions}
      onChange={steps => setRecipe(prev => ({ ...prev, recipeInstructions: steps as R["recipeInstructions"] }))}
      assets={recipe.assets}
      onAssetsChange={assets => setRecipe(prev => ({ ...prev, assets: assets as R["assets"] }))}
      recipe={displayedRecipe}
      scale={scale}
      ingredientStorageKey={ingredientStorageKey}
      sx={sx}
    />
  );

  return (
    <div>
      <BaseDialog
        open={discardDialog}
        onOpenChange={(open) => {
          if (!open) cancelDiscard();
        }}
        bottomSheet
        title={i18n.t("general.discard-changes")}
        color="warning"
        icon={icons.alertCircle}
        canConfirm
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      >
        <CardContent>{i18n.t("general.discard-changes-description")}</CardContent>
      </BaseDialog>
      <RecipePageParseDialog
        open={isParsing}
        onOpenChange={v => toggleIsParsing(v)}
        ingredients={recipe.recipeIngredient}
        width={display.smAndDown ? "100%" : "80%"}
        onSave={ings => void saveParsedIngredients(ings)}
      />
      <Container maxWidth="lg" sx={{ display: isCookMode ? "none" : undefined, px: display.smAndDown ? 0 : 3, py: display.smAndDown ? 0 : undefined }}>
        <Card elevation={0} className="d-print-none">
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
                <Box sx={{ mt: 5 }}>
                  <RecipeJsonEditor value={recipe} onChange={v => setRecipe(v as R)} mode="text" mainMenuBar={false} />
                </Box>
              )
            : (
                <CardContent>
                  {isEditMode && <RecipePageInfoEditor value={recipe} onChange={setRecipe} />}
                  {isEditForm && <RecipePageEditorToolbar value={recipe} onChange={setRecipe} />}
                  {isEditForm && <RecipePageIngredientEditor value={recipe} onChange={setRecipe} />}
                  <RecipePageScale value={scale} onChange={setScale} recipe={recipe} />

                  {/* Two columns: ingredients/organizers and instructions */}
                  <Grid container spacing={3}>
                    {(!isCookMode || isEditForm) && (
                      <Grid size={{ xs: 12, sm: 12, md: 4 }} sx={display.mdAndUp ? { borderInlineEnd: 1, borderColor: "divider" } : undefined}>
                        {!isEditForm && (
                          <RecipePageIngredientToolsView recipe={displayedRecipe} scale={scale} ingredientStorageKey={ingredientStorageKey} sx={{ pr: 1 }} />
                        )}
                        {display.mdAndUp && <RecipePageOrganizers value={recipe} onChange={setRecipe} sx={{ pr: 1 }} onItemSelected={chipClicked} />}
                      </Grid>
                    )}
                    <Grid size={{ xs: 12, sm: 12, md: 8 + (isCookMode ? 1 : 0) * 4 }}>
                      {instructions()}
                      {isEditForm && (
                        <Box sx={{ display: "flex" }}>
                          <RecipeDialogBulkAdd sx={{ ml: "auto", my: 1, mr: 0.5 }} onBulkData={addStep} />
                          <BaseButton sx={{ my: 1 }} onClick={() => addStep()}>{i18n.t("general.add")}</BaseButton>
                        </Box>
                      )}
                      {!display.mdAndUp && <div><RecipePageOrganizers value={recipe} onChange={setRecipe} onItemSelected={chipClicked} /></div>}
                      <RecipeNotes value={recipe.notes} onChange={notes => setRecipe(prev => ({ ...prev, notes: notes as R["notes"] }))} edit={isEditForm} />
                    </Grid>
                  </Grid>
                  <RecipePageFooter value={recipe} onChange={setRecipe} />
                </CardContent>
              )}
        </Card>
        <WakelockSwitch />
        {!disableComments && !isEditForm && !isCookMode && (
          <RecipePageComments value={recipe} onChange={setRecipe} sx={{ px: 0.5, my: 2 }} />
        )}
        <RecipePrintContainer recipe={displayedRecipe} scale={scale} />
      </Container>

      {/* Floating save button when the toolbar scrolls out of view */}
      {isEditMode && !toolbarVisible && (
        <Tooltip title={i18n.t("general.save")} placement="left">
          <Fab color="success" size="large" className="d-print-none" sx={{ position: "fixed", bottom: 16, right: 16 }} onClick={() => void saveRecipe()}>
            <Icon path={icons.save} />
          </Fab>
        </Tooltip>
      )}

      {/* Cook mode: ingredients and instructions side by side, each scrolling on its own.
          The calc accounts for the navbar height (48px). */}
      {isCookMode && !hasLinkedIngredients && (
        <Box sx={{ height: display.smAndUp ? "calc(100vh - 48px)" : "auto", overflow: "hidden" }}>
          <Grid container sx={{ height: "100%", overflow: "hidden" }}>
            <Grid size={{ xs: 12, sm: 5 }} sx={{ overflowY: "auto", pl: 2, pr: 1.5, py: 1, height: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <RecipePageScale value={scale} onChange={setScale} recipe={recipe} />
              </Box>
              {!isEditForm && (
                <RecipePageIngredientToolsView recipe={displayedRecipe} scale={scale} isCookMode={isCookMode} ingredientStorageKey={ingredientStorageKey} />
              )}
              <Divider />
            </Grid>
            <Grid size={{ xs: 12, sm: 7 }} sx={{ overflowY: "auto", py: display.smAndDown ? 1 : 3, height: "100%" }}>
              <Typography variant="h5" component="h2" sx={{ px: 2, fontWeight: 500, opacity: 0.8 }}>{i18n.t("recipe.instructions")}</Typography>
              {instructions({ overflowY: "hidden", px: 2 })}
            </Grid>
          </Grid>
        </Box>
      )}
      {isCookMode && hasLinkedIngredients && (
        <Box>
          <Box sx={{ mt: 1, px: { xs: 1, md: 2 } }}>
            <RecipePageScale value={scale} onChange={setScale} recipe={recipe} />
          </Box>
          {instructions({ overflowY: "hidden", mt: -2.5, px: { xs: 1, md: 2 } })}
          {notLinkedIngredients.length > 0 && (
            <Box sx={{ px: { xs: 1, md: 2 }, pb: 2 }}>
              <Divider />
              <Card elevation={0}>
                <Typography variant="h6" sx={{ px: 2, py: 1.5 }}>{i18n.t("recipe.not-linked-ingredients")}</Typography>
                <RecipeIngredients value={notLinkedIngredients} scale={scale} isCookMode={isCookMode} storageKey={ingredientStorageKey} />
              </Card>
            </Box>
          )}
        </Box>
      )}
      {isCookMode && (
        <IconButton onClick={toggleCookMode} sx={{ "position": "fixed", "right": 12, "top": 60, "bgcolor": "primary.main", "color": "#fff", "&:hover": { bgcolor: "primary.dark" } }}>
          <Icon path={icons.close} />
        </IconButton>
      )}
    </div>
  );
}

export default RecipePage;
