import { ActivityKey } from "@/lib/api/types/activity";
import type { RegisteredParser, TimelineEventType } from "@/lib/api/types/recipe";
import type { QueryFilterJSON } from "@/lib/api/types/non-generated";
import { useLocalStorage, useSessionStorage } from "@/hooks/utils";
import { icons } from "@/lib/icons";

// Port of composables/use-users/preferences.ts: same storage keys and defaults (merged into stored
// values). Each hook returns `[value, setValue]` instead of a writable Ref.

export interface UserPrintPreferences {
  imagePosition: string;
  showDescription: boolean;
  showLinkedIngredients: boolean;
  showNotes: boolean;
  showNutrition: boolean;
  showSubstitutions: boolean;
  expandChildRecipes: boolean;
}

export interface UserSearchQuery {
  recipe: string;
}

export enum ImagePosition {
  hidden = "hidden",
  left = "left",
  right = "right",
}

export interface UserMealPlanPreferences {
  numberOfDaysPast: number;
  numberOfDays: number;
}

export interface UserRecipePreferences {
  orderBy: string;
  orderDirection: string;
  filterNull: boolean;
  sortIcon: string;
  useMobileCards: boolean;
}

export interface UserShoppingListPreferences {
  viewAllLists: boolean;
}

export interface UserTimelinePreferences {
  orderDirection: string;
  types: TimelineEventType[];
}

export interface UserParsingPreferences {
  parser: RegisteredParser;
  dontShowInfoPage: boolean;
}

export interface UserCookbooksPreferences {
  hideOtherHouseholds: boolean;
}

export interface UserRecipeFinderPreferences {
  foodIds: string[];
  toolIds: string[];
  queryFilter: string;
  queryFilterJSON: QueryFilterJSON;
  maxMissingFoods: number;
  maxMissingTools: number;
  includeFoodsOnHand: boolean;
  includeToolsOnHand: boolean;
  includeSubstitutions: boolean;
}

export interface UserRecipeCreatePreferences {
  importKeywordsAsTags: boolean;
  importCategories: boolean;
  stayInEditMode: boolean;
  parseRecipe: boolean;
  translateRecipe: boolean;
  createNewOrganizers: boolean;
}

export interface UserActivityPreferences {
  defaultActivity: ActivityKey;
}

export interface UserExperiencePreferences {
  lockScreen: boolean;
}

export function useUserMealPlanPreferences() {
  return useLocalStorage<UserMealPlanPreferences>(
    "meal-planner-preferences",
    {
      numberOfDaysPast: 0,
      numberOfDays: 7,
    },
    { mergeDefaults: true },
  );
}

export function useUserPrintPreferences() {
  return useLocalStorage<UserPrintPreferences>(
    "recipe-print-preferences",
    {
      imagePosition: "left" as ImagePosition,
      showDescription: true,
      showLinkedIngredients: false,
      showNotes: true,
      showNutrition: false,
      showSubstitutions: true,
      expandChildRecipes: false,
    },
    { mergeDefaults: true },
  );
}

export function useUserSortPreferences() {
  return useLocalStorage<UserRecipePreferences>(
    "recipe-section-preferences",
    {
      orderBy: "created_at",
      orderDirection: "desc",
      filterNull: false,
      sortIcon: icons.sortAlphabeticalAscending,
      useMobileCards: false,
    },
    { mergeDefaults: true },
  );
}

export function useUserActivityPreferences() {
  return useLocalStorage<UserActivityPreferences>(
    "activity-preferences",
    {
      defaultActivity: ActivityKey.RECIPES,
    },
    { mergeDefaults: true },
  );
}

export function useUserSearchQuerySession() {
  return useSessionStorage<UserSearchQuery>(
    "search-query",
    {
      recipe: "",
    },
    { mergeDefaults: true },
  );
}

export function useShoppingListPreferences() {
  return useLocalStorage<UserShoppingListPreferences>(
    "shopping-list-preferences",
    {
      viewAllLists: false,
    },
    { mergeDefaults: true },
  );
}

export function useTimelinePreferences() {
  return useLocalStorage<UserTimelinePreferences>(
    "timeline-preferences",
    {
      orderDirection: "asc",
      types: ["info", "system", "comment"] as TimelineEventType[],
    },
    { mergeDefaults: true },
  );
}

/**
 * @param defaultParser used only when no preference has been stored yet. Callers that know the
 * user's locale can pass a parser better suited to it, since the natural language parser is
 * trained on English recipes.
 */
export function useParsingPreferences(defaultParser: RegisteredParser = "nlp" as RegisteredParser) {
  return useLocalStorage<UserParsingPreferences>(
    "parsing-preferences",
    {
      parser: defaultParser,
      dontShowInfoPage: false,
    },
    { mergeDefaults: true },
  );
}

export function useCookbookPreferences() {
  return useLocalStorage<UserCookbooksPreferences>(
    "cookbook-preferences",
    {
      hideOtherHouseholds: false,
    },
    { mergeDefaults: true },
  );
}

export function useRecipeFinderPreferences() {
  return useLocalStorage<UserRecipeFinderPreferences>(
    "recipe-finder-preferences",
    {
      foodIds: [],
      toolIds: [],
      queryFilter: "",
      queryFilterJSON: { parts: [] } as QueryFilterJSON,
      maxMissingFoods: 20,
      maxMissingTools: 20,
      includeFoodsOnHand: true,
      includeToolsOnHand: true,
      includeSubstitutions: true,
    },
    { mergeDefaults: true },
  );
}

export function useRecipeCreatePreferences() {
  return useLocalStorage<UserRecipeCreatePreferences>(
    "recipe-create-preferences",
    {
      importKeywordsAsTags: false,
      importCategories: false,
      stayInEditMode: false,
      parseRecipe: true,
      translateRecipe: false,
      createNewOrganizers: false,
    },
    { mergeDefaults: true },
  );
}

export function useUserExperiencePreferences() {
  return useLocalStorage<UserExperiencePreferences>(
    "user-experience-preferences",
    {
      lockScreen: true,
    },
    { mergeDefaults: true },
  );
}
