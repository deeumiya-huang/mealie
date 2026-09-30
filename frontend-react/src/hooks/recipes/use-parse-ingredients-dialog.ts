import { useEffect, useRef, useSyncExternalStore } from "react";
import { alert } from "~/hooks/use-toast";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { IngredientFood, IngredientUnit, ParsedIngredient, RecipeIngredient } from "~/lib/api/types/recipe";
import type { Parser } from "~/lib/api/user/recipes/recipe";
import type { UserParsingPreferences } from "~/hooks/use-users/preferences";
import { useUserApi } from "~/hooks/api";
import { useFoodData, useFoodStore, useUnitData, useUnitStore } from "~/hooks/store";
import { useGroupSelf } from "~/hooks/use-groups";
import { useI18n } from "~/hooks/use-global-i18n";
import { useParsingPreferences } from "~/hooks/use-users/preferences";
import { uuid4 } from "~/hooks/use-utils";
import { useIngredientTextParser } from "./use-recipe-ingredients";

export enum ParseStep {
  LOADING,
  INFO,
  PARSE,
  REVIEW,
}

/** Everything the parse workflow needs from the app; refreshed on every render by the hook. */
export interface ParseDialogDeps {
  ingredients: NoUndefinedField<RecipeIngredient[]>;
  onSave: (ingredients: NoUndefinedField<RecipeIngredient>[]) => void;
  t: (key: string) => string;
  locale: string;
  aiEnabled: boolean;
  parseIngredients: (parser: Parser, ingredients: string[]) => Promise<{ data: ParsedIngredient[] | null | undefined; error?: unknown }>;
  ingredientToParserString: (ingredient: RecipeIngredient) => string;
  createUnit: (unit: IngredientUnit) => Promise<IngredientUnit | null | undefined>;
  updateUnit: (unit: IngredientUnit) => Promise<IngredientUnit | null | undefined>;
  createFood: (food: IngredientFood) => Promise<IngredientFood | null | undefined>;
  updateFood: (food: IngredientFood) => Promise<IngredientFood | null | undefined>;
  emptyUnit: () => IngredientUnit;
  emptyFood: () => IngredientFood;
  preferences: () => UserParsingPreferences;
  setPreferences: (patch: Partial<UserParsingPreferences>) => void;
}

/**
 * If confidence of parsing is below this threshold,
 * we will prompt the user to review the parsed ingredient.
 */
const confidenceThreshold = 0.85;

/**
 * The ingredient parsing workflow as a plain mutable object, so its state reads live (the Vue
 * composable was built on reactive refs). Every mutation made through its methods notifies
 * subscribers; the hook below re-renders on that.
 */
export function createParseIngredientsController(initialDeps: ParseDialogDeps) {
  let deps = initialDeps;
  const listeners = new Set<() => void>();
  let version = 0;

  /** Cache of lowercased created units to avoid duplicate creations */
  const createdUnits = new Map<string, IngredientUnit>();
  /** Cache of lowercased created foods to avoid duplicate creations */
  const createdFoods = new Map<string, IngredientFood>();

  const isEnglishLocale = () => (deps.locale || "").toLowerCase().startsWith("en");

  const state = {
    currentParsedIndex: -1,
    allReviewed: false,
    saveLoading: false,
    step: ParseStep.LOADING,
    loadingCount: 0,
    // Tracked separately from loadingCount, which covers the bulk parse: one ingredient can be
    // missing both a unit and a food, and only the button that was pressed should react.
    loading: { unit: false, food: false },
  };

  const ctrl = {
    state,
    confidenceThreshold,
    parsedIngs: [] as ParsedIngredient[],
    currentIng: null as ParsedIngredient | null,
    currentMissingUnit: "",
    currentMissingFood: "",
    currentIngShouldDelete: false,
    _parser: (initialDeps.preferences().parser || "nlp") as Parser,
    _dontShowInfoPage: initialDeps.preferences().dontShowInfoPage,

    get parser(): Parser {
      return ctrl._parser;
    },
    set parser(value: Parser) {
      ctrl._parser = value;
      deps.setPreferences({ parser: value });
      notify();
    },
    get dontShowInfoPage(): boolean {
      return ctrl._dontShowInfoPage;
    },
    set dontShowInfoPage(value: boolean) {
      ctrl._dontShowInfoPage = value;
      deps.setPreferences({ dontShowInfoPage: value });
      notify();
    },
    get parserPreferences() {
      return deps.preferences();
    },
    get currentIngHasError() {
      return ctrl.currentMissingUnit || ctrl.currentMissingFood;
    },
    // The natural language parser is trained on English recipes, so it isn't a sensible default
    // for other languages: it recognises the quantity but leaves the unit in the food name.
    get showNlpLanguageHint() {
      return ctrl.parser === "nlp" && !isEnglishLocale();
    },
    get availableParsers() {
      return [
        { text: deps.t("recipe.parser.natural-language-processor"), value: "nlp" },
        { text: deps.t("recipe.parser.brute-parser"), value: "brute" },
        { text: deps.t("recipe.parser.openai-parser"), value: "openai", hide: !deps.aiEnabled },
      ];
    },
    get ingredientsToReviewCount() {
      return ctrl.parsedIngs.filter(shouldReview).length;
    },
    get autoParsedIngredientsCount() {
      return ctrl.parsedIngs.length - ctrl.ingredientsToReviewCount;
    },

    nextStep() {
      state.step = getNextStep(state.step);
      notify();
    },
    nextIngredient,
    parseIngredients,
    insertNewIngredient,
    saveIngs() {
      deps.onSave(ctrl.parsedIngs.map(x => x.ingredient as NoUndefinedField<RecipeIngredient>));
      state.saveLoading = true;
      notify();
    },
    createMissingUnit,
    createMissingFood,
    addMissingUnitAsAlias,
    addMissingFoodAsAlias,

    // plumbing for the hook
    setDeps(next: ParseDialogDeps) {
      deps = next;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getVersion: () => version,
    notify: () => notify(),
  };

  function notify() {
    // watch([parsedIngs, allReviewed], { immediate, deep }): never leave the review list empty
    if (state.allReviewed && !ctrl.parsedIngs.length) {
      insertNewIngredient(0, false);
    }
    version++;
    for (const listener of [...listeners]) listener();
  }

  function getNextStep(current: ParseStep): ParseStep {
    switch (current) {
      case ParseStep.LOADING:
        if (!ctrl._dontShowInfoPage) {
          console.log("showing info");
          return ParseStep.INFO;
        }
        return getNextStep(ParseStep.INFO);
      case ParseStep.INFO:
        return !state.allReviewed ? ParseStep.PARSE : ParseStep.REVIEW;
      case ParseStep.PARSE:
      case ParseStep.REVIEW:
        return ParseStep.REVIEW;
    }
  }

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

  function checkUnit(ing: ParsedIngredient) {
    const unit = ing.ingredient.unit?.name;
    if (!unit || ing.ingredient.unit?.id) {
      ctrl.currentMissingUnit = "";
      return;
    }
    const potentialMatch = createdUnits.get(unit.toLowerCase());
    if (potentialMatch) {
      ing.ingredient.unit = potentialMatch;
      ctrl.currentMissingUnit = "";
      return;
    }
    ctrl.currentMissingUnit = unit;
    ing.ingredient.unit = undefined;
  }

  function checkFood(ing: ParsedIngredient) {
    const food = ing.ingredient.food?.name;
    if (!food || ing.ingredient.food?.id) {
      ctrl.currentMissingFood = "";
      return;
    }
    const potentialMatch = createdFoods.get(food.toLowerCase());
    if (potentialMatch) {
      ing.ingredient.food = potentialMatch;
      ctrl.currentMissingFood = "";
      return;
    }
    ctrl.currentMissingFood = food;
    ing.ingredient.food = undefined;
  }

  function nextIngredient() {
    let nextIndex = state.currentParsedIndex;
    if (ctrl.currentIngShouldDelete) {
      ctrl.parsedIngs.splice(state.currentParsedIndex, 1);
      ctrl.currentIngShouldDelete = false;
    }
    else {
      nextIndex += 1;
    }

    while (nextIndex < ctrl.parsedIngs.length) {
      const current = ctrl.parsedIngs[nextIndex]!;
      if (shouldReview(current)) {
        state.currentParsedIndex = nextIndex;
        ctrl.currentIng = current;
        ctrl.currentIngShouldDelete = false;
        checkUnit(current);
        checkFood(current);
        notify();
        return;
      }
      nextIndex += 1;
    }

    // No more to review
    state.allReviewed = true;
    ctrl.nextStep();
  }

  /** Clear everything left over from a previous run, so re-opening the dialog starts clean */
  function resetParserState() {
    ctrl.parsedIngs = [];
    ctrl.currentIng = null;
    ctrl.currentMissingUnit = "";
    ctrl.currentMissingFood = "";
    ctrl.currentIngShouldDelete = false;
    state.currentParsedIndex = -1;
    state.allReviewed = false;
    state.step = ParseStep.LOADING;
    state.saveLoading = false;
    createdUnits.clear();
    createdFoods.clear();
  }

  async function parseIngredients() {
    if (state.loadingCount > 0) return;

    resetParserState();
    const ingredients = deps.ingredients;
    if (!ingredients || ingredients.length === 0) {
      ctrl.nextStep();
      return;
    }
    try {
      const filteredIngredients = ingredients.filter(ing => !ing.referencedRecipe);
      const ingsAsString = filteredIngredients.map(ing => deps.ingredientToParserString(ing));
      state.loadingCount += 1;
      notify();
      const { data, error } = await deps.parseIngredients(ctrl.parser, ingsAsString);
      if (error || !data) {
        throw new Error("Failed to parse ingredients");
      }

      // Restore section titles from original ingredients — the parser doesn't return them
      data.forEach((parsed, index) => {
        parsed.ingredient.title = filteredIngredients[index]?.title || "";
      });

      const recipeRefs = ingredients.filter(ing => ing.referencedRecipe).map(ing => ({
        input: ing.note || "",
        confidence: {},
        ingredient: ing,
      }));
      ctrl.parsedIngs = [...data, ...recipeRefs];
      state.currentParsedIndex = -1;
      state.allReviewed = false;
      createdUnits.clear();
      createdFoods.clear();
      ctrl.currentIngShouldDelete = false;
      nextIngredient();
    }
    catch (error) {
      console.error("Error parsing ingredients:", error);
      alert.error(deps.t("events.something-went-wrong"));
    }
    finally {
      state.loadingCount -= 1;
      ctrl.nextStep();
    }
  }

  async function createMissingUnit() {
    if (!ctrl.currentMissingUnit) return;
    const unitData = { ...deps.emptyUnit(), name: ctrl.currentMissingUnit };

    state.loading.unit = true;
    notify();
    try {
      const newUnit = createdUnits.has(unitData.name) ? createdUnits.get(unitData.name)! : await deps.createUnit(unitData);
      if (!newUnit) {
        alert.error(deps.t("general.cant-create-permission"));
        return;
      }
      ctrl.currentIng!.ingredient.unit = newUnit;
      createdUnits.set(newUnit.name.toLowerCase(), newUnit);
      ctrl.currentMissingUnit = "";
    }
    finally {
      state.loading.unit = false;
      notify();
    }
  }

  async function createMissingFood() {
    if (!ctrl.currentMissingFood) return;
    const foodData = { ...deps.emptyFood(), name: ctrl.currentMissingFood };

    state.loading.food = true;
    notify();
    try {
      const newFood = createdFoods.has(foodData.name) ? createdFoods.get(foodData.name)! : await deps.createFood(foodData);
      if (!newFood) {
        alert.error(deps.t("general.cant-create-permission"));
        return;
      }
      ctrl.currentIng!.ingredient.food = newFood;
      createdFoods.set(newFood.name.toLowerCase(), newFood);
      ctrl.currentMissingFood = "";
    }
    finally {
      state.loading.food = false;
      notify();
    }
  }

  async function addMissingUnitAsAlias() {
    const unit = ctrl.currentIng?.ingredient.unit as IngredientUnit | undefined;
    if (!ctrl.currentMissingUnit || !unit?.id) return;

    unit.aliases = unit.aliases || [];
    if (unit.aliases.map(a => a.name).includes(ctrl.currentMissingUnit)) return;
    unit.aliases.push({ name: ctrl.currentMissingUnit });

    state.loading.unit = true;
    notify();
    try {
      const updated = await deps.updateUnit(unit);
      if (!updated) {
        alert.error(deps.t("events.something-went-wrong"));
        return;
      }
      ctrl.currentIng!.ingredient.unit = updated;
      ctrl.currentMissingUnit = "";
    }
    finally {
      state.loading.unit = false;
      notify();
    }
  }

  async function addMissingFoodAsAlias() {
    const food = ctrl.currentIng?.ingredient.food as IngredientFood | undefined;
    if (!ctrl.currentMissingFood || !food?.id) return;

    food.aliases = food.aliases || [];
    if (food.aliases.map(a => a.name).includes(ctrl.currentMissingFood)) return;
    food.aliases.push({ name: ctrl.currentMissingFood });

    state.loading.food = true;
    notify();
    try {
      const updated = await deps.updateFood(food);
      if (!updated) {
        alert.error(deps.t("events.something-went-wrong"));
        return;
      }
      ctrl.currentIng!.ingredient.food = updated;
      ctrl.currentMissingFood = "";
    }
    finally {
      state.loading.food = false;
      notify();
    }
  }

  function insertNewIngredient(index: number, shouldNotify = true) {
    const ing = {
      input: "",
      confidence: {},
      ingredient: { quantity: 0, referenceId: uuid4() },
    } as ParsedIngredient;
    ctrl.parsedIngs.splice(index, 0, ing);
    if (shouldNotify) notify();
  }

  return ctrl;
}

export type ParseIngredientsController = ReturnType<typeof createParseIngredientsController>;

/**
 * React adapter: one controller per dialog, kept in sync with the app (stores, API, preferences)
 * and re-rendering whenever the controller changes.
 */
export function useParseIngredientsDialog(
  ingredients: NoUndefinedField<RecipeIngredient[]>,
  onSave: (ingredients: NoUndefinedField<RecipeIngredient>[]) => void,
): ParseIngredientsController {
  const { ingredientToParserString } = useIngredientTextParser();
  const { group } = useGroupSelf();
  const i18n = useI18n();
  const api = useUserApi();
  const unitStore = useUnitStore();
  const unitData = useUnitData();
  const foodStore = useFoodStore();
  const foodData = useFoodData();
  const isEnglishLocale = (i18n.locale || "").toLowerCase().startsWith("en");
  const [preferences, setPreferences] = useParsingPreferences(isEnglishLocale ? "nlp" : "brute");
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  const deps: ParseDialogDeps = {
    ingredients,
    onSave,
    t: key => i18n.t(key),
    locale: i18n.locale,
    aiEnabled: !!group?.aiProviderSettings?.aiEnabled,
    parseIngredients: (parser, ings) => api.recipes.parseIngredients(parser, ings),
    ingredientToParserString,
    createUnit: unit => unitStore.actions.createOne(unit),
    updateUnit: unit => unitStore.actions.updateOne(unit),
    createFood: food => foodStore.actions.createOne(food),
    updateFood: food => foodStore.actions.updateOne(food),
    emptyUnit: () => ({ ...unitData.data }),
    emptyFood: () => ({ ...foodData.data }),
    preferences: () => prefsRef.current,
    setPreferences: (patch) => {
      prefsRef.current = { ...prefsRef.current, ...patch };
      setPreferences(patch);
    },
  };

  const controller = useRef<ParseIngredientsController | null>(null);
  controller.current ??= createParseIngredientsController(deps);
  controller.current.setDeps(deps);
  const ctrl = controller.current;

  useSyncExternalStore(ctrl.subscribe, ctrl.getVersion, ctrl.getVersion);

  // `watch(..., { immediate: true })`: an already-reviewed empty list gets a blank row
  useEffect(() => {
    ctrl.notify();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  return ctrl;
}
