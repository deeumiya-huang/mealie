import { icons } from "~/lib/icons";
import { useStorageValue } from "~/lib/storage";
import type { StorageSetter } from "~/lib/storage";
import { ActivityKey } from "~/lib/api/types/activity";
import type { RegisteredParser, TimelineEventType } from "~/lib/api/types/recipe";
import type { QueryFilterJSON } from "~/lib/api/types/non-generated";

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

/** `[value, set]`; `set` takes a partial object (merged) or an updater. */
export type Pref<T> = [T, StorageSetter<T>];

export function useUserMealPlanPreferences(): Pref<UserMealPlanPreferences> {
  return useStorageValue<UserMealPlanPreferences>(
    "meal-planner-preferences",
    {
      numberOfDaysPast: 0,
      numberOfDays: 7,
    },
  );
}

export function useUserPrintPreferences(): Pref<UserPrintPreferences> {
  return useStorageValue<UserPrintPreferences>(
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
  );
}

export function useUserSortPreferences(): Pref<UserRecipePreferences> {
  return useStorageValue<UserRecipePreferences>(
    "recipe-section-preferences",
    {
      orderBy: "created_at",
      orderDirection: "desc",
      filterNull: false,
      sortIcon: icons.sortAlphabeticalAscending,
      useMobileCards: false,
    },
  );
}

export function useUserActivityPreferences(): Pref<UserActivityPreferences> {
  return useStorageValue<UserActivityPreferences>(
    "activity-preferences",
    {
      defaultActivity: ActivityKey.RECIPES,
    },
  );
}

export function useUserSearchQuerySession(): Pref<UserSearchQuery> {
  return useStorageValue<UserSearchQuery>(
    "search-query",
    {
      recipe: "",
    },
    "session",
  );
}

export function useShoppingListPreferences(): Pref<UserShoppingListPreferences> {
  return useStorageValue<UserShoppingListPreferences>(
    "shopping-list-preferences",
    {
      viewAllLists: false,
    },
  );
}

export function useTimelinePreferences(): Pref<UserTimelinePreferences> {
  return useStorageValue<UserTimelinePreferences>(
    "timeline-preferences",
    {
      orderDirection: "asc",
      types: ["info", "system", "comment"] as TimelineEventType[],
    },
  );
}

/**
 * @param defaultParser used only when no preference has been stored yet. Callers that know the
 * user's locale can pass a parser better suited to it, since the natural language parser is
 * trained on English recipes.
 */
export function useParsingPreferences(defaultParser: RegisteredParser = "nlp" as RegisteredParser): Pref<UserParsingPreferences> {
  return useStorageValue<UserParsingPreferences>(
    "parsing-preferences",
    {
      parser: defaultParser,
      dontShowInfoPage: false,
    },
  );
}

export function useCookbookPreferences(): Pref<UserCookbooksPreferences> {
  return useStorageValue<UserCookbooksPreferences>(
    "cookbook-preferences",
    {
      hideOtherHouseholds: false,
    },
  );
}

export function useRecipeFinderPreferences(): Pref<UserRecipeFinderPreferences> {
  return useStorageValue<UserRecipeFinderPreferences>(
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
  );
}

export function useRecipeCreatePreferences(): Pref<UserRecipeCreatePreferences> {
  return useStorageValue<UserRecipeCreatePreferences>(
    "recipe-create-preferences",
    {
      importKeywordsAsTags: false,
      importCategories: false,
      stayInEditMode: false,
      parseRecipe: true,
      translateRecipe: false,
      createNewOrganizers: false,
    },
  );
}

export function useUserExperiencePreferences(): Pref<UserExperiencePreferences> {
  return useStorageValue<UserExperiencePreferences>(
    "user-experience-preferences",
    {
      lockScreen: true,
    },
  );
}
