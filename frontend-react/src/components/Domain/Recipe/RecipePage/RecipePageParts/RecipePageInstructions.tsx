// Usage: <RecipePageInstructions value={recipe.recipeInstructions} onChange={…} assets={recipe.assets}
//   onAssetsChange={…} recipe={displayedRecipe} scale={scale} ingredientStorageKey={key} />
// The steps of the recipe page. Viewing: step cards that collapse when clicked (sections collapse together), linked
// notes in a bottom sheet, linked ingredients beside the text in cook mode. Editing (form mode): drag-and-drop order,
// summary/title/markdown fields, a menu per step (section, link ingredients and notes, image upload, preview, merge,
// move, insert), image drop to attach, and Ctrl+Z to undo a merge. (Vue `v-model` + `v-model:assets` → `value` +
// `onChange` and `assets` + `onAssetsChange`; both setters take a value or an updater.)
import { useRef, useState, type KeyboardEvent, type SetStateAction } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Fade from "@mui/material/Fade";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { RecipeIngredientHtml } from "@/components/Domain/Recipe/RecipeIngredientHtml";
import { RecipeIngredients } from "@/components/Domain/Recipe/RecipeIngredients";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseDialog } from "@/components/global/BaseDialog";
import { DropZone } from "@/components/global/DropZone";
import { MarkdownEditor } from "@/components/global/MarkdownEditor";
import { MdiIcon } from "@/components/global/MdiIcon";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { useStaticRoutes, useUserApi } from "@/hooks/api";
import { usePageState } from "@/hooks/recipe-page/shared-state";
import { useExtractIngredientReferences } from "@/hooks/recipe-page/use-extract-ingredient-references";
import { alert } from "@/hooks/use-toast";
import { uuid4 } from "@/hooks/use-utils";
import { useDisplay } from "@/hooks/utils";
import { moveItem, useSortable } from "@/hooks/utils/use-sortable";
import { useI18n } from "@/i18n";
import type { RecipeAsset, RecipeIngredient, RecipeNote, RecipeStep } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import type { RecipeModel } from "../recipe-model";

interface MergerHistory {
  target: number;
  source: number;
  targetText: string;
  sourceText: string;
}

interface RecipePageInstructionsProps {
  value: RecipeStep[];
  onChange: (update: SetStateAction<RecipeStep[]>) => void;
  assets: RecipeAsset[];
  onAssetsChange: (update: SetStateAction<RecipeAsset[]>) => void;
  recipe: RecipeModel;
  scale?: number;
  ingredientStorageKey?: string;
  className?: string;
  onClickInstructionField?: (field: string) => void;
}

function hasSectionTitle(title: string | undefined | null) {
  return !(title === null || title === "" || title === undefined);
}

export function RecipePageInstructions({
  value: instructionList,
  onChange,
  onAssetsChange,
  recipe,
  scale = 1,
  ingredientStorageKey = undefined,
  className,
  onClickInstructionField,
}: RecipePageInstructionsProps) {
  const { t } = useI18n();
  const { smAndUp } = useDisplay();
  const { isCookMode, toggleCookMode, isEditForm } = usePageState(recipe.slug);
  const { extractIngredientReferences } = useExtractIngredientReferences();

  const [dialog, setDialog] = useState(false);
  const [disabledSteps, setDisabledSteps] = useState<number[]>([]);
  // section title visibility toggled from the menu; re-derived from the titles whenever the list changes
  const [titleOverrides, setTitleOverrides] = useState<Record<string, boolean>>({});

  // ===============================================================
  // UI State Helpers

  // Vue: watch(instructionList, …, { deep: true }) — every change of the steps re-opens collapsed steps and
  // re-derives the section title editors from the titles
  const [prevList, setPrevList] = useState(instructionList);
  if (prevList !== instructionList) {
    setPrevList(instructionList);
    setDisabledSteps([]);
    setTitleOverrides({});
  }

  function showTitleEditor(id: string | null | undefined) {
    if (!id) {
      return false;
    }
    if (id in titleOverrides) {
      return titleOverrides[id]!;
    }
    return hasSectionTitle(instructionList.find(step => step.id === id)?.title);
  }

  function updateStep(index: number, patch: Partial<RecipeStep>) {
    onChange(list => list.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function toggleDisabled(stepIndex: number) {
    if (isEditForm) {
      return;
    }
    setDisabledSteps(steps => (steps.includes(stepIndex)
      ? steps.filter(step => step !== stepIndex)
      : [...steps, stepIndex]));
  }

  function isChecked(stepIndex: number) {
    return disabledSteps.includes(stepIndex) && !isEditForm;
  }

  function sectionTitleLabel(id?: string | null) {
    return showTitleEditor(id)
      ? t("recipe.clear-section")
      : t("recipe.add-section");
  }

  function toggleShowTitle(id?: string | null) {
    if (!id) {
      return;
    }

    const showing = showTitleEditor(id);
    if (showing) {
      // visibility is re-derived from the title whenever the list changes, so hiding a section
      // only sticks if the title goes with it
      onChange(list => list.map(step => (step.id === id ? { ...step, title: "" } : step)));
    }

    setTitleOverrides(overrides => ({ ...overrides, [id]: !showing }));
  }

  // ===============================================================
  // Reference Linker
  const [activeLinkerIndex, setActiveLinkerIndex] = useState(0);
  const [activeRefs, setActiveRefs] = useState<string[]>([]);
  const [activeNoteReferenceIds, setActiveNoteReferenceIds] = useState<string[]>([]);
  const [activeText, setActiveText] = useState("");
  const [linkedNotesSheetOpen, setLinkedNotesSheetOpen] = useState(false);
  const [activeStepLinkedNotes, setActiveStepLinkedNotes] = useState<RecipeNote[]>([]);

  const availableDialogNextStep = activeLinkerIndex < instructionList.length - 1;
  const activeDialogStepText = activeText;
  const linkableNotes = (recipe.notes ?? []).filter((note): note is RecipeNote & { referenceId: string } => note.referenceId != null);

  function openReferenceDialog(idx: number, list: RecipeStep[] = instructionList) {
    setActiveLinkerIndex(idx);
    const step = list[idx];

    if (!step) {
      setActiveRefs([]);
      setActiveNoteReferenceIds([]);
      return;
    }

    setActiveText(step.text ?? "");
    setActiveRefs((step.ingredientReferences ?? []).map(ref => ref.referenceId ?? ""));
    setActiveNoteReferenceIds((step.noteReferences ?? [])
      .map(ref => ref.referenceId)
      .filter((ref): ref is string => ref != null));
    setDialog(true);
  }

  /** Writes the dialog's links to the active step; returns the updated list. */
  function saveDialogLinks(): RecipeStep[] {
    const step = instructionList[activeLinkerIndex];

    if (!step) {
      setDialog(false);
      return instructionList;
    }

    const updated = instructionList.map((element, i) => (i === activeLinkerIndex
      ? {
          ...element,
          ingredientReferences: activeRefs.map(referenceId => ({ referenceId })),
          noteReferences: activeNoteReferenceIds.map(referenceId => ({ referenceId })),
        }
      : element));
    onChange(updated);

    setDialog(false);
    return updated;
  }

  function saveAndOpenNextDialogLinks() {
    const currentStepIndex = activeLinkerIndex;

    if (!availableDialogNextStep) {
      return;
    }

    const updated = saveDialogLinks();
    openReferenceDialog(currentStepIndex + 1, updated);
  }

  function closeDialog() {
    setDialog(false);
  }

  // Vue `setUsedIngredients()`: ingredients linked to another step than the one being edited
  const usedRefs: { [key: string]: boolean } = {};
  instructionList.forEach((element, idx) => {
    if (idx === activeLinkerIndex) return;
    element.ingredientReferences?.forEach((ref) => {
      if (ref.referenceId) usedRefs[ref.referenceId] = true;
    });
  });
  const usedIngredients = recipe.recipeIngredient.filter(ing => !!ing.referenceId && ing.referenceId in usedRefs);
  const unusedIngredients = recipe.recipeIngredient.filter(ing => !!ing.referenceId && !(ing.referenceId in usedRefs));

  function autoSetReferences() {
    const found = extractIngredientReferences(
      recipe.recipeIngredient,
      activeRefs,
      activeText,
    );
    setActiveRefs(refs => [...refs, ...found]);
  }

  const noteLookup = (recipe.notes ?? []).reduce((prev, note) => {
    if (note.referenceId != null) {
      prev[note.referenceId] = note.title;
    }
    return prev;
  }, {} as { [key: string]: string });

  const notesByReferenceId = (recipe.notes ?? []).reduce((prev, note) => {
    if (note.referenceId != null) {
      prev[note.referenceId] = note;
    }
    return prev;
  }, {} as { [key: string]: RecipeNote });

  function linkedNotesForStep(step: RecipeStep): RecipeNote[] {
    return (step.noteReferences ?? [])
      .map(ref => (ref.referenceId ? notesByReferenceId[ref.referenceId] : undefined))
      .filter((note): note is RecipeNote => note !== undefined);
  }

  function openLinkedNotesSheet(step: RecipeStep) {
    const notes = linkedNotesForStep(step);
    setActiveStepLinkedNotes(notes);
    setLinkedNotesSheetOpen(notes.length > 0);
  }

  function hasLinkedIngredients(step: RecipeStep): boolean {
    return !!step.ingredientReferences && step.ingredientReferences.length > 0;
  }

  function hasLinkedNotes(step: RecipeStep): boolean {
    return linkedNotesForStep(step).length > 0;
  }

  function hasCookModeLinkedContent(step: RecipeStep): boolean {
    return hasLinkedIngredients(step) || hasLinkedNotes(step);
  }

  const ingredientLookup = recipe.recipeIngredient.reduce((prev, ing) => {
    if (ing.referenceId === undefined) {
      return prev;
    }
    prev[ing.referenceId] = ing;
    return prev;
  }, {} as { [key: string]: RecipeIngredient });

  // Map each ingredient's referenceId to its section title
  const ingredientSectionTitles: { [key: string]: string } = {};
  let currentTitle = "";
  // Go through all ingredients in order
  recipe.recipeIngredient.forEach((ingredient) => {
    if (ingredient.referenceId === undefined) {
      return;
    }

    // If this ingredient has a title, update the current title
    if (ingredient.title) {
      currentTitle = ingredient.title;
    }

    // Assign the current title to this ingredient
    ingredientSectionTitles[ingredient.referenceId] = currentTitle;
  });

  function groupBySection(ingredients: RecipeIngredient[]): Record<string, RecipeIngredient[]> {
    const groups: Record<string, RecipeIngredient[]> = {};

    // Group ingredients by section title
    ingredients.forEach((ingredient) => {
      if (ingredient.referenceId === undefined) {
        return;
      }

      // Use the section title from the mapping, or fallback to the ingredient's own title
      const title = ingredientSectionTitles[ingredient.referenceId] || ingredient.title || "";
      (groups[title] ||= []).push(ingredient);
    });

    return groups;
  }

  const groupedUnusedIngredients = groupBySection(unusedIngredients);
  const groupedUsedIngredients = groupBySection(usedIngredients);

  function toggleActiveRef(referenceId: string, checked: boolean) {
    setActiveRefs(refs => (checked ? [...refs, referenceId] : refs.filter(ref => ref !== referenceId)));
  }

  function toggleActiveNote(referenceId: string, checked: boolean) {
    setActiveNoteReferenceIds(refs => (checked ? [...refs, referenceId] : refs.filter(ref => ref !== referenceId)));
  }

  // ===============================================================
  // Instruction Merger
  const mergeHistory = useRef<MergerHistory[]>([]);

  function mergeAbove(target: number, source: number) {
    if (target < 0) {
      return;
    }

    const targetStep = instructionList[target];
    const sourceStep = instructionList[source];
    if (!targetStep || !sourceStep) {
      return;
    }

    mergeHistory.current.push({
      target,
      source,
      targetText: targetStep.text ?? "",
      sourceText: sourceStep.text ?? "",
    });

    onChange(list => list
      .map((step, i) => (i === target ? { ...step, text: step.text + " " + sourceStep.text } : step))
      .filter((_, i) => i !== source));
  }

  function undoMerge(event: KeyboardEvent) {
    if (event.ctrlKey && event.code === "KeyZ") {
      if (!(mergeHistory.current.length > 0)) {
        return;
      }

      const lastMerge = mergeHistory.current.pop();
      if (!lastMerge) {
        return;
      }

      onChange((list) => {
        const next = list.map((step, i) => (i === lastMerge.target ? { ...step, text: lastMerge.targetText } : step));
        next.splice(lastMerge.source, 0, {
          id: uuid4(),
          title: "",
          text: lastMerge.sourceText,
          ingredientReferences: [],
          noteReferences: [],
        });
        return next;
      });
    }
  }

  function moveTo(dest: string, source: number) {
    onChange((list) => {
      const next = [...list];
      const [step] = next.splice(source, 1);
      if (!step) {
        return list;
      }
      if (dest === "top") {
        next.unshift(step);
      }
      else {
        next.push(step);
      }
      return next;
    });
  }

  function insert(dest: number) {
    onChange((list) => {
      const next = [...list];
      next.splice(dest, 0, { id: uuid4(), text: "", title: "", ingredientReferences: [], noteReferences: [] });
      return next;
    });
  }

  const [previewStates, setPreviewStates] = useState<boolean[]>([]);

  function togglePreviewState(index: number) {
    setPreviewStates((states) => {
      const temp = [...states];
      temp[index] = !temp[index];
      return temp;
    });
  }

  function setPreviewState(index: number, preview: boolean) {
    setPreviewStates((states) => {
      const temp = [...states];
      temp[index] = preview;
      return temp;
    });
  }

  function toggleCollapseSection(index: number) {
    const sectionSteps: number[] = [];

    for (let i = index; i < instructionList.length; i++) {
      if (!(i === index) && hasSectionTitle(instructionList[i]?.title)) {
        break;
      }
      else {
        sectionSteps.push(i);
      }
    }

    const allCollapsed = sectionSteps.every(idx => disabledSteps.includes(idx));

    if (allCollapsed) {
      setDisabledSteps(steps => steps.filter(idx => !sectionSteps.includes(idx)));
    }
    else {
      setDisabledSteps(steps => [...steps, ...sectionSteps]);
    }
  }

  // drag and drop (Vue <VueDraggable :disabled="!isEditForm" handle=".handle">)
  const listRef = useRef<HTMLDivElement>(null);
  useSortable(listRef, {
    disabled: !isEditForm,
    handle: ".handle",
    delay: 250,
    delayOnTouchOnly: true,
    animation: 200,
    group: "recipe-instructions",
    ghostClass: "ghost",
    onReorder: ({ oldIndex, newIndex }) => onChange(list => moveItem(list, oldIndex, newIndex)),
  });

  // ===============================================================
  // Image Uploader
  const api = useUserApi();
  const { recipeAssetPath } = useStaticRoutes();

  const [loadingStates, setLoadingStates] = useState<{ [key: number]: boolean }>({});
  const setLoading = (index: number, loading: boolean) => setLoadingStates(states => ({ ...states, [index]: loading }));

  async function handleImageDrop(index: number, files: File[]) {
    if (!files) {
      return;
    }

    // Check if the file is an image
    const file = files[0];
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    setLoading(index, true);

    const { data } = await api.recipes.createAsset(recipe.slug, {
      name: file.name,
      icon: "mdi-file-image",
      file,
      extension: file.name.split(".").pop() || "",
    });

    setLoading(index, false);

    if (!data) {
      return; // Vue left the error to the API's toast as well
    }

    embedAsset(index, data);
  }

  /**
   * Images dragged out of another browser tab carry a URL instead of a file, so the server
   * fetches the image on our behalf.
   */
  async function handleImageUrlDrop(index: number, url: string) {
    setLoading(index, true);

    const { data } = await api.recipes.createAssetFromUrl(recipe.slug, url);

    setLoading(index, false);

    if (!data) {
      alert.error(t("recipe.failed-to-attach-image"));
      return;
    }

    embedAsset(index, data);
  }

  /**
   * Some pages render images from blob: urls, which resolve only inside the origin that made
   * them. Nothing can read those bytes from here, so point the user at what does work.
   */
  function notifyUnsupportedDrop() {
    alert.error(t("recipe.image-drop-unsupported"));
  }

  function embedAsset(index: number, asset: RecipeAsset) {
    onAssetsChange(assets => [...(assets ?? []), asset]);
    const assetUrl = recipeAssetPath(recipe.id, asset.fileName as string);
    const text = `<img src="${assetUrl}" height="100%" width="100%"/>`;
    onChange(list => list.map((step, i) => (i === index ? { ...step, text: step.text + text } : step)));
  }

  function openImageUpload(index: number) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      if (input.files) {
        await handleImageDrop(index, Array.from(input.files));
        input.remove();
      }
    };
    input.click();
  }

  function onStepMenu(event: string, index: number, step: RecipeStep) {
    switch (event) {
      case "merge-above":
        mergeAbove(index - 1, index);
        break;
      case "move-to-top":
        moveTo("top", index);
        break;
      case "move-to-bottom":
        moveTo("bottom", index);
        break;
      case "insert-above":
        insert(index);
        break;
      case "insert-below":
        insert(index + 1);
        break;
      case "toggle-section":
        toggleShowTitle(step.id);
        break;
      case "link-references":
        openReferenceDialog(index);
        break;
      case "preview-step":
        togglePreviewState(index);
        break;
      case "upload-image":
        openImageUpload(index);
        break;
      case "delete":
        onChange(list => list.filter((_, i) => i !== index));
        break;
    }
  }

  function renderIngredientGroups(groups: Record<string, RecipeIngredient[]>) {
    return Object.entries(groups).map(([title, ingredients]) => (
      <div key={title}>
        {title && (
          <Typography variant="subtitle1" component="h4" sx={{ py: 1.5, ml: 0.5, pl: 2, fontWeight: "bold" }}>
            {title}
          </Typography>
        )}
        {ingredients.map(ing => (
          <Box key={ing.referenceId} sx={{ ml: 2 }}>
            <FormControlLabel
              control={(
                <Checkbox
                  checked={activeRefs.includes(ing.referenceId ?? "")}
                  onChange={event => toggleActiveRef(ing.referenceId ?? "", event.target.checked)}
                />
              )}
              label={<RecipeIngredientHtml ingredient={ing} scale={scale} />}
            />
          </Box>
        ))}
      </div>
    ));
  }

  const linkedNotesTitle = t("recipe.linked-notes-with-count", { count: activeStepLinkedNotes.length });

  return (
    <Box component="section" className={className} onKeyUp={undoMerge}>
      {/* Ingredient Link Editor */}
      <BaseDialog
        open={dialog}
        onOpenChange={setDialog}
        title={t("recipe.link-references")}
        icon={icons.link}
        width="100%"
        maxWidth="600px"
        cardActions={(
          <Box sx={{ display: "flex", flexGrow: 1 }}>
            <BaseButton cancel onClick={closeDialog} />
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 1 }}>
              <BaseButton color="info" icon={icons.robot} onClick={autoSetReferences}>
                {t("recipe.auto")}
              </BaseButton>
              <BaseButton save onClick={saveDialogLinks} />
              {availableDialogNextStep && (
                <BaseButton sx={{ ml: 1, my: 0.5 }} icon={icons.forward} onClick={saveAndOpenNextDialogLinks}>
                  {t("recipe.nextStep")}
                </BaseButton>
              )}
            </Box>
          </Box>
        )}
      >
        <Box sx={{ display: "grid", gap: "0.5rem", height: "100%", boxSizing: "border-box", maxHeight: "60vh", overflowY: "auto" }}>
          <Box sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: "background.paper" }}>
            <Box sx={{ maxHeight: "40dvh", overflowY: "auto" }}>
              <CardContent sx={{ pt: 2 }}>
                <p>
                  {activeDialogStepText}
                </p>
                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" component="h4" sx={{ ml: 0.5, fontWeight: "bold" }}>
                  {t("recipe.ingredients")}
                </Typography>
              </CardContent>
            </Box>
            <Divider />
          </Box>
          <CardContent>
            {Object.keys(groupedUnusedIngredients).length > 0 && (
              <>
                <Typography variant="subtitle1" component="h4" sx={{ ml: 0.5, fontWeight: "bold" }}>
                  {t("recipe.unlinked")}
                </Typography>
                {renderIngredientGroups(groupedUnusedIngredients)}
              </>
            )}

            {Object.keys(groupedUsedIngredients).length > 0 && (
              <>
                <Typography variant="subtitle1" component="h4" sx={{ py: 1.5, ml: 0.5, fontWeight: "bold" }}>
                  {t("recipe.linked-to-other-step")}
                </Typography>
                {renderIngredientGroups(groupedUsedIngredients)}
              </>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" component="h4" sx={{ ml: 0.5, mb: 1, fontWeight: "bold" }}>
              {t("recipe.notes")}
            </Typography>
            {linkableNotes.length === 0 && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("recipe.no-notes-to-link")}
              </Typography>
            )}
            {linkableNotes.map(note => (
              <Box key={note.referenceId} sx={{ ml: 2 }}>
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={activeNoteReferenceIds.includes(note.referenceId)}
                      onChange={event => toggleActiveNote(note.referenceId, event.target.checked)}
                    />
                  )}
                  label={note.title || t("recipe.note")}
                />
              </Box>
            ))}
          </CardContent>
        </Box>

        <Divider />
      </BaseDialog>

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        {!isCookMode && (
          <Typography variant="h5" component="h2" sx={{ mt: 0.5, fontWeight: 500, opacity: 0.8 }}>
            {t("recipe.instructions")}
          </Typography>
        )}
        {!isEditForm && !isCookMode && (
          <BaseButton minor cancel color="primary" icon={icons.primary} onClick={() => toggleCookMode()}>
            {t("recipe.cook-mode")}
          </BaseButton>
        )}
      </Box>
      <Drawer
        anchor="bottom"
        open={linkedNotesSheetOpen}
        onClose={() => setLinkedNotesSheetOpen(false)}
        slotProps={{ paper: { "role": "dialog", "aria-label": linkedNotesTitle, "sx": { maxWidth: 900, mx: "auto" } } }}
      >
        <Card>
          <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.5 }}>
            <MdiIcon path={icons.noteTextOutline} size={20} sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              {linkedNotesTitle}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton aria-label={t("general.close")} onClick={() => setLinkedNotesSheetOpen(false)}>
              <MdiIcon path={icons.close} />
            </IconButton>
          </Box>
          <Divider />
          <CardContent sx={{ pt: 2 }}>
            {activeStepLinkedNotes.map((note, noteIndex) => (
              <div key={note.referenceId ?? note.title}>
                {noteIndex > 0 && <Divider sx={{ my: 1.5 }} />}
                <Typography variant="h6" component="div" sx={{ mb: 0.5 }}>
                  {note.title || t("recipe.note")}
                </Typography>
                <SafeMarkdown source={note.text} />
              </div>
            ))}
          </CardContent>
        </Card>
      </Drawer>
      <div ref={listRef}>
        {instructionList.map((step, index) => (
          <div key={step.id ?? index} className="list-group-item">
            {step.id && showTitleEditor(step.id) && (
              <Box
                sx={{
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  mt: 3,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  p: isEditForm ? 1 : 1.5,
                  borderRadius: "6px",
                  cursor: "pointer",
                  width: "100%",
                }}
                onClick={() => toggleCollapseSection(index)}
              >
                {isEditForm
                  ? (
                      <TextField
                        value={step.title ?? ""}
                        onChange={event => updateStep(index, { title: event.target.value })}
                        size="small"
                        fullWidth
                        hiddenLabel
                        variant="standard"
                        placeholder={t("recipe.section-title")}
                        slotProps={{ input: { disableUnderline: true, sx: { color: "inherit", px: 1 } } }}
                      />
                    )
                  : (
                      <Typography variant="h6" component="div" className="section-title-text">
                        {step.title}
                      </Typography>
                    )}
              </Box>
            )}
            <Card
              sx={{
                "my": 1.5,
                "cursor": isEditForm ? "default" : "pointer",
                "boxShadow": 2,
                "transition": "box-shadow 0.2s",
                "&:hover": { boxShadow: 12 },
                ...(isChecked(index) ? { opacity: 0.5 } : {}),
              }}
              className={isChecked(index) ? "disabled-card" : undefined}
              onClick={() => toggleDisabled(index)}
            >
              <Box
                className="recipe-step-title"
                sx={{ px: 2, pt: 1.5, pb: !isChecked(index) ? 0 : 1.5, whiteSpace: "normal", lineHeight: 1.25, wordBreak: "break-word", typography: "h6" }}
              >
                <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                  {isEditForm
                    ? (
                        <TextField
                          value={step.summary ?? ""}
                          onChange={event => updateStep(index, { summary: event.target.value })}
                          className="headline"
                          size="small"
                          fullWidth
                          hiddenLabel
                          variant="standard"
                          placeholder={t("recipe.step-index", { step: index + 1 })}
                          slotProps={{
                            input: {
                              disableUnderline: true,
                              sx: { fontSize: "1.5rem" },
                              startAdornment: (
                                <InputAdornment position="start">
                                  <MdiIcon path={icons.arrowUpDown} size={26} className="handle" sx={{ cursor: "grab" }} />
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                      )
                    : (
                        <Box className="summary-wrapper" sx={{ flex: "1 1 auto", minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere", cursor: "pointer" }}>
                          {step.summary
                            ? (
                                <Box sx={{ pr: 1 }}>
                                  <SafeMarkdown source={step.summary} />
                                </Box>
                              )
                            : (
                                <span>
                                  {t("recipe.step-index", { step: index + 1 })}
                                </span>
                              )}
                        </Box>
                      )}
                  {isEditForm && (
                    <Box sx={{ ml: "auto" }} onClick={event => event.stopPropagation()}>
                      <BaseButtonGroup
                        large={false}
                        buttons={[
                          {
                            icon: icons.delete,
                            text: t("general.delete"),
                            event: "delete",
                          },
                          {
                            icon: icons.dotsVertical,
                            text: "",
                            event: "open",
                            children: [
                              {
                                text: sectionTitleLabel(step.id),
                                event: "toggle-section",
                              },
                              {
                                text: t("recipe.link-references"),
                                event: "link-references",
                              },
                              {
                                text: t("recipe.upload-image"),
                                event: "upload-image",
                              },
                              {
                                icon: previewStates[index] ? icons.edit : icons.eye,
                                text: previewStates[index] ? t("recipe.edit-markdown") : t("markdown-editor.preview-markdown-button-label"),
                                event: "preview-step",
                                divider: true,
                              },
                              {
                                text: t("recipe.merge-above"),
                                event: "merge-above",
                              },
                              {
                                text: t("recipe.move-to-top"),
                                event: "move-to-top",
                              },
                              {
                                text: t("recipe.move-to-bottom"),
                                event: "move-to-bottom",
                              },
                              {
                                text: t("recipe.insert-above"),
                                event: "insert-above",
                              },
                              {
                                text: t("recipe.insert-below"),
                                event: "insert-below",
                              },
                            ],
                          },
                        ]}
                        onAction={event => onStepMenu(event, index, step)}
                      />
                    </Box>
                  )}
                  {!isEditForm && (
                    <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
                      {hasLinkedNotes(step) && !isCookMode && (
                        <Tooltip title={t("recipe.linked-notes-with-count", { count: linkedNotesForStep(step).length })} placement="top">
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              openLinkedNotesSheet(step);
                            }}
                          >
                            <MdiIcon path={icons.noteTextOutline} size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Fade in={isChecked(index)}>
                        <span style={{ display: isChecked(index) ? "inline-flex" : "none" }}>
                          <MdiIcon path={icons.checkboxMarkedCircle} size={24} sx={{ color: "success.main" }} />
                        </span>
                      </Fade>
                    </Box>
                  )}
                </Box>
              </Box>

              {isEditForm && loadingStates[index] && <LinearProgress />}

              {/* Content */}
              <DropZone
                onDrop={f => void handleImageDrop(index, f)}
                onDropUrl={u => void handleImageUrlDrop(index, u)}
                onDropUnsupported={notifyUnsupportedDrop}
              >
                {isEditForm && (
                  <CardContent sx={{ fontSize: "1rem" }} onClick={() => onClickInstructionField?.(`${index}.text`)}>
                    <Box sx={{ mb: 1 }}>
                      <MarkdownEditor
                        value={instructionList[index]?.text ?? ""}
                        onChange={text => updateStep(index, { text })}
                        preview={previewStates[index] ?? false}
                        onPreviewChange={preview => setPreviewState(index, preview)}
                        displayPreview={false}
                        textarea={{
                          hint: t("recipe.attach-images-hint"),
                          persistentHint: true,
                        }}
                      />
                    </Box>
                    {step.ingredientReferences && step.ingredientReferences.length > 0 && (
                      <div className="linked-ingredients-editor">
                        {step.ingredientReferences.map((linkRef, i) => (
                          <Box key={linkRef.referenceId ?? i} sx={{ mb: 0.5 }}>
                            {linkRef.referenceId && ingredientLookup[linkRef.referenceId] && (
                              <RecipeIngredientHtml
                                ingredient={ingredientLookup[linkRef.referenceId]}
                                scale={scale}
                              />
                            )}
                          </Box>
                        ))}
                      </div>
                    )}
                    {step.noteReferences && step.noteReferences.length > 0 && (
                      <Box className="linked-ingredients-editor" sx={{ mt: 0.5 }}>
                        {step.noteReferences.map((noteRef, i) => (
                          <Box key={noteRef.referenceId ?? i} sx={{ mb: 0.5, display: "flex", alignItems: "center", typography: "body2" }}>
                            <MdiIcon path={icons.noteTextOutline} size={14} sx={{ mr: 0.5, cursor: "default" }} />
                            {noteRef.referenceId != null ? (noteLookup[noteRef.referenceId] || t("recipe.note")) : ""}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                )}
              </DropZone>
              <Collapse in={!isChecked(index) && !isEditForm} unmountOnExit>
                <Box sx={{ m: 0, p: 0 }}>
                  <CardContent
                    className="markdown"
                    sx={{ "fontSize": "1rem", "& ul > li": { display: "list-item", listStyleType: "disc" }, "& ol > li": { display: "list-item" } }}
                  >
                    <Grid container spacing={2}>
                      {isCookMode && hasCookModeLinkedContent(step) && (
                        <Grid size={{ xs: 12, sm: 5 }}>
                          {hasLinkedIngredients(step) && (
                            <Box sx={{ ml: -2 }}>
                              <RecipeIngredients
                                value={recipe.recipeIngredient.filter((ing) => {
                                  if (!step.ingredientReferences) return false;
                                  return step.ingredientReferences.map(ref => ref.referenceId).includes(ing.referenceId || "");
                                })}
                                scale={scale}
                                isCookMode={isCookMode}
                                storageKey={ingredientStorageKey}
                              />
                            </Box>
                          )}
                          {hasLinkedIngredients(step) && hasLinkedNotes(step) && <Divider sx={{ my: 1.5 }} />}
                          {hasLinkedNotes(step) && (
                            <div>
                              {linkedNotesForStep(step).map((note, noteIndex) => (
                                <div key={note.referenceId ?? note.title}>
                                  {noteIndex > 0 && <Divider sx={{ my: 1.5 }} />}
                                  <Typography variant="h6" component="div" sx={{ mb: 0.5 }}>
                                    {note.title || t("recipe.note")}
                                  </Typography>
                                  <SafeMarkdown source={note.text} />
                                </div>
                              ))}
                            </div>
                          )}
                        </Grid>
                      )}
                      {isCookMode && hasCookModeLinkedContent(step) && smAndUp && (
                        <Divider orientation="vertical" flexItem />
                      )}
                      <Grid size="grow">
                        <div className="markdown">
                          <SafeMarkdown source={step.text} />
                        </div>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Box>
              </Collapse>
            </Card>
          </div>
        ))}
      </div>
      {!isCookMode && (
        <Divider sx={{ mt: 10, display: { xs: "flex", md: "none" } }} />
      )}
    </Box>
  );
}
