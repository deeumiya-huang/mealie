import { useEffect, useMemo, useState } from "react";
import { useUserApi } from "@/hooks/api";
import { useFoodData, useFoodStore, useUnitData, useUnitStore } from "@/hooks/store";
import { useGroupSelf } from "@/hooks/use-groups";
import { alert } from "@/hooks/use-toast";
import { useParsingPreferences } from "@/hooks/use-users/preferences";
import type { UserParsingPreferences } from "@/hooks/use-users/preferences";
import { uuid4 } from "@/hooks/use-utils";
import { useI18n, type TranslateFn } from "@/i18n";
import type { NoUndefinedField } from "@/lib/api/types/non-generated";
import type { IngredientFood, IngredientUnit, ParsedIngredient, RecipeIngredient } from "@/lib/api/types/recipe";
import type { Parser } from "@/lib/api/user/recipes/recipe";
import type { UserApi } from "@/lib/api";
import { createStore, useStore, type Store } from "@/lib/store";
import { useIngredientTextParser } from "./use-recipe-ingredients";

export enum ParseStep {
  LOADING,
  INFO,
  PARSE,
  REVIEW,
}

export interface ParseDialogState {
  currentParsedIndex: number;
  allReviewed: boolean;
  saveLoading: boolean;
  step: ParseStep;
  loadingCount: number;
  // Tracked separately from loadingCount, which covers the bulk parse: one ingredient can be
  // missing both a unit and a food, and only the button that was pressed should react.
  loading: {
    unit: boolean;
    food: boolean;
  };
}

export interface AvailableParser {
  text: string;
  value: Parser;
  hide?: boolean;
}

/** Everything the dialog shows (Vue: the refs and the reactive `state` of the composable). */
interface ParseModel {
  parser: Parser;
  dontShowInfoPage: boolean;
  parsedIngs: ParsedIngredient[];
  currentIng: ParsedIngredient | null;
  currentMissingUnit: string;
  currentMissingFood: string;
  currentIngShouldDelete: boolean;
  state: ParseDialogState;
}

interface ParseDeps {
  api: UserApi;
  t: TranslateFn;
  unitStore: ReturnType<typeof useUnitStore>;
  foodStore: ReturnType<typeof useFoodStore>;
  unitData: IngredientUnit;
  foodData: IngredientFood;
  ingredients: NoUndefinedField<RecipeIngredient[]>;
  onSave: (ingredients: NoUndefinedField<RecipeIngredient>[]) => void;
  setParserPreferences: (next: (prev: UserParsingPreferences) => UserParsingPreferences) => void;
  ingredientToParserString: (ingredient: RecipeIngredient) => string;
}

/**
 * If confidence of parsing is below this threshold,
 * we will prompt the user to review the parsed ingredient.
 */
const confidenceThreshold = 0.85;

function shouldReview(ing: ParsedIngredient): boolean {
  console.debug(`Checking if ingredient needs review (input="${ing.input})":`, ing);

  if (ing.ingredient.referencedRecipe) {
    console.debug("No review needed for sub-recipe ingredient");
    return false;
  }

  if ((ing.confidence?.average || 0) < confidenceThreshold) {
    console.debug("Needs review due to low confidence:", ing.confidence?.average);
    return true;
  }

  const food = ing.ingredient.food;
  if (food && !food.id) {
    console.debug("Needs review due to missing food ID:", food);
    return true;
  }

  const unit = ing.ingredient.unit;
  if (unit && !unit.id) {
    console.debug("Needs review due to missing unit ID:", unit);
    return true;
  }

  console.debug("No review needed");
  return false;
}

function newParsedIngredient(): ParsedIngredient {
  return {
    input: "",
    confidence: {},
    ingredient: {
      quantity: 0,
      referenceId: uuid4(),
    },
  };
}

/**
 * The composable's logic over a store, so consecutive calls see each other's changes synchronously like Vue's
 * refs did (several tests and handlers call two functions in a row). `setDeps` keeps the hook values current.
 */
function createParseDialog(store: Store<ParseModel>, initialDeps: ParseDeps) {
  const deps = { current: initialDeps };

  /** Cache of lowercased created units to avoid duplicate creations */
  const createdUnits = new Map<string, IngredientUnit>();
  /** Cache of lowercased created foods to avoid duplicate creations */
  const createdFoods = new Map<string, IngredientFood>();

  const get = () => store.get();

  function patch(values: Partial<ParseModel> | ((prev: ParseModel) => Partial<ParseModel>)) {
    store.set((prev) => {
      const next = { ...prev, ...(typeof values === "function" ? values(prev) : values) };
      // Vue: watch([parsedIngs, () => state.allReviewed], …, { immediate: true, deep: true })
      if (next.state.allReviewed && !next.parsedIngs.length) {
        next.parsedIngs = [newParsedIngredient()];
      }
      return next;
    });
  }

  function patchState(values: Partial<ParseDialogState>) {
    patch(prev => ({ state: { ...prev.state, ...values } }));
  }

  /** Replaces the current ingredient, and the same object in `parsedIngs` (Vue mutated it in place). */
  function updateCurrentIng(update: (ing: ParsedIngredient) => ParsedIngredient) {
    patch((prev) => {
      const current = prev.currentIng;
      if (!current) {
        return {};
      }
      const updated = update(current);
      return {
        currentIng: updated,
        parsedIngs: prev.parsedIngs.map(ing => (ing === current ? updated : ing)),
      };
    });
  }

  function setIngredientAt(index: number, ingredient: RecipeIngredient) {
    patch((prev) => {
      const target = prev.parsedIngs[index];
      if (!target) {
        return {};
      }
      const updated = { ...target, ingredient };
      return {
        parsedIngs: prev.parsedIngs.map((ing, i) => (i === index ? updated : ing)),
        currentIng: prev.currentIng === target ? updated : prev.currentIng,
      };
    });
  }

  function getNextStep(current: ParseStep): ParseStep {
    switch (current) {
      case ParseStep.LOADING:
        if (!get().dontShowInfoPage) {
          console.log("showing info");
          return ParseStep.INFO;
        };
        return getNextStep(ParseStep.INFO);
      case ParseStep.INFO:
        if (!get().state.allReviewed) {
          return ParseStep.PARSE;
        }
        return ParseStep.REVIEW;
      case ParseStep.PARSE:
      case ParseStep.REVIEW:
        return ParseStep.REVIEW;
    }
  }

  function nextStep() {
    patchState({ step: getNextStep(get().state.step) });
  }

  /** Vue `checkUnit` + `checkFood` on the ingredient about to be reviewed. */
  function checkUnitAndFood(ing: ParsedIngredient): ParsedIngredient {
    let ingredient = ing.ingredient;
    let currentMissingUnit = "";
    let currentMissingFood = "";

    const unit = ingredient.unit?.name;
    if (unit && !ingredient.unit?.id) {
      const potentialMatch = createdUnits.get(unit.toLowerCase());
      if (potentialMatch) {
        ingredient = { ...ingredient, unit: potentialMatch };
      }
      else {
        currentMissingUnit = unit;
        ingredient = { ...ingredient, unit: undefined };
      }
    }

    const food = ingredient.food?.name;
    if (food && !ingredient.food?.id) {
      const potentialMatch = createdFoods.get(food.toLowerCase());
      if (potentialMatch) {
        ingredient = { ...ingredient, food: potentialMatch };
      }
      else {
        currentMissingFood = food;
        ingredient = { ...ingredient, food: undefined };
      }
    }

    const checked = ingredient === ing.ingredient ? ing : { ...ing, ingredient };
    patch(prev => ({
      currentMissingUnit,
      currentMissingFood,
      parsedIngs: prev.parsedIngs.map(p => (p === ing ? checked : p)),
    }));
    return checked;
  }

  function nextIngredient() {
    let nextIndex = get().state.currentParsedIndex;
    if (get().currentIngShouldDelete) {
      const index = nextIndex;
      patch(prev => ({
        parsedIngs: prev.parsedIngs.filter((_, i) => i !== index),
        currentIngShouldDelete: false,
      }));
    }
    else {
      nextIndex += 1;
    }

    while (nextIndex < get().parsedIngs.length) {
      const current = get().parsedIngs[nextIndex]!;
      if (shouldReview(current)) {
        const index = nextIndex;
        patch(prev => ({
          state: { ...prev.state, currentParsedIndex: index },
          currentIng: current,
          currentIngShouldDelete: false,
        }));
        const checked = checkUnitAndFood(current);
        patch({ currentIng: checked });
        return;
      }

      nextIndex += 1;
    }

    // No more to review
    patchState({ allReviewed: true });
    nextStep();
  }

  /** Clear everything left over from a previous run, so re-opening the dialog starts clean */
  function resetParserState() {
    patch(prev => ({
      parsedIngs: [],
      currentIng: null,
      currentMissingUnit: "",
      currentMissingFood: "",
      currentIngShouldDelete: false,
      state: {
        ...prev.state,
        currentParsedIndex: -1,
        allReviewed: false,
        step: ParseStep.LOADING,
        saveLoading: false,
      },
    }));
    createdUnits.clear();
    createdFoods.clear();
  }

  async function parseIngredients() {
    if (get().state.loadingCount > 0) {
      return;
    }

    resetParserState();

    const { ingredients, api, ingredientToParserString, t } = deps.current;
    if (!ingredients || ingredients.length === 0) {
      nextStep();
      return;
    }
    try {
      const filteredIngredients = ingredients.filter(ing => !ing.referencedRecipe);
      const ingsAsString = filteredIngredients.map(ing => ingredientToParserString(ing));
      patchState({ loadingCount: get().state.loadingCount + 1 });
      const { data, error } = await api.recipes.parseIngredients(get().parser, ingsAsString);
      if (error || !data) {
        throw new Error("Failed to parse ingredients");
      }

      // Restore section titles from original ingredients — the parser doesn't return them
      const parsed = data.map((ing, index) => ({
        ...ing,
        ingredient: { ...ing.ingredient, title: filteredIngredients[index]?.title || "" },
      }));

      const recipeRefs: ParsedIngredient[] = ingredients.filter(ing => ing.referencedRecipe).map(ing => ({
        input: ing.note || "",
        confidence: {},
        ingredient: ing,
      }));
      patch(prev => ({
        parsedIngs: [...parsed, ...recipeRefs],
        state: { ...prev.state, currentParsedIndex: -1, allReviewed: false },
        currentIngShouldDelete: false,
      }));
      createdUnits.clear();
      createdFoods.clear();
      nextIngredient();
    }
    catch (error) {
      console.error("Error parsing ingredients:", error);
      alert.error(t("events.something-went-wrong"));
    }
    finally {
      patchState({ loadingCount: get().state.loadingCount - 1 });
      nextStep();
    }
  }

  function setLoading(kind: "unit" | "food", value: boolean) {
    patch(prev => ({ state: { ...prev.state, loading: { ...prev.state.loading, [kind]: value } } }));
  }

  async function createMissingUnit() {
    const missing = get().currentMissingUnit;
    if (!missing) {
      return;
    }

    const { unitStore, unitData, t } = deps.current;
    const data = { ...unitData, name: missing };

    setLoading("unit", true);
    try {
      let newUnit: IngredientUnit | null;
      if (createdUnits.has(data.name)) {
        newUnit = createdUnits.get(data.name)!;
      }
      else {
        newUnit = await unitStore.actions.createOne(data);
      }

      if (!newUnit) {
        alert.error(t("general.cant-create-permission"));
        return;
      }

      const unit = newUnit;
      updateCurrentIng(ing => ({ ...ing, ingredient: { ...ing.ingredient, unit } }));
      createdUnits.set(unit.name.toLowerCase(), unit);
      patch({ currentMissingUnit: "" });
    }
    finally {
      setLoading("unit", false);
    }
  }

  async function createMissingFood() {
    const missing = get().currentMissingFood;
    if (!missing) {
      return;
    }

    const { foodStore, foodData, t } = deps.current;
    const data = { ...foodData, name: missing };

    setLoading("food", true);
    try {
      let newFood: IngredientFood | null;
      if (createdFoods.has(data.name)) {
        newFood = createdFoods.get(data.name)!;
      }
      else {
        newFood = await foodStore.actions.createOne(data);
      }

      if (!newFood) {
        alert.error(t("general.cant-create-permission"));
        return;
      }

      const food = newFood;
      updateCurrentIng(ing => ({ ...ing, ingredient: { ...ing.ingredient, food } }));
      createdFoods.set(food.name.toLowerCase(), food);
      patch({ currentMissingFood: "" });
    }
    finally {
      setLoading("food", false);
    }
  }

  async function addMissingUnitAsAlias() {
    const current = get().currentIng?.ingredient.unit as IngredientUnit | undefined;
    const missing = get().currentMissingUnit;
    if (!missing || !current?.id) {
      return;
    }

    const aliases = current.aliases || [];
    if (aliases.map(a => a.name).includes(missing)) {
      return;
    }

    const unit: IngredientUnit = { ...current, aliases: [...aliases, { name: missing }] };
    updateCurrentIng(ing => ({ ...ing, ingredient: { ...ing.ingredient, unit } }));

    const { unitStore, t } = deps.current;
    setLoading("unit", true);
    try {
      const updated = await unitStore.actions.updateOne(unit);
      if (!updated) {
        alert.error(t("events.something-went-wrong"));
        return;
      }

      updateCurrentIng(ing => ({ ...ing, ingredient: { ...ing.ingredient, unit: updated } }));
      patch({ currentMissingUnit: "" });
    }
    finally {
      setLoading("unit", false);
    }
  }

  async function addMissingFoodAsAlias() {
    const current = get().currentIng?.ingredient.food as IngredientFood | undefined;
    const missing = get().currentMissingFood;
    if (!missing || !current?.id) {
      return;
    }

    const aliases = current.aliases || [];
    if (aliases.map(a => a.name).includes(missing)) {
      return;
    }

    const food: IngredientFood = { ...current, aliases: [...aliases, { name: missing }] };
    updateCurrentIng(ing => ({ ...ing, ingredient: { ...ing.ingredient, food } }));

    const { foodStore, t } = deps.current;
    setLoading("food", true);
    try {
      const updated = await foodStore.actions.updateOne(food);
      if (!updated) {
        alert.error(t("events.something-went-wrong"));
        return;
      }

      updateCurrentIng(ing => ({ ...ing, ingredient: { ...ing.ingredient, food: updated } }));
      patch({ currentMissingFood: "" });
    }
    finally {
      setLoading("food", false);
    }
  }

  function insertNewIngredient(index: number) {
    patch(prev => ({
      parsedIngs: [...prev.parsedIngs.slice(0, index), newParsedIngredient(), ...prev.parsedIngs.slice(index)],
    }));
  }

  function saveIngs() {
    deps.current.onSave(get().parsedIngs.map(x => x.ingredient as NoUndefinedField<RecipeIngredient>));
    patchState({ saveLoading: true });
  }

  // Setters for what Vue exposed as writable refs (v-model in the dialog parts).
  function setParser(parser: Parser) {
    patch({ parser });
    // Vue: watch(parser, () => parserPreferences.value.parser = parser.value)
    deps.current.setParserPreferences(prev => ({ ...prev, parser }));
  }

  function setDontShowInfoPage(dontShowInfoPage: boolean) {
    patch({ dontShowInfoPage });
    // Vue: watch(dontShowInfoPage, () => parserPreferences.value.dontShowInfoPage = dontShowInfoPage.value)
    deps.current.setParserPreferences(prev => ({ ...prev, dontShowInfoPage }));
  }

  return {
    store,
    nextStep,
    saveIngs,
    nextIngredient,
    parseIngredients,
    insertNewIngredient,
    addMissingFoodAsAlias,
    addMissingUnitAsAlias,
    createMissingFood,
    createMissingUnit,
    setParser,
    setDontShowInfoPage,
    setParsedIngs: (parsedIngs: ParsedIngredient[]) => patch({ parsedIngs }),
    setCurrentIng: (currentIng: ParsedIngredient | null) => patch({ currentIng }),
    /** Edits the ingredient under review (Vue: `v-model="currentIng.ingredient"`). */
    setCurrentIngredient: (ingredient: RecipeIngredient) => updateCurrentIng(ing => ({ ...ing, ingredient })),
    /** Edits the ingredient at `index` (Vue: `v-model="ingredient.ingredient"` in the review list). */
    setIngredientAt,
    deleteIngredientAt: (index: number) => patch(prev => ({ parsedIngs: prev.parsedIngs.filter((_, i) => i !== index) })),
    setCurrentMissingUnit: (currentMissingUnit: string) => patch({ currentMissingUnit }),
    setCurrentMissingFood: (currentMissingFood: string) => patch({ currentMissingFood }),
    setCurrentIngShouldDelete: (currentIngShouldDelete: boolean) => patch({ currentIngShouldDelete }),
    setState: patchState,
    setDeps: (next: ParseDeps) => {
      deps.current = next;
    },
  };
}

/**
 * Port of composables/recipes/use-parse-ingredients-dialog.ts. Vue returned refs and a reactive `state`; here the
 * values are plain (re-rendered on change) and every writable ref has a setter (`setParser`, `setParsedIngs`,
 * `setCurrentIng`, `setCurrentMissingUnit/Food`, `setCurrentIngShouldDelete`, `setDontShowInfoPage`, `setState`).
 * `ingredients` is read when parsing starts, so the latest recipe ingredients are parsed.
 */
export function useParseIngredientsDialog(
  ingredients: NoUndefinedField<RecipeIngredient[]>,
  onSave: (ingredients: NoUndefinedField<RecipeIngredient>[]) => void,
) {
  const { ingredientToParserString } = useIngredientTextParser();

  const { group } = useGroupSelf();
  const i18n = useI18n();
  const api = useUserApi();

  const unitStore = useUnitStore();
  const unitData = useUnitData();
  const foodStore = useFoodStore();
  const foodData = useFoodData();

  // The natural language parser is trained on English recipes, so it isn't a sensible default for
  // other languages: it recognises the quantity but leaves the unit in the food name.
  const isEnglishLocale = (i18n.locale || "").toLowerCase().startsWith("en");
  const [parserPreferences, setParserPreferences] = useParsingPreferences(isEnglishLocale ? "nlp" : "brute");

  const deps: ParseDeps = {
    api,
    t: i18n.t,
    unitStore,
    foodStore,
    unitData: unitData.data,
    foodData: foodData.data,
    ingredients,
    onSave,
    setParserPreferences,
    ingredientToParserString,
  };

  const [dialog] = useState(() => createParseDialog(createStore<ParseModel>({
    parser: parserPreferences.parser || "nlp",
    dontShowInfoPage: parserPreferences.dontShowInfoPage,
    parsedIngs: [],
    currentIng: null,
    currentMissingUnit: "",
    currentMissingFood: "",
    currentIngShouldDelete: false,
    state: {
      currentParsedIndex: -1,
      allReviewed: false,
      saveLoading: false,
      step: ParseStep.LOADING,
      loadingCount: 0,
      loading: {
        unit: false,
        food: false,
      },
    },
  }), deps));

  useEffect(() => {
    dialog.setDeps(deps);
  });

  const model = useStore(dialog.store);
  const { store: _store, setDeps: _setDeps, ...actions } = dialog;

  const aiEnabled = !!group?.aiProviderSettings?.aiEnabled;
  const availableParsers = useMemo((): AvailableParser[] => {
    return [
      {
        text: i18n.t("recipe.parser.natural-language-processor"),
        value: "nlp",
      },
      {
        text: i18n.t("recipe.parser.brute-parser"),
        value: "brute",
      },
      {
        text: i18n.t("recipe.parser.openai-parser"),
        value: "openai",
        hide: !aiEnabled,
      },
    ];
  }, [i18n, aiEnabled]);

  const showNlpLanguageHint = model.parser === "nlp" && !isEnglishLocale;
  const currentIngHasError = model.currentMissingUnit || model.currentMissingFood;
  const ingredientsToReviewCount = model.parsedIngs.filter(shouldReview).length;
  const autoParsedIngredientsCount = model.parsedIngs.length - ingredientsToReviewCount;

  return {
    currentIngHasError,
    availableParsers,
    parserPreferences,
    parser: model.parser,
    showNlpLanguageHint,
    dontShowInfoPage: model.dontShowInfoPage,
    confidenceThreshold,
    parsedIngs: model.parsedIngs,
    currentIng: model.currentIng,
    currentMissingUnit: model.currentMissingUnit,
    currentMissingFood: model.currentMissingFood,
    currentIngShouldDelete: model.currentIngShouldDelete,
    state: model.state,
    ingredientsToReviewCount,
    autoParsedIngredientsCount,
    ...actions,
  };
}

export type ParseIngredientsDialogState = ReturnType<typeof useParseIngredientsDialog>;
