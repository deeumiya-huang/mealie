import { act, renderHook } from "@testing-library/react";
import { useReducer } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { NoUndefinedField } from "@/lib/api/types/non-generated";
import type { RecipeIngredient } from "@/lib/api/types/recipe";
import { ParseStep, useParseIngredientsDialog, type ParseDialogState } from "../use-parse-ingredients-dialog";
import type { Parser } from "@/lib/api/user/recipes/recipe";
import type { UserParsingPreferences } from "@/hooks/use-users/preferences";
import { i18n } from "@/i18n";

// Vue stubbed the auto-imported `uuid4` global; the React hook imports it from @/hooks/use-utils.

const mockError = vi.spyOn((await import("@/hooks/use-toast")).alert, "error");

const mockParseIngredients = vi.fn().mockResolvedValue({ data: [{ ingredient: {} }] });
const onSave = vi.fn();
const group = {
  value: {
    aiProviderSettings: { aiEnabled: true },
  },
};
vi.mock("@/hooks/use-groups", () => ({
  useGroupSelf: vi.fn(() => ({ group: group.value })),
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({
    recipes: { parseIngredients: mockParseIngredients },
  }),
}));

vi.mock("../use-recipe-ingredients", () => ({
  useIngredientTextParser: () => ({
    ingredientToParserString: vi.fn().mockReturnValue("4 unit ingredient"),
  }),
}));

const preferences: { value: UserParsingPreferences } = {
  value: {
    parser: "nlp",
    dontShowInfoPage: true,
  },
};
// `useLocalStorage(..., { mergeDefaults: true })` only falls back to the caller's default when
// nothing has been stored yet. `parsingStorageEmpty` models that first-visit case; the existing
// tests leave it false, so a stored preference keeps winning for them.
let parsingStorageEmpty = false;
let lastDefaultParser: Parser | undefined;
vi.mock("@/hooks/use-users/preferences", () => ({
  useParsingPreferences: (defaultParser: Parser = "nlp") => {
    lastDefaultParser = defaultParser;
    if (parsingStorageEmpty) {
      preferences.value.parser = defaultParser;
    }
    // the localStorage hook re-renders its users on a write
    const [, rerender] = useReducer((n: number) => n + 1, 0);
    const setPreferences = (next: UserParsingPreferences | ((prev: UserParsingPreferences) => UserParsingPreferences)) => {
      preferences.value = typeof next === "function" ? next(preferences.value) : next;
      rerender();
    };
    return [preferences.value, setPreferences];
  },
}));

const createFood = vi.fn().mockResolvedValue({ id: "food_id", name: "fuwud" });
const updateFood = vi.fn().mockResolvedValue({ id: "food_id", name: "fuwud" });
const foodStore = {
  actions: {
    createOne: createFood,
    updateOne: updateFood,
  },
};

const createUnit = vi.fn().mockResolvedValue({ id: "unit_id", name: "uwunit" });
const updateUnit = vi.fn().mockResolvedValue({ id: "unit_id", name: "uwunit" });
const unitStore = {
  actions: {
    createOne: createUnit,
    updateOne: updateUnit,
  },
};

vi.mock("@/hooks/store", async (importOriginal) => {
  const original: object = await importOriginal();
  return {
    ...original,
    useFoodStore: () => foodStore,
    useUnitStore: () => unitStore,
  };
});

/**
 * Port of the Vue test component: `vm` reads the hook's latest render (`result.current`), its functions run
 * inside `act()` so React renders their changes before the next assertion, and the `setX` helpers write what the
 * Vue test assigned to the returned refs.
 */
const wrapper = (ingredients: NoUndefinedField<RecipeIngredient>[] = [{}, { referencedRecipe: {} }] as NoUndefinedField<RecipeIngredient>[]) => {
  const { result } = renderHook(() => useParseIngredientsDialog(ingredients, onSave));
  const sync = <A extends unknown[]>(fn: (current: typeof result.current) => (...args: A) => void) =>
    (...args: A) => act(() => fn(result.current)(...args));
  const async = <A extends unknown[]>(fn: (current: typeof result.current) => (...args: A) => Promise<void>) =>
    (...args: A) => act(async () => {
      await fn(result.current)(...args);
    });

  const vm = {
    get state(): ParseDialogState {
      return result.current.state;
    },
    get currentIng() {
      return result.current.currentIng;
    },
    get currentIngShouldDelete() {
      return result.current.currentIngShouldDelete;
    },
    get currentIngHasError() {
      return result.current.currentIngHasError;
    },
    get ingredientsToReviewCount() {
      return result.current.ingredientsToReviewCount;
    },
    get autoParsedIngredientsCount() {
      return result.current.autoParsedIngredientsCount;
    },
    get availableParsers() {
      return result.current.availableParsers;
    },
    get parser() {
      return result.current.parser;
    },
    get parserPreferences() {
      return result.current.parserPreferences;
    },
    get showNlpLanguageHint() {
      return result.current.showNlpLanguageHint;
    },
    setCurrentFood: sync(c => c.setCurrentMissingFood),
    setCurrentUnit: sync(c => c.setCurrentMissingUnit),
    setParsedIngs: sync(c => c.setParsedIngs),
    setShouldDelete: sync(c => c.setCurrentIngShouldDelete),
    setCurrentIng: sync(c => c.setCurrentIng),
    setParser: sync(c => c.setParser),
    setDontShow: sync(c => c.setDontShowInfoPage),
    /** Vue assigned `state.allReviewed = …` on the reactive state. */
    setState: sync(c => c.setState),
    nextIngredient: sync(c => c.nextIngredient),
    nextStep: sync(c => c.nextStep),
    saveIngs: sync(c => c.saveIngs),
    createMissingUnit: async(c => c.createMissingUnit),
    createMissingFood: async(c => c.createMissingFood),
    addMissingUnitAsAlias: async(c => c.addMissingUnitAsAlias),
    addMissingFoodAsAlias: async(c => c.addMissingFoodAsAlias),
    /**
     * Starts parsing inside `act()` (so the synchronous part is rendered) and returns a promise that finishes it
     * inside `act()`. Awaiting the result is the Vue `await promise`.
     */
    parseIngredients: () => {
      let promise: Promise<void> = Promise.resolve();
      act(() => {
        promise = result.current.parseIngredients();
      });
      return promise;
    },
    $nextTick: () => act(async () => {}),
  };

  return { vm };
};

/** Awaits a promise started by `vm.parseIngredients()` inside `act()`. */
const settle = (promise: Promise<void>) => act(async () => {
  await promise;
});

describe("useParseIngredientsDialog", () => {
  beforeEach(async () => {
    group.value.aiProviderSettings.aiEnabled = true;
    preferences.value = {
      parser: "nlp",
      dontShowInfoPage: false,
    };
    parsingStorageEmpty = false;
    lastDefaultParser = undefined;
    await i18n.changeLanguage("en-US");
    vi.clearAllMocks();
  });

  describe("nextIngredient", () => {
    test("steps through the ingredients", () => {
      const wrapped = wrapper();
      const { nextIngredient, setParsedIngs } = wrapped.vm;
      setParsedIngs([{
        ingredient: {},
        confidence: { average: 0.5 },
      }, {
        ingredient: {},
      }, {
        ingredient: {
          food: {
            id: "",
            name: "fuwud",
          },
        },
        confidence: { average: 0.99 },
      }, {
        ingredient: {
          unit: {
            id: "",
            name: "uwunit",
          },
        },
        confidence: { average: 0.99 },
      }]);
      expect(wrapped.vm.state.currentParsedIndex).toBe(-1);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(0);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(1);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(2);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(3);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(3);
      expect(wrapped.vm.state.allReviewed).toBe(true);
    });
    test("skips over ingredients that don't need to be reviewed", () => {
      const wrapped = wrapper();
      const { nextIngredient, setParsedIngs } = wrapped.vm;
      setParsedIngs([{
        ingredient: {},
        confidence: { average: 0.5 },
      }, {
        ingredient: {},
        confidence: { average: 0.99 },
      }, {
        ingredient: {
          referencedRecipe: {},
        },
        confidence: { average: 0.5 },
      }, {
        ingredient: {},
        confidence: { average: 0.5 },
      }]);
      expect(wrapped.vm.ingredientsToReviewCount).toBe(2);
      expect(wrapped.vm.autoParsedIngredientsCount).toBe(2);
      expect(wrapped.vm.state.currentParsedIndex).toBe(-1);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(0);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(3);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(3);
      expect(wrapped.vm.state.allReviewed).toBe(true);
    });
    test("skips over deleted ingredients properly", () => {
      const wrapped = wrapper();
      const { nextIngredient, setParsedIngs, setShouldDelete } = wrapped.vm;
      setParsedIngs([{
        ingredient: {},
        confidence: { average: 0.5 },
      }, {
        ingredient: {},
        confidence: { average: 0.5 },
      }, {
        ingredient: {},
        confidence: { average: 0.5 },
      }]);
      expect(wrapped.vm.state.currentParsedIndex).toBe(-1);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      expect(wrapped.vm.currentIngShouldDelete).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(0);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      expect(wrapped.vm.currentIngShouldDelete).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(1);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      expect(wrapped.vm.currentIngShouldDelete).toBe(false);
      setShouldDelete(true);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(1);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      expect(wrapped.vm.currentIngShouldDelete).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(1);
      expect(wrapped.vm.state.allReviewed).toBe(true);
      expect(wrapped.vm.currentIngShouldDelete).toBe(false);
    });
    test("pulls from cache when it can", async () => {
      const wrapped = wrapper();
      const { createMissingUnit, createMissingFood, nextIngredient, setCurrentUnit, setCurrentFood, setCurrentIng, setParsedIngs } = wrapped.vm;
      setParsedIngs([{
        ingredient: {},
        confidence: { average: 0.5 },
      }, {
        ingredient: {},
      }, {
        ingredient: {
          food: {
            id: "",
            name: "fuwud",
          },
        },
        confidence: { average: 0.99 },
      }, {
        ingredient: {
          unit: {
            id: "",
            name: "uwunit",
          },
        },
        confidence: { average: 0.99 },
      }]);
      setCurrentIng({
        ingredient: {},
      });
      setCurrentUnit("uwunit");
      setCurrentFood("fuwud");
      await createMissingUnit();
      await createMissingFood();
      createUnit.mockClear();
      createFood.mockClear();
      expect(wrapped.vm.state.currentParsedIndex).toBe(-1);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(0);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(1);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(2);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(3);
      expect(wrapped.vm.state.allReviewed).toBe(false);
      nextIngredient();
      expect(wrapped.vm.state.currentParsedIndex).toBe(3);
      expect(wrapped.vm.state.allReviewed).toBe(true);
      expect(createUnit).not.toHaveBeenCalled();
      expect(createFood).not.toHaveBeenCalled();
    });
  });
  describe("nextStep", () => {
    test("walks through the workflow", () => {
      const { vm } = wrapper();
      const { nextStep } = vm;
      expect(vm.state.step).toBe(ParseStep.LOADING);
      nextStep();
      expect(vm.state.step).toBe(ParseStep.INFO);
      nextStep();
      expect(vm.state.step).toBe(ParseStep.PARSE);
      nextStep();
      expect(vm.state.step).toBe(ParseStep.REVIEW);
    });
    test("skips the info page if already seen", () => {
      preferences.value.dontShowInfoPage = true;
      const { vm } = wrapper();
      const { nextStep } = vm;
      expect(vm.state.step).toBe(ParseStep.LOADING);
      nextStep();
      expect(vm.state.step).toBe(ParseStep.PARSE);
      nextStep();
      expect(vm.state.step).toBe(ParseStep.REVIEW);
    });
    test("skips the parse page if nothing to confirm", () => {
      const { vm } = wrapper();
      const { nextStep } = vm;
      vm.setState({ allReviewed: true });
      expect(vm.state.step).toBe(ParseStep.LOADING);
      nextStep();
      expect(vm.state.step).toBe(ParseStep.INFO);
      nextStep();
      expect(vm.state.step).toBe(ParseStep.REVIEW);
    });
    test("skips the info page if already seen", () => {
      preferences.value.dontShowInfoPage = true;
      const { vm } = wrapper();
      const { nextStep } = vm;
      expect(vm.state.step).toBe(ParseStep.LOADING);
      nextStep();
      expect(vm.state.step).toBe(ParseStep.PARSE);
      nextStep();
      expect(vm.state.step).toBe(ParseStep.REVIEW);
    });
    test("skips the info and parse pages if necessary", () => {
      preferences.value.dontShowInfoPage = true;
      const { vm } = wrapper();
      const { nextStep } = vm;
      vm.setState({ allReviewed: true });
      expect(vm.state.step).toBe(ParseStep.LOADING);
      nextStep();
      expect(vm.state.step).toBe(ParseStep.REVIEW);
    });
  });
  describe("currentIngHasError", () => {
    test("is true if either food or unit have an error", () => {
      const wrapped = wrapper();
      const { setCurrentFood, setCurrentUnit } = wrapped.vm;
      setCurrentFood("");
      setCurrentUnit("");
      expect(wrapped.vm.currentIngHasError).toBeFalsy();
      setCurrentFood("food");
      setCurrentUnit("");
      expect(wrapped.vm.currentIngHasError).toBeTruthy();
      setCurrentFood("");
      setCurrentUnit("unit");
      expect(wrapped.vm.currentIngHasError).toBeTruthy();
      setCurrentFood("food");
      setCurrentUnit("unit");
      expect(wrapped.vm.currentIngHasError).toBeTruthy();
    });
  });
  describe("availableParsers", () => {
    test("shows open ai parser when available", () => {
      const { availableParsers } = wrapper().vm;
      expect(availableParsers.find(({ value }) => value === "openai")?.hide).toBe(false);
    });
    test("hides open ai parser when not available", () => {
      group.value.aiProviderSettings.aiEnabled = false;
      const { availableParsers } = wrapper().vm;
      expect(availableParsers.find(({ value }) => value === "openai")?.hide).toBe(true);
    });
  });
  test("saveIngs", () => {
    const wrapped = wrapper();
    const { saveIngs, setParsedIngs } = wrapped.vm;
    setParsedIngs([{
      ingredient: {},
      confidence: { average: 0.5 },
    }, {
      ingredient: {},
      confidence: { average: 0.99 },
    }, {
      ingredient: {
        referencedRecipe: {},
      },
      confidence: { average: 0.5 },
    }, {
      ingredient: {},
      confidence: { average: 0.5 },
    }]);
    saveIngs();
    expect(wrapped.vm.state.saveLoading).toBe(true);
    expect(onSave).toHaveBeenCalled();
  });
  describe("parseIngredients", () => {
    test("parses ingredients", async () => {
      const wrapped = wrapper();
      const { parseIngredients } = wrapped.vm;
      const promise = parseIngredients();
      expect(wrapped.vm.state.step).toBe(ParseStep.LOADING);
      expect(wrapped.vm.state.saveLoading).toBe(false);
      expect(wrapped.vm.state.loadingCount).toBe(1);
      await settle(promise);
      expect(wrapped.vm.state.step).toBe(ParseStep.INFO);
      expect(wrapped.vm.state.loadingCount).toBe(0);
      expect(mockParseIngredients).toHaveBeenCalled();
    });
    test("only makes one call at a time", async () => {
      const wrapped = wrapper();
      const { parseIngredients } = wrapped.vm;
      const promise = parseIngredients();
      expect(wrapped.vm.state.step).toBe(ParseStep.LOADING);
      expect(wrapped.vm.state.saveLoading).toBe(false);
      expect(wrapped.vm.state.loadingCount).toBe(1);
      void parseIngredients(); // Second call
      await settle(promise);
      expect(wrapped.vm.state.step).toBe(ParseStep.INFO);
      expect(wrapped.vm.state.loadingCount).toBe(0);
      expect(mockParseIngredients).toHaveBeenCalledOnce();
    });
    test("doesn't parse from an empty list", async () => {
      const wrapped = wrapper([]);
      const { parseIngredients } = wrapped.vm;
      const promise = parseIngredients();
      expect(wrapped.vm.state.step).toBe(ParseStep.INFO);
      expect(wrapped.vm.state.saveLoading).toBe(false);
      expect(wrapped.vm.state.loadingCount).toBe(0);
      await settle(promise);
      expect(wrapped.vm.state.step).toBe(ParseStep.INFO);
      expect(wrapped.vm.state.loadingCount).toBe(0);
      expect(mockParseIngredients).not.toHaveBeenCalled();
    });
    test("handles errors gracefully", async () => {
      mockParseIngredients.mockRejectedValue("💥 Woe, exception be upon ye 💥");
      const wrapped = wrapper();
      const { parseIngredients } = wrapped.vm;
      const promise = parseIngredients();
      expect(wrapped.vm.state.step).toBe(ParseStep.LOADING);
      expect(wrapped.vm.state.saveLoading).toBe(false);
      expect(wrapped.vm.state.loadingCount).toBe(1);
      await settle(promise);
      expect(wrapped.vm.state.step).toBe(ParseStep.INFO);
      expect(wrapped.vm.state.loadingCount).toBe(0);
      expect(mockError).toHaveBeenCalled();
    });
    test("handles errors gracefully", async () => {
      mockParseIngredients.mockResolvedValue({ data: undefined });
      const wrapped = wrapper();
      const { parseIngredients } = wrapped.vm;
      const promise = parseIngredients();
      expect(wrapped.vm.state.step).toBe(ParseStep.LOADING);
      expect(wrapped.vm.state.saveLoading).toBe(false);
      expect(wrapped.vm.state.loadingCount).toBe(1);
      await settle(promise);
      expect(wrapped.vm.state.step).toBe(ParseStep.INFO);
      expect(wrapped.vm.state.loadingCount).toBe(0);
      expect(mockError).toHaveBeenCalled();
    });
  });
  describe("create and alias food and unit", () => {
    test("createMissingUnit", async () => {
      const wrapped = wrapper();
      const { createMissingUnit, setCurrentUnit, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {},
      });
      setCurrentUnit("uwunit");
      await createMissingUnit();
      expect(createUnit).toHaveBeenCalled();
      expect(wrapped.vm.currentIng?.ingredient.unit?.name).toBe("uwunit");
    });
    test("createMissingUnit skips if not missing a unit", async () => {
      const wrapped = wrapper();
      const { createMissingUnit, setCurrentUnit, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {},
      });
      setCurrentUnit("uwunit");
      await createMissingUnit();
      createUnit.mockClear();
      await createMissingUnit();
      expect(createUnit).not.toHaveBeenCalled();
      expect(wrapped.vm.currentIng?.ingredient.unit?.name).toBe("uwunit");
    });
    test("createMissingUnit pulls from cache", async () => {
      const wrapped = wrapper();
      const { createMissingUnit, setCurrentUnit, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {},
      });
      setCurrentUnit("uwunit");
      await createMissingUnit();
      createUnit.mockClear();
      setCurrentUnit("uwunit");
      await createMissingUnit();
      expect(createUnit).not.toHaveBeenCalled();
      expect(wrapped.vm.currentIng?.ingredient.unit?.name).toBe("uwunit");
    });
    test("createMissingUnit handles undefined values", async () => {
      createUnit.mockReturnValue(undefined);
      const wrapped = wrapper();
      const { createMissingUnit, setCurrentUnit, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {},
      });
      setCurrentUnit("uwunit");
      await createMissingUnit();
      expect(mockError).toHaveBeenCalled();
    });
    test("createMissingFood", async () => {
      const wrapped = wrapper();
      const { createMissingFood, setCurrentFood, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {},
      });
      setCurrentFood("fuwud");
      await createMissingFood();
      expect(createFood).toHaveBeenCalled();
      expect(wrapped.vm.currentIng?.ingredient.food?.name).toBe("fuwud");
    });
    test("createMissingFood skips if not missing a unit", async () => {
      const wrapped = wrapper();
      const { createMissingFood, setCurrentFood, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {},
      });
      setCurrentFood("fuwud");
      await createMissingFood();
      createFood.mockClear();
      await createMissingFood();
      expect(createFood).not.toHaveBeenCalled();
      expect(wrapped.vm.currentIng?.ingredient.food?.name).toBe("fuwud");
    });
    test("createMissingFood pulls from cache", async () => {
      const wrapped = wrapper();
      const { createMissingFood, setCurrentFood, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {},
      });
      setCurrentFood("fuwud");
      await createMissingFood();
      createFood.mockClear();
      setCurrentFood("fuwud");
      await createMissingFood();
      expect(createFood).not.toHaveBeenCalled();
      expect(wrapped.vm.currentIng?.ingredient.food?.name).toBe("fuwud");
    });
    test("createMissingFood handles undefined values", async () => {
      createFood.mockReturnValue(undefined);
      const wrapped = wrapper();
      const { createMissingFood, setCurrentFood, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {},
      });
      setCurrentFood("fuwud");
      await createMissingFood();
      expect(mockError).toHaveBeenCalled();
    });
    test("addMissingUnitAsAlias", async () => {
      const wrapped = wrapper();
      const { addMissingUnitAsAlias, setCurrentUnit, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {
          unit: { name: "2uwunit", id: "unit_id_2" },
        },
      });
      setCurrentUnit("uwunit");
      await addMissingUnitAsAlias();
      expect(updateUnit).toHaveBeenCalled();
      expect(wrapped.vm.currentIng?.ingredient.unit?.name).toBe("uwunit");
    });
    test("addMissingUnitAsAlias skips if there's no alias to add", async () => {
      const wrapped = wrapper();
      const { addMissingUnitAsAlias, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {
          unit: { name: "2uwunit", id: "unit_id_2" },
        },
      });
      await addMissingUnitAsAlias();
      expect(updateUnit).not.toHaveBeenCalled();
    });
    test("addMissingUnitAsAlias skips if already includes the alias", async () => {
      const wrapped = wrapper();
      const { addMissingUnitAsAlias, setCurrentUnit, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {
          unit: { name: "2uwunit", id: "unit_id_2", aliases: [{ name: "uwunit" }] },
        },
      });
      setCurrentUnit("uwunit");
      await addMissingUnitAsAlias();
      expect(updateUnit).not.toHaveBeenCalled();
    });
    test("addMissingUnitAsAlias fails gracefully", async () => {
      updateUnit.mockResolvedValue(undefined);
      const wrapped = wrapper();
      const { addMissingUnitAsAlias, setCurrentUnit, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {
          unit: { name: "2uwunit", id: "unit_id_2" },
        },
      });
      setCurrentUnit("uwunit");
      await addMissingUnitAsAlias();
      expect(updateUnit).toHaveBeenCalled();
      expect(mockError).toHaveBeenCalled();
    });
    test("addMissingFoodAsAlias", async () => {
      const wrapped = wrapper();
      const { addMissingFoodAsAlias, setCurrentFood, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {
          food: { name: "f2uwud", id: "food_id_2" },
        },
      });
      setCurrentFood("fuwud");
      await addMissingFoodAsAlias();
      expect(updateFood).toHaveBeenCalled();
      expect(wrapped.vm.currentIng?.ingredient.food?.name).toBe("fuwud");
    });
    test("addMissingFoodAsAlias skips if there's no alias to add", async () => {
      const wrapped = wrapper();
      const { addMissingFoodAsAlias, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {
          food: { name: "f2uwud", id: "food_id_2" },
        },
      });
      await addMissingFoodAsAlias();
      expect(updateFood).not.toHaveBeenCalled();
    });
    test("addMissingFoodAsAlias skips if already includes the alias", async () => {
      const wrapped = wrapper();
      const { addMissingFoodAsAlias, setCurrentFood, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {
          food: { name: "f2uwud", id: "food_id_2", aliases: [{ name: "fuwud" }] },
        },
      });
      setCurrentFood("fuwud");
      await addMissingFoodAsAlias();
      expect(updateFood).not.toHaveBeenCalled();
    });
    test("addMissingFoodAsAlias fails gracefully", async () => {
      updateFood.mockResolvedValue(undefined);
      const wrapped = wrapper();
      const { addMissingFoodAsAlias, setCurrentFood, setCurrentIng } = wrapped.vm;
      setCurrentIng({
        ingredient: {
          food: { name: "f2uwud", id: "food_id_2" },
        },
      });
      setCurrentFood("fuwud");
      await addMissingFoodAsAlias();
      expect(updateFood).toHaveBeenCalled();
      expect(mockError).toHaveBeenCalled();
    });
  });
  test("parser preferences are stored automatically", async () => {
    preferences.value.parser = "" as Parser;
    const wrapped = wrapper();
    const { parser, parserPreferences, setParser, setDontShow } = wrapped.vm;
    expect(parser).toBe("nlp");
    expect(parserPreferences.parser).toBe("");
    expect(parserPreferences.dontShowInfoPage).toBe(false);

    setParser("openai");
    setDontShow(true);

    await wrapped.vm.$nextTick();

    const { parserPreferences: newPrefs } = wrapped.vm;
    expect(newPrefs.parser).toBe("openai");
    expect(newPrefs.dontShowInfoPage).toBe(true);
  });

  describe("locale-aware parser default", () => {
    test("an English locale with nothing stored keeps the natural language processor", () => {
      parsingStorageEmpty = true;
      const { parser, showNlpLanguageHint } = wrapper().vm;
      expect(lastDefaultParser).toBe("nlp");
      expect(parser).toBe("nlp");
      expect(showNlpLanguageHint).toBe(false);
    });

    test("another locale with nothing stored starts on the brute parser", async () => {
      await i18n.changeLanguage("de-DE");
      parsingStorageEmpty = true;
      const { parser, showNlpLanguageHint } = wrapper().vm;
      expect(lastDefaultParser).toBe("brute");
      expect(parser).toBe("brute");
      // No hint: the parser it landed on is the one being recommended.
      expect(showNlpLanguageHint).toBe(false);
    });

    test("a stored preference is never overridden", async () => {
      await i18n.changeLanguage("de-DE");
      preferences.value.parser = "nlp";
      const { parser } = wrapper().vm;
      expect(parser).toBe("nlp");
    });

    test("the hint appears for a stored nlp preference outside English", async () => {
      await i18n.changeLanguage("de-DE");
      preferences.value.parser = "nlp";
      expect(wrapper().vm.showNlpLanguageHint).toBe(true);
    });

    test("the hint stays away on an English locale", () => {
      preferences.value.parser = "nlp";
      expect(wrapper().vm.showNlpLanguageHint).toBe(false);
    });

    test("the hint goes away once another parser is picked", async () => {
      await i18n.changeLanguage("de-DE");
      preferences.value.parser = "nlp";
      const wrapped = wrapper();
      expect(wrapped.vm.showNlpLanguageHint).toBe(true);

      wrapped.vm.setParser("brute");
      await wrapped.vm.$nextTick();

      expect(wrapped.vm.showNlpLanguageHint).toBe(false);
    });
  });
});
