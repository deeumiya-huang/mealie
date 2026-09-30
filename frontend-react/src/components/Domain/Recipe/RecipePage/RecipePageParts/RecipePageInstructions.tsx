import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Fade from "@mui/material/Fade";
import type { SxProps, Theme } from "@mui/material/styles";
import { icons } from "~/lib/icons";
import type { Recipe, RecipeAsset, RecipeIngredient, RecipeNote, RecipeStep } from "~/lib/api/types/recipe";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import { useStaticRoutes, useUserApi } from "~/hooks/api";
import { usePageState } from "~/hooks/recipe-page/shared-state";
import { useExtractIngredientReferences } from "~/hooks/recipe-page/use-extract-ingredient-references";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { alert } from "~/hooks/use-toast";
import { uuid4 } from "~/hooks/use-utils";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { BaseDialog } from "~/components/global/BaseDialog";
import { DropZone } from "~/components/global/DropZone";
import { Icon } from "~/components/global/Icon";
import { MarkdownEditor } from "~/components/global/MarkdownEditor";
import { SafeMarkdown } from "~/components/global/SafeMarkdown";
import { SortableList } from "~/components/global/SortableList";
import { RecipeIngredientHtml } from "../../RecipeIngredientHtml";
import { RecipeIngredients } from "../../RecipeIngredients";

interface MergerHistory {
  target: number;
  source: number;
  targetText: string;
  sourceText: string;
}

export interface RecipePageInstructionsProps {
  value: RecipeStep[];
  onChange: (steps: RecipeStep[]) => void;
  assets: RecipeAsset[];
  onAssetsChange: (assets: RecipeAsset[]) => void;
  recipe: NoUndefinedField<Recipe>;
  scale?: number;
  ingredientStorageKey?: string;
  sx?: SxProps<Theme>;
  onClickInstructionField?: (field: string) => void;
}

function hasSectionTitle(title: string | null | undefined) {
  return !(title === null || title === "" || title === undefined);
}

function computeTitleEditors(steps: RecipeStep[], prev: Record<string, boolean> = {}) {
  const next = { ...prev };
  steps.forEach((step) => {
    if (step.id !== undefined && step.id !== null) next[step.id] = hasSectionTitle(step.title);
  });
  return next;
}

export function RecipePageInstructions(props: RecipePageInstructionsProps) {
  const { value: instructionList, onChange, assets, onAssetsChange, recipe, scale = 1, ingredientStorageKey, sx, onClickInstructionField } = props;
  const i18n = useI18n();
  const display = useDisplay();
  const api = useUserApi();
  const { recipeAssetPath } = useStaticRoutes();
  const { isCookMode, toggleCookMode, isEditForm } = usePageState(recipe.slug);
  const { extractIngredientReferences } = useExtractIngredientReferences();

  const [dialog, setDialog] = useState(false);
  const [disabledSteps, setDisabledSteps] = useState<number[]>([]);
  const [showTitleEditor, setShowTitleEditor] = useState<Record<string, boolean>>(() => computeTitleEditors(instructionList));
  const [previewStates, setPreviewStates] = useState<boolean[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
  const mergeHistory = useRef<MergerHistory[]>([]);
  const setPreview = (index: number, value: boolean) => setPreviewStates((prev) => {
    const next = [...prev];
    next[index] = value;
    return next;
  });

  // Reference linker
  const [activeLinkerIndex, setActiveLinkerIndex] = useState(0);
  const [activeRefs, setActiveRefs] = useState<string[]>([]);
  const [activeNoteReferenceIds, setActiveNoteReferenceIds] = useState<string[]>([]);
  const [activeText, setActiveText] = useState("");
  const [linkedNotesSheetOpen, setLinkedNotesSheetOpen] = useState(false);
  const [activeStepLinkedNotes, setActiveStepLinkedNotes] = useState<RecipeNote[]>([]);

  const latest = useRef(instructionList);
  latest.current = instructionList;
  const setSteps = (updater: (steps: RecipeStep[]) => RecipeStep[]) => onChange(updater(latest.current));
  const updateStep = (index: number, patch: Partial<RecipeStep>) => setSteps(steps => steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  // Vue's deep watcher: any change to the list resets collapsed steps and re-derives section titles
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setDisabledSteps([]);
    setShowTitleEditor(prev => computeTitleEditors(instructionList, prev));
  }, [instructionList]);

  useEffect(() => {
    if (assets === undefined) onAssetsChange([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onMounted
  }, []);

  function toggleDisabled(stepIndex: number) {
    if (isEditForm) return;
    setDisabledSteps(prev => (prev.includes(stepIndex) ? prev.filter(i => i !== stepIndex) : [...prev, stepIndex]));
  }

  const isChecked = (stepIndex: number) => disabledSteps.includes(stepIndex) && !isEditForm;

  const sectionTitleLabel = (id?: string | null) => (id && showTitleEditor[id] ? i18n.t("recipe.clear-section") : i18n.t("recipe.add-section"));

  function toggleShowTitle(id?: string | null) {
    if (!id) return;
    const showing = showTitleEditor[id];
    if (showing) {
      // visibility is re-derived from the title whenever the list changes, so hiding a section
      // only sticks if the title goes with it
      setSteps(steps => steps.map(s => (s.id === id ? { ...s, title: "" } : s)));
    }
    setShowTitleEditor(prev => ({ ...prev, [id]: !showing }));
  }

  // ---------------------------------------------------------------
  // Reference Linker
  const availableDialogNextStep = activeLinkerIndex < instructionList.length - 1;
  const linkableNotes = (recipe.notes ?? []).filter((note): note is RecipeNote & { referenceId: string } => note.referenceId != null);

  function openReferenceDialog(idx: number) {
    setActiveLinkerIndex(idx);
    const step = latest.current[idx];
    if (!step) {
      setActiveRefs([]);
      setActiveNoteReferenceIds([]);
      return;
    }
    setActiveText(step.text ?? "");
    setActiveRefs((step.ingredientReferences ?? []).map(ref => ref.referenceId ?? ""));
    setActiveNoteReferenceIds((step.noteReferences ?? []).map(ref => ref.referenceId).filter((ref): ref is string => ref != null));
    setDialog(true);
  }

  function saveDialogLinks() {
    const index = activeLinkerIndex;
    if (!latest.current[index]) {
      setDialog(false);
      return;
    }
    const next = latest.current.map((s, i) => (i === index
      ? {
          ...s,
          ingredientReferences: activeRefs.map(referenceId => ({ referenceId })),
          noteReferences: activeNoteReferenceIds.map(referenceId => ({ referenceId })),
        }
      : s));
    latest.current = next;
    onChange(next);
    setDialog(false);
  }

  function saveAndOpenNextDialogLinks() {
    const currentStepIndex = activeLinkerIndex;
    if (!availableDialogNextStep) return;
    saveDialogLinks();
    setTimeout(() => openReferenceDialog(currentStepIndex + 1));
  }

  // Ingredients linked to other steps vs. still free, for the active step
  const { usedIngredients, unusedIngredients } = useMemo(() => {
    const usedRefs: Record<string, boolean> = {};
    instructionList.forEach((element, idx) => {
      if (idx === activeLinkerIndex) return;
      element.ingredientReferences?.forEach((ref) => {
        if (ref.referenceId) usedRefs[ref.referenceId] = true;
      });
    });
    return {
      usedIngredients: recipe.recipeIngredient.filter(ing => !!ing.referenceId && ing.referenceId in usedRefs),
      unusedIngredients: recipe.recipeIngredient.filter(ing => !!ing.referenceId && !(ing.referenceId in usedRefs)),
    };
  // activeRefs is a dependency in the Vue watcher too
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructionList, activeLinkerIndex, recipe.recipeIngredient, activeRefs]);

  function autoSetReferences() {
    const found = extractIngredientReferences(recipe.recipeIngredient, activeRefs, activeText);
    setActiveRefs(prev => [...prev, ...found]);
  }

  const noteLookup = useMemo(() => {
    const results: Record<string, string> = {};
    (recipe.notes ?? []).forEach((note) => {
      if (note.referenceId != null) results[note.referenceId] = note.title;
    });
    return results;
  }, [recipe.notes]);

  const notesByReferenceId = useMemo(() => {
    const results: Record<string, RecipeNote> = {};
    (recipe.notes ?? []).forEach((note) => {
      if (note.referenceId != null) results[note.referenceId] = note;
    });
    return results;
  }, [recipe.notes]);

  const linkedNotesForStep = (step: RecipeStep): RecipeNote[] => (step.noteReferences ?? [])
    .map(ref => (ref.referenceId ? notesByReferenceId[ref.referenceId] : undefined))
    .filter((note): note is RecipeNote => note !== undefined);

  function openLinkedNotesSheet(step: RecipeStep) {
    const notes = linkedNotesForStep(step);
    setActiveStepLinkedNotes(notes);
    setLinkedNotesSheetOpen(notes.length > 0);
  }

  const hasLinkedIngredients = (step: RecipeStep) => !!step.ingredientReferences && step.ingredientReferences.length > 0;
  const hasLinkedNotes = (step: RecipeStep) => linkedNotesForStep(step).length > 0;
  const hasCookModeLinkedContent = (step: RecipeStep) => hasLinkedIngredients(step) || hasLinkedNotes(step);

  const ingredientLookup = useMemo(() => {
    const results: Record<string, RecipeIngredient> = {};
    recipe.recipeIngredient.forEach((ing) => {
      if (ing.referenceId !== undefined && ing.referenceId !== null) results[ing.referenceId] = ing;
    });
    return results;
  }, [recipe.recipeIngredient]);

  // Map each ingredient's referenceId to its section title
  const ingredientSectionTitles = useMemo(() => {
    const titleMap: Record<string, string> = {};
    let currentTitle = "";
    recipe.recipeIngredient.forEach((ingredient) => {
      if (ingredient.referenceId === undefined || ingredient.referenceId === null) return;
      if (ingredient.title) currentTitle = ingredient.title;
      titleMap[ingredient.referenceId] = currentTitle;
    });
    return titleMap;
  }, [recipe.recipeIngredient]);

  const groupBySection = (list: RecipeIngredient[]) => {
    const groups: Record<string, RecipeIngredient[]> = {};
    list.forEach((ingredient) => {
      if (ingredient.referenceId === undefined || ingredient.referenceId === null) return;
      const title = ingredientSectionTitles[ingredient.referenceId] || ingredient.title || "";
      (groups[title] ||= []).push(ingredient);
    });
    return groups;
  };
  const groupedUnusedIngredients = groupBySection(unusedIngredients);
  const groupedUsedIngredients = groupBySection(usedIngredients);

  // ---------------------------------------------------------------
  // Instruction Merger
  function mergeAbove(target: number, source: number) {
    if (target < 0) return;
    const steps = latest.current;
    mergeHistory.current.push({ target, source, targetText: steps[target]!.text ?? "", sourceText: steps[source]!.text ?? "" });
    const next = steps.map((s, i) => (i === target ? { ...s, text: (s.text ?? "") + " " + (steps[source]!.text ?? "") } : s));
    next.splice(source, 1);
    onChange(next);
  }

  function undoMerge(event: KeyboardEvent) {
    if (!(event.ctrlKey && event.code === "KeyZ")) return;
    const lastMerge = mergeHistory.current.pop();
    if (!lastMerge) return;
    const next = latest.current.map((s, i) => (i === lastMerge.target ? { ...s, text: lastMerge.targetText } : s));
    next.splice(lastMerge.source, 0, { id: uuid4(), title: "", text: lastMerge.sourceText, ingredientReferences: [], noteReferences: [] });
    onChange(next);
  }

  function moveTo(dest: "top" | "bottom", source: number) {
    const next = [...latest.current];
    const [item] = next.splice(source, 1);
    if (dest === "top") next.unshift(item!);
    else next.push(item!);
    onChange(next);
  }

  function insert(dest: number) {
    const next = [...latest.current];
    next.splice(dest, 0, { id: uuid4(), text: "", title: "", ingredientReferences: [], noteReferences: [] });
    onChange(next);
  }

  function toggleCollapseSection(index: number) {
    const sectionSteps: number[] = [];
    for (let i = index; i < instructionList.length; i++) {
      if (i !== index && hasSectionTitle(instructionList[i]!.title)) break;
      sectionSteps.push(i);
    }
    const allCollapsed = sectionSteps.every(idx => disabledSteps.includes(idx));
    setDisabledSteps(allCollapsed ? disabledSteps.filter(idx => !sectionSteps.includes(idx)) : [...disabledSteps, ...sectionSteps]);
  }

  // ---------------------------------------------------------------
  // Image Uploader
  function embedAsset(index: number, asset: RecipeAsset) {
    onAssetsChange([...(assets ?? []), asset]);
    const assetUrl = recipeAssetPath(recipe.id, asset.fileName as string);
    const text = `<img src="${assetUrl}" height="100%" width="100%"/>`;
    setSteps(steps => steps.map((s, i) => (i === index ? { ...s, text: (s.text ?? "") + text } : s)));
  }

  async function handleImageDrop(index: number, files: File[]) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setLoadingStates(prev => ({ ...prev, [index]: true }));
    const { data } = await api.recipes.createAsset(recipe.slug, {
      name: file.name,
      icon: "mdi-file-image",
      file,
      extension: file.name.split(".").pop() || "",
    });
    setLoadingStates(prev => ({ ...prev, [index]: false }));
    if (!data) return; // TODO: Handle error
    embedAsset(index, data);
  }

  /** Images dragged out of another browser tab carry a URL; the server fetches them for us. */
  async function handleImageUrlDrop(index: number, url: string) {
    setLoadingStates(prev => ({ ...prev, [index]: true }));
    const { data } = await api.recipes.createAssetFromUrl(recipe.slug, url);
    setLoadingStates(prev => ({ ...prev, [index]: false }));
    if (!data) {
      alert.error(i18n.t("recipe.failed-to-attach-image"));
      return;
    }
    embedAsset(index, data);
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

  const checkboxList = (ingredients: RecipeIngredient[]) => ingredients.map(ing => (
    <FormControlLabel
      key={ing.referenceId!}
      sx={{ ml: 2, display: "flex", alignItems: "flex-start" }}
      control={(
        <Checkbox
          size="small"
          checked={activeRefs.includes(ing.referenceId!)}
          onChange={(e) => {
            const id = ing.referenceId!;
            setActiveRefs(prev => (e.target.checked ? [...prev, id] : prev.filter(r => r !== id)));
          }}
        />
      )}
      label={<Box sx={{ pt: 1 }}><RecipeIngredientHtml ingredient={ing} scale={scale} /></Box>}
    />
  ));

  const renderGroups = (groups: Record<string, RecipeIngredient[]>) => Object.entries(groups).map(([title, ingredients]) => (
    <Box key={title}>
      {title && <Typography variant="subtitle1" component="h4" sx={{ py: 1.5, ml: 0.5, pl: 2, fontWeight: "bold" }}>{title}</Typography>}
      {checkboxList(ingredients)}
    </Box>
  ));

  return (
    <Box component="section" sx={sx} onKeyUp={undoMerge}>
      {/* Ingredient Link Editor */}
      <BaseDialog
        open={dialog}
        onOpenChange={setDialog}
        title={i18n.t("recipe.link-references")}
        icon={icons.link}
        width="100%"
        maxWidth="600px"
        cardActions={(
          <Box sx={{ display: "flex", flexGrow: 1 }}>
            <BaseButton cancel onClick={() => setDialog(false)} />
            <Box sx={{ flex: 1 }} />
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 1 }}>
              <BaseButton color="info" onClick={autoSetReferences} iconSlot={<Icon path={icons.robot} />}>{i18n.t("recipe.auto")}</BaseButton>
              <BaseButton save onClick={saveDialogLinks} />
              {availableDialogNextStep && (
                <BaseButton sx={{ ml: 1, my: 0.5 }} onClick={saveAndOpenNextDialogLinks} iconSlot={<Icon path={icons.forward} />}>
                  {i18n.t("recipe.nextStep")}
                </BaseButton>
              )}
            </Box>
          </Box>
        )}
      >
        <Box sx={{ display: "grid", gap: 1, height: "100%", "& > *": { overflowY: "auto" } }}>
          <Box sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: "background.paper" }}>
            <Box sx={{ maxHeight: "40dvh", overflowY: "auto", p: 2, pt: 2 }}>
              <p>{activeText}</p>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" component="h4" sx={{ ml: 0.5, fontWeight: "bold" }}>{i18n.t("recipe.ingredients")}</Typography>
            </Box>
            <Divider />
          </Box>
          <CardContent>
            {Object.keys(groupedUnusedIngredients).length > 0 && (
              <>
                <Typography variant="subtitle1" component="h4" sx={{ ml: 0.5, fontWeight: "bold" }}>{i18n.t("recipe.unlinked")}</Typography>
                {renderGroups(groupedUnusedIngredients)}
              </>
            )}
            {Object.keys(groupedUsedIngredients).length > 0 && (
              <>
                <Typography variant="subtitle1" component="h4" sx={{ py: 1.5, ml: 0.5, fontWeight: "bold" }}>{i18n.t("recipe.linked-to-other-step")}</Typography>
                {renderGroups(groupedUsedIngredients)}
              </>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" component="h4" sx={{ ml: 0.5, mb: 1, fontWeight: "bold" }}>{i18n.t("recipe.notes")}</Typography>
            {linkableNotes.length === 0 && <Typography variant="body2" color="text.secondary">{i18n.t("recipe.no-notes-to-link")}</Typography>}
            {linkableNotes.map(note => (
              <FormControlLabel
                key={note.referenceId}
                sx={{ ml: 2, display: "flex" }}
                control={(
                  <Checkbox
                    size="small"
                    checked={activeNoteReferenceIds.includes(note.referenceId)}
                    onChange={(e) => {
                      const id = note.referenceId;
                      setActiveNoteReferenceIds(prev => (e.target.checked ? [...prev, id] : prev.filter(r => r !== id)));
                    }}
                  />
                )}
                label={note.title || i18n.t("recipe.note")}
              />
            ))}
          </CardContent>
        </Box>
        <Divider />
      </BaseDialog>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {!isCookMode && <Typography variant="h5" component="h2" sx={{ mt: 0.5, fontWeight: 500, opacity: 0.8 }}>{i18n.t("recipe.instructions")}</Typography>}
        {!isEditForm && !isCookMode && (
          <BaseButton minor cancel color="primary" onClick={toggleCookMode} iconSlot={<Icon path={icons.primary} />}>
            {i18n.t("recipe.cook-mode")}
          </BaseButton>
        )}
      </Box>

      <Drawer anchor="bottom" open={linkedNotesSheetOpen} onClose={() => setLinkedNotesSheetOpen(false)} slotProps={{ paper: { sx: { maxWidth: 900, mx: "auto", borderTopLeftRadius: 8, borderTopRightRadius: 8 } } }}>
        <Card>
          <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.5 }}>
            <Icon path={icons.noteTextOutline} size={20} sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ flex: 1 }}>{i18n.t("recipe.linked-notes-with-count", { count: activeStepLinkedNotes.length })}</Typography>
            <IconButton aria-label={i18n.t("general.close")} onClick={() => setLinkedNotesSheetOpen(false)}><Icon path={icons.close} /></IconButton>
          </Box>
          <Divider />
          <CardContent sx={{ pt: 2 }}>
            {activeStepLinkedNotes.map((note, noteIndex) => (
              <Box key={note.referenceId ?? note.title}>
                {noteIndex > 0 && <Divider sx={{ my: 1.5 }} />}
                <Typography variant="h6" sx={{ mb: 0.5 }}>{note.title || i18n.t("recipe.note")}</Typography>
                <SafeMarkdown source={note.text} />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Drawer>

      <SortableList
        items={instructionList}
        getId={(step, i) => step.id ?? `step-${i}`}
        onReorder={next => onChange(next)}
        disabled={!isEditForm}
        renderItem={(step, index, handle) => (
          <div className="list-group-item">
            {step.id && showTitleEditor[step.id] && (
              <Box
                sx={{ bgcolor: "primary.main", color: "#fff", mt: 3, mb: 1, display: "flex", alignItems: "center", p: isEditForm ? 1 : 1.5, borderRadius: "6px", cursor: "pointer", width: "100%" }}
                onClick={() => toggleCollapseSection(index)}
              >
                {isEditForm
                  ? (
                      <InputBase
                        value={step.title ?? ""}
                        onChange={e => updateStep(index, { title: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        placeholder={i18n.t("recipe.section-title")}
                        fullWidth
                        sx={{ color: "#fff", px: 1 }}
                      />
                    )
                  : <Typography variant="h6" sx={{ fontSize: "1.25rem" }}>{step.title}</Typography>}
              </Box>
            )}
            <Card
              elevation={2}
              sx={{ my: 1.5, cursor: isEditForm ? "default" : "pointer", transition: "box-shadow 200ms", "&:hover": { boxShadow: 12 }, ...(isChecked(index) ? { opacity: 0.5 } : {}) }}
              onClick={() => toggleDisabled(index)}
            >
              <Box sx={{ px: 2, pt: 1.5, pb: !isChecked(index) ? 0 : 1.5, whiteSpace: "normal", lineHeight: 1.25, wordBreak: "break-word" }}>
                <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                  {isEditForm
                    ? (
                        <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                          <Box ref={handle.ref} {...handle.attributes} {...handle.listeners} className="handle" sx={{ display: "flex", cursor: "grab", mr: 1 }}>
                            <Icon path={icons.arrowUpDown} size={26} />
                          </Box>
                          <InputBase
                            value={step.summary ?? ""}
                            onChange={e => updateStep(index, { summary: e.target.value })}
                            placeholder={i18n.t("recipe.step-index", { step: index + 1 })}
                            fullWidth
                            sx={{ fontSize: "1.5rem" }}
                          />
                        </Box>
                      )
                    : (
                        <Box sx={{ flex: "1 1 auto", minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere", cursor: "pointer", typography: "h6", fontSize: "1.25rem" }}>
                          {step.summary ? <SafeMarkdown sx={{ pr: 1 }} source={step.summary} /> : <span>{i18n.t("recipe.step-index", { step: index + 1 })}</span>}
                        </Box>
                      )}
                  {isEditForm && (
                    <Box sx={{ ml: "auto" }} onClick={e => e.stopPropagation()}>
                      <BaseButtonGroup
                        large={false}
                        buttons={[
                          { icon: icons.delete, text: i18n.t("general.delete"), event: "delete" },
                          {
                            icon: icons.dotsVertical,
                            text: "",
                            event: "open",
                            children: [
                              { text: sectionTitleLabel(step.id), event: "toggle-section" },
                              { text: i18n.t("recipe.link-references"), event: "link-references" },
                              { text: i18n.t("recipe.upload-image"), event: "upload-image" },
                              {
                                icon: previewStates[index] ? icons.edit : icons.eye,
                                text: previewStates[index] ? i18n.t("recipe.edit-markdown") : i18n.t("markdown-editor.preview-markdown-button-label"),
                                event: "preview-step",
                                divider: true,
                              },
                              { text: i18n.t("recipe.merge-above"), event: "merge-above" },
                              { text: i18n.t("recipe.move-to-top"), event: "move-to-top" },
                              { text: i18n.t("recipe.move-to-bottom"), event: "move-to-bottom" },
                              { text: i18n.t("recipe.insert-above"), event: "insert-above" },
                              { text: i18n.t("recipe.insert-below"), event: "insert-below" },
                            ],
                          },
                        ]}
                        onEvent={(e) => {
                          switch (e) {
                            case "merge-above": mergeAbove(index - 1, index); break;
                            case "move-to-top": moveTo("top", index); break;
                            case "move-to-bottom": moveTo("bottom", index); break;
                            case "insert-above": insert(index); break;
                            case "insert-below": insert(index + 1); break;
                            case "toggle-section": toggleShowTitle(step.id); break;
                            case "link-references": openReferenceDialog(index); break;
                            case "preview-step": setPreview(index, !previewStates[index]); break;
                            case "upload-image": openImageUpload(index); break;
                            case "delete": onChange(latest.current.filter((_s, i) => i !== index)); break;
                          }
                        }}
                      />
                    </Box>
                  )}
                  {!isEditForm && (
                    <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
                      {hasLinkedNotes(step) && !isCookMode && (
                        <Tooltip title={i18n.t("recipe.linked-notes-with-count", { count: linkedNotesForStep(step).length })} placement="top">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLinkedNotesSheet(step);
                            }}
                          >
                            <Icon path={icons.noteTextOutline} size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Fade in={isChecked(index)}>
                        <span><Icon path={icons.checkboxMarkedCircle} size={24} color="success" /></span>
                      </Fade>
                    </Box>
                  )}
                </Box>
              </Box>

              {isEditForm && loadingStates[index] && <LinearProgress />}

              <DropZone
                onDrop={f => void handleImageDrop(index, f)}
                onDropUrl={u => void handleImageUrlDrop(index, u)}
                onDropUnsupported={() => alert.error(i18n.t("recipe.image-drop-unsupported"))}
              >
                {isEditForm && (
                  <CardContent onClick={() => onClickInstructionField?.(`${index}.text`)}>
                    <MarkdownEditor
                      value={step.text}
                      onChange={text => updateStep(index, { text })}
                      preview={!!previewStates[index]}
                      onPreviewChange={v => setPreview(index, v)}
                      displayPreview={false}
                      textarea={{ hint: i18n.t("recipe.attach-images-hint"), persistentHint: true }}
                    />
                    {step.ingredientReferences && step.ingredientReferences.length > 0 && (
                      <div>
                        {step.ingredientReferences.map((linkRef, i) => (
                          <Box key={linkRef.referenceId ?? i} sx={{ mb: 0.5 }}>
                            {linkRef.referenceId && ingredientLookup[linkRef.referenceId] && (
                              <RecipeIngredientHtml ingredient={ingredientLookup[linkRef.referenceId]} scale={scale} />
                            )}
                          </Box>
                        ))}
                      </div>
                    )}
                    {step.noteReferences && step.noteReferences.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        {step.noteReferences.map((noteRef, i) => (
                          <Box key={noteRef.referenceId ?? i} sx={{ mb: 0.5, display: "flex", alignItems: "center", typography: "body2" }}>
                            <Icon path={icons.noteTextOutline} size={14} sx={{ mr: 0.5 }} />
                            {noteRef.referenceId != null ? (noteLookup[noteRef.referenceId] || i18n.t("recipe.note")) : ""}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                )}
              </DropZone>
              <Collapse in={!isChecked(index) && !isEditForm} unmountOnExit>
                <CardContent sx={{ fontSize: "1rem", "& ul > li": { display: "list-item", listStyleType: "disc" }, "& ol > li": { display: "list-item" } }}>
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
                        {hasLinkedNotes(step) && linkedNotesForStep(step).map((note, noteIndex) => (
                          <Box key={note.referenceId ?? note.title}>
                            {noteIndex > 0 && <Divider sx={{ my: 1.5 }} />}
                            <Typography variant="h6" sx={{ mb: 0.5 }}>{note.title || i18n.t("recipe.note")}</Typography>
                            <SafeMarkdown source={note.text} />
                          </Box>
                        ))}
                      </Grid>
                    )}
                    {isCookMode && hasCookModeLinkedContent(step) && display.smAndUp && <Divider orientation="vertical" flexItem />}
                    <Grid size="grow">
                      <SafeMarkdown className="markdown" source={step.text} />
                    </Grid>
                  </Grid>
                </CardContent>
              </Collapse>
            </Card>
          </div>
        )}
      />
      {!isCookMode && <Divider sx={{ mt: 5, display: { xs: "flex", md: "none" } }} />}
    </Box>
  );
}

export default RecipePageInstructions;
