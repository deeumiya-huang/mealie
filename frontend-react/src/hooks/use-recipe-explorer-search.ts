// Port of composables/use-recipe-explorer-search.ts.
//   const explorer = useRecipeExplorerSearch(groupSlug);   // state, selections, passedQueryWithSeed, actions
//   useRecipeExplorerSearchEffects(groupSlug);             // once per explorer: auto-search + reset on bare URL
// Like in Vue the search state is one shared instance per group slug (memoised at module level), used by the search
// box, the filter buttons and the page; `clearRecipeExplorerSearchState(slug)` drops it (the search box does so when it
// unmounts). The Vue refs live in a store (`createStore`); the Vue `watch`ers that are not part of the state itself
// are `useRecipeExplorerSearchEffects` (install it in exactly one component) and the sort-preference sync, which runs
// in the actions that change the sort. `groupSlug` is a plain string here (Vue passed a computed).
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  useCategoryStore,
  useFoodStore,
  useHouseholdStore,
  usePublicCategoryStore,
  usePublicFoodStore,
  usePublicHouseholdStore,
  usePublicTagStore,
  usePublicToolStore,
  useTagStore,
  useToolStore,
} from "@/hooks/store";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useUserSearchQuerySession, useUserSortPreferences } from "@/hooks/use-users/preferences";
import type { HouseholdSummary } from "@/lib/api/types/household";
import type { NoUndefinedField } from "@/lib/api/types/non-generated";
import type { IngredientFood, RecipeCategory, RecipeTag, RecipeTool } from "@/lib/api/types/recipe";
import type { RecipeSearchQuery } from "@/lib/api/user/recipes/recipe";
import { createStore, useStore, type Store } from "@/lib/store";

export interface RecipeExplorerState {
  auto: boolean;
  ready: boolean;
  search: string;
  orderBy: string;
  orderDirection: "asc" | "desc";
  requireAllCategories: boolean;
  requireAllTags: boolean;
  requireAllTools: boolean;
  requireAllFoods: boolean;
  randomSeed: number;
}

interface ExplorerData {
  state: RecipeExplorerState;
  selectedCategories: NoUndefinedField<RecipeCategory>[];
  selectedFoods: IngredientFood[];
  selectedHouseholds: NoUndefinedField<HouseholdSummary>[];
  selectedTags: NoUndefinedField<RecipeTag>[];
  selectedTools: NoUndefinedField<RecipeTool>[];
  passedQuery: RecipeSearchQuery;
  /** Changes whenever the query (or the random seed) does, so that a new search gets a new random order. */
  searchSeed: string;
}

// Query defaults
const queryDefaults = {
  search: "",
  orderBy: "created_at",
  orderDirection: "desc" as "asc" | "desc",
  requireAllCategories: false,
  requireAllTags: false,
  requireAllTools: false,
  requireAllFoods: false,
};

/** Navigations made by the explorer carry this location state, so the bare-URL reset ignores them. */
const EXPLORER_NAVIGATION = { recipeExplorer: true };

type QueryValue = string | string[] | undefined;

// Utility functions
function toIDArray(array: { id: string }[]) {
  return array.map(item => item.id).sort();
}

function calcPassedQuery(data: Pick<ExplorerData, "state" | "selectedCategories" | "selectedFoods" | "selectedHouseholds" | "selectedTags" | "selectedTools">): RecipeSearchQuery {
  const { state } = data;
  return {
    search: state.search ? state.search : "",
    categories: toIDArray(data.selectedCategories),
    foods: toIDArray(data.selectedFoods),
    households: toIDArray(data.selectedHouseholds),
    tags: toIDArray(data.selectedTags),
    tools: toIDArray(data.selectedTools),
    requireAllCategories: state.requireAllCategories,
    requireAllTags: state.requireAllTags,
    requireAllTools: state.requireAllTools,
    requireAllFoods: state.requireAllFoods,
    orderBy: state.orderBy,
    orderDirection: state.orderDirection,
  };
}

function createInitialData(): ExplorerData {
  const data = {
    state: {
      auto: true,
      ready: false,
      search: "",
      orderBy: "created_at",
      orderDirection: "desc" as "asc" | "desc",
      requireAllCategories: false,
      requireAllTags: false,
      requireAllTools: false,
      requireAllFoods: false,
      randomSeed: 0,
    },
    selectedCategories: [],
    selectedFoods: [],
    selectedHouseholds: [],
    selectedTags: [],
    selectedTools: [],
  };
  return { ...data, passedQuery: calcPassedQuery(data), searchSeed: Date.now().toString() };
}

function toSearchString(query: Record<string, QueryValue>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach(item => params.append(key, item));
    }
    else if (value !== undefined) {
      params.set(key, value);
    }
  }
  const search = params.toString();
  return search ? `?${search}` : "";
}

function queryValue(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).filter(value => value.length > 0);
}

// Wait utility for async hydration
function waitUntilAndExecute(
  condition: () => boolean,
  callback: () => void,
  opts = { timeout: 2000, interval: 500 },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const handles = {
      timeout: undefined as ReturnType<typeof setTimeout> | undefined,
      interval: undefined as ReturnType<typeof setInterval> | undefined,
    };

    const check = () => {
      if (condition()) {
        clearInterval(handles.interval);
        clearTimeout(handles.timeout);
        callback();
        resolve();
        return true;
      }
      return false;
    };

    // the stores are often loaded already, so look right away instead of after the first interval
    if (check()) {
      return;
    }
    handles.interval = setInterval(check, opts.interval);
    handles.timeout = setTimeout(() => {
      clearInterval(handles.interval);
      reject(new Error("Timeout"));
    }, opts.timeout);
  });
}

// Memo storage for singleton instances
interface ExplorerEntry {
  data: Store<ExplorerData>;
  initialization: Promise<void> | null;
}

const memo = new Map<string, ExplorerEntry>();
const pendingClears = new Map<string, ReturnType<typeof setTimeout>>();

function getEntry(groupSlug: string): ExplorerEntry {
  let entry = memo.get(groupSlug);
  if (!entry) {
    entry = { data: createStore(createInitialData()), initialization: null };
    memo.set(groupSlug, entry);
  }
  return entry;
}

export function clearRecipeExplorerSearchState(groupSlug: string) {
  memo.delete(groupSlug);
}

/**
 * Drops the instance once its owner has unmounted. Deferred by a tick so that a re-mount straight after (React's
 * StrictMode effect replay) keeps the instance: call `cancelRecipeExplorerSearchStateClear` when mounting.
 */
export function scheduleRecipeExplorerSearchStateClear(groupSlug: string) {
  clearTimeout(pendingClears.get(groupSlug));
  pendingClears.set(groupSlug, setTimeout(() => {
    pendingClears.delete(groupSlug);
    clearRecipeExplorerSearchState(groupSlug);
  }, 0));
}

export function cancelRecipeExplorerSearchStateClear(groupSlug: string) {
  clearTimeout(pendingClears.get(groupSlug));
  pendingClears.delete(groupSlug);
}

/**
 * The organizer / food / household stores of the explorer: the user's own for a group the user belongs to, the public
 * explore ones otherwise. `isOwnGroup` is fixed while a group page is shown and both branches run the same hooks in the
 * same order, so choosing between them is safe.
 */
export function useRecipeExplorerStores(groupSlug: string) {
  const { isOwnGroup } = useLoggedInState();

  /* eslint-disable react-hooks/rules-of-hooks -- see above: identical hook sequence in both branches */
  const categories = isOwnGroup ? useCategoryStore() : usePublicCategoryStore(groupSlug);
  const foods = isOwnGroup ? useFoodStore() : usePublicFoodStore(groupSlug);
  const households = isOwnGroup ? useHouseholdStore() : usePublicHouseholdStore(groupSlug);
  const tags = isOwnGroup ? useTagStore() : usePublicTagStore(groupSlug);
  const tools = isOwnGroup ? useToolStore() : usePublicToolStore(groupSlug);
  /* eslint-enable react-hooks/rules-of-hooks */

  return { categories, foods, households, tags, tools };
}

export function useRecipeExplorerSearch(groupSlug: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuerySession, setSearchQuerySession] = useUserSearchQuerySession();
  const [sortPreferences, setSortPreferences] = useUserSortPreferences();
  const { categories, foods, households, tags, tools } = useRecipeExplorerStores(groupSlug);

  const entry = getEntry(groupSlug);
  const data = useStore(entry.data);
  const { state, passedQuery } = data;

  // what the (long-lived) actions read when they run, e.g. while they wait for the stores to load
  const latest = useRef({ navigate, location, searchQuerySession, sortPreferences, categories, foods, households, tags, tools });
  useEffect(() => {
    latest.current = { navigate, location, searchQuerySession, sortPreferences, categories, foods, households, tags, tools };
  });

  const update = useCallback((patch: Partial<ExplorerData>) => {
    entry.data.set(current => ({ ...current, ...patch }));
  }, [entry]);

  /** `state.value.x = …`: the sort fields are mirrored into the stored sort preferences (the Vue `watch`es). */
  const setState = useCallback((patch: Partial<RecipeExplorerState>) => {
    const before = entry.data.get().state;
    entry.data.set(current => ({ ...current, state: { ...current.state, ...patch } }));
    const orderBy = patch.orderBy !== undefined && patch.orderBy !== before.orderBy ? patch.orderBy : undefined;
    const orderDirection = patch.orderDirection !== undefined && patch.orderDirection !== before.orderDirection ? patch.orderDirection : undefined;
    if (orderBy !== undefined || orderDirection !== undefined) {
      setSortPreferences(prefs => ({
        ...prefs,
        ...(orderBy !== undefined ? { orderBy } : {}),
        ...(orderDirection !== undefined ? { orderDirection } : {}),
      }));
    }
  }, [entry, setSortPreferences]);

  const setSelectedCategories = useCallback((selectedCategories: NoUndefinedField<RecipeCategory>[]) => update({ selectedCategories }), [update]);
  const setSelectedFoods = useCallback((selectedFoods: IngredientFood[]) => update({ selectedFoods }), [update]);
  const setSelectedHouseholds = useCallback((selectedHouseholds: NoUndefinedField<HouseholdSummary>[]) => update({ selectedHouseholds }), [update]);
  const setSelectedTags = useCallback((selectedTags: NoUndefinedField<RecipeTag>[]) => update({ selectedTags }), [update]);
  const setSelectedTools = useCallback((selectedTools: NoUndefinedField<RecipeTool>[]) => update({ selectedTools }), [update]);

  // The search seed is fixed until the query (or the random seed) changes
  const { searchSeed } = data;
  const passedQueryWithSeed = useMemo(() => ({
    ...passedQuery,
    _searchSeed: searchSeed,
    _randomSeed: state.randomSeed,
  }), [passedQuery, searchSeed, state.randomSeed]);

  // Update the seed to trigger a new search
  const setRandomOrderBy = useCallback(() => {
    const randomSeed = Date.now();
    setState({ orderBy: "random", randomSeed });
    update({ searchSeed: Date.now().toString() });
  }, [setState, update]);

  // Main functions
  const reset = useCallback(() => {
    setState({
      search: queryDefaults.search,
      orderBy: queryDefaults.orderBy,
      orderDirection: queryDefaults.orderDirection,
      requireAllCategories: queryDefaults.requireAllCategories,
      requireAllTags: queryDefaults.requireAllTags,
      requireAllTools: queryDefaults.requireAllTools,
      requireAllFoods: queryDefaults.requireAllFoods,
    });
    setSortPreferences(prefs => ({ ...prefs, orderBy: queryDefaults.orderBy, orderDirection: queryDefaults.orderDirection }));
    update({
      selectedCategories: [],
      selectedFoods: [],
      selectedHouseholds: [],
      selectedTags: [],
      selectedTools: [],
    });
  }, [setState, setSortPreferences, update]);

  const toggleOrderDirection = useCallback(() => {
    setState({ orderDirection: entry.data.get().state.orderDirection === "asc" ? "desc" : "asc" });
  }, [entry, setState]);

  const setOrderBy = useCallback((value: string) => {
    setState({ orderBy: value });
  }, [setState]);

  const search = useCallback(async () => {
    const current = entry.data.get();
    const oldQueryValueString = JSON.stringify(current.passedQuery);
    const newQueryValue = calcPassedQuery(current);
    const newQueryValueString = JSON.stringify(newQueryValue);
    if (oldQueryValueString === newQueryValueString) {
      return;
    }

    update({ passedQuery: newQueryValue, searchSeed: Date.now().toString() });
    const query = {
      categories: newQueryValue.categories,
      foods: newQueryValue.foods,
      tags: newQueryValue.tags,
      tools: newQueryValue.tools,
      // Only add the query param if it's not the default value
      ...{
        auto: current.state.auto ? undefined : "false",
        search: newQueryValue.search === queryDefaults.search ? undefined : newQueryValue.search,
        households: !newQueryValue.households?.length || newQueryValue.households.length === latest.current.households.store.length ? undefined : newQueryValue.households,
        requireAllCategories: newQueryValue.requireAllCategories ? "true" : undefined,
        requireAllTags: newQueryValue.requireAllTags ? "true" : undefined,
        requireAllTools: newQueryValue.requireAllTools ? "true" : undefined,
        requireAllFoods: newQueryValue.requireAllFoods ? "true" : undefined,
      },
    };
    await latest.current.navigate({ search: toSearchString(query) }, { state: EXPLORER_NAVIGATION });
    setSearchQuerySession(session => ({ ...session, recipe: JSON.stringify(query) }));
  }, [entry, update, setSearchQuerySession]);

  const filterItems = useCallback((item: RecipeCategory | RecipeTag | RecipeTool, urlPrefix: string) => {
    const stores = latest.current;
    if (urlPrefix === "categories") {
      const result = stores.categories.store.filter(category => (category.id as string).includes(item.id as string));
      update({ selectedCategories: result as NoUndefinedField<RecipeCategory>[] });
    }
    else if (urlPrefix === "tags") {
      const result = stores.tags.store.filter(tag => (tag.id as string).includes(item.id as string));
      update({ selectedTags: result as NoUndefinedField<RecipeTag>[] });
    }
    else if (urlPrefix === "tools") {
      const result = stores.tools.store.filter(tool => (tool.id).includes(item.id || ""));
      update({ selectedTools: result as NoUndefinedField<RecipeTool>[] });
    }
  }, [update]);

  const hydrateSearch = useCallback(async (query: URLSearchParams) => {
    const sortPrefs = latest.current.sortPreferences;
    const autoValue = query.get("auto");
    const patch: Partial<RecipeExplorerState> = {
      search: query.get("search")?.length ? query.get("search") as string : queryDefaults.search,
      orderBy: sortPrefs.orderBy,
      orderDirection: sortPrefs.orderDirection as "asc" | "desc",
      requireAllCategories: query.get("requireAllCategories")?.length ? query.get("requireAllCategories") === "true" : queryDefaults.requireAllCategories,
      requireAllTags: query.get("requireAllTags")?.length ? query.get("requireAllTags") === "true" : queryDefaults.requireAllTags,
      requireAllTools: query.get("requireAllTools")?.length ? query.get("requireAllTools") === "true" : queryDefaults.requireAllTools,
      requireAllFoods: query.get("requireAllFoods")?.length ? query.get("requireAllFoods") === "true" : queryDefaults.requireAllFoods,
    };
    if (autoValue?.length) {
      patch.auto = autoValue === "true";
    }
    setState(patch);

    const promises: Promise<void>[] = [];

    const categoryIds = queryValue(query, "categories");
    if (categoryIds.length) {
      promises.push(
        waitUntilAndExecute(
          () => latest.current.categories.store.length > 0,
          () => {
            const result = latest.current.categories.store.filter(item => categoryIds.includes(item.id as string));
            update({ selectedCategories: result as NoUndefinedField<RecipeCategory>[] });
          },
        ),
      );
    }
    else {
      update({ selectedCategories: [] });
    }

    const tagIds = queryValue(query, "tags");
    if (tagIds.length) {
      promises.push(
        waitUntilAndExecute(
          () => latest.current.tags.store.length > 0,
          () => {
            const result = latest.current.tags.store.filter(item => tagIds.includes(item.id as string));
            update({ selectedTags: result as NoUndefinedField<RecipeTag>[] });
          },
        ),
      );
    }
    else {
      update({ selectedTags: [] });
    }

    const toolIds = queryValue(query, "tools");
    if (toolIds.length) {
      promises.push(
        waitUntilAndExecute(
          () => latest.current.tools.store.length > 0,
          () => {
            const result = latest.current.tools.store.filter(item => toolIds.includes(item.id));
            update({ selectedTools: result as NoUndefinedField<RecipeTool>[] });
          },
        ),
      );
    }
    else {
      update({ selectedTools: [] });
    }

    const foodIds = queryValue(query, "foods");
    if (foodIds.length) {
      promises.push(
        waitUntilAndExecute(
          () => latest.current.foods.store.length > 0,
          () => {
            const result = latest.current.foods.store.filter(item => foodIds.includes(item.id));
            update({ selectedFoods: result });
          },
        ),
      );
    }
    else {
      update({ selectedFoods: [] });
    }

    const householdIds = queryValue(query, "households");
    if (householdIds.length) {
      promises.push(
        waitUntilAndExecute(
          () => latest.current.households.store.length > 0,
          () => {
            const result = latest.current.households.store.filter(item => householdIds.includes(item.id));
            update({ selectedHouseholds: result as NoUndefinedField<HouseholdSummary>[] });
          },
        ),
      );
    }
    else {
      update({ selectedHouseholds: [] });
    }

    await Promise.allSettled(promises);
  }, [setState, update]);

  const initialize = useCallback(() => {
    // StrictMode replays the owner's mount effect: the instance is initialised once
    entry.initialization ??= (async () => {
      const current = latest.current;
      let currentSearch = current.location.search;
      // Restore the user's last search query
      if (current.searchQuerySession.recipe && !(new URLSearchParams(currentSearch).size > 0)) {
        try {
          const query = JSON.parse(current.searchQuerySession.recipe) as Record<string, QueryValue>;
          currentSearch = toSearchString(query);
          await current.navigate({ search: currentSearch }, { replace: true, state: EXPLORER_NAVIGATION });
        }
        catch {
          setSearchQuerySession(session => ({ ...session, recipe: "" }));
          currentSearch = "";
          void current.navigate({ search: "" }, { replace: true, state: EXPLORER_NAVIGATION });
        }
      }

      await hydrateSearch(new URLSearchParams(currentSearch));
      await search();
      setState({ ready: true });
    })();
    return entry.initialization;
  }, [entry, hydrateSearch, search, setSearchQuerySession, setState]);

  return {
    // State
    state,
    setState,
    selectedCategories: data.selectedCategories,
    selectedFoods: data.selectedFoods,
    selectedHouseholds: data.selectedHouseholds,
    selectedTags: data.selectedTags,
    selectedTools: data.selectedTools,
    setSelectedCategories,
    setSelectedFoods,
    setSelectedHouseholds,
    setSelectedTags,
    setSelectedTools,

    // Computed
    passedQueryWithSeed,

    // Methods
    search,
    reset,
    toggleOrderDirection,
    setOrderBy,
    setRandomOrderBy,
    filterItems,
    initialize,
  };
}

/**
 * The watchers of the Vue composable: a navigation to the bare URL (no query) resets the search, and a change of any
 * search parameter searches 500 ms later while auto-search is on. Install in exactly one component per explorer.
 */
export function useRecipeExplorerSearchEffects(groupSlug: string) {
  const location = useLocation();
  const { state, selectedCategories, selectedFoods, selectedHouseholds, selectedTags, selectedTools, search, reset } = useRecipeExplorerSearch(groupSlug);

  // Watch for route query changes
  const lastKey = useRef(location.key);
  useEffect(() => {
    if (location.key === lastKey.current) {
      return;
    }
    lastKey.current = location.key;
    const own = (location.state as typeof EXPLORER_NAVIGATION | null)?.recipeExplorer === true;
    if (!own && !location.search) {
      reset();
    }
  }, [location.key, location.search, location.state, reset]);

  // Auto-search when parameters change
  const { ready, auto } = state;
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ready && auto) {
        void searchRef.current();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    ready,
    auto,
    state.search,
    state.requireAllCategories,
    state.requireAllTags,
    state.requireAllTools,
    state.requireAllFoods,
    state.orderBy,
    state.orderDirection,
    selectedCategories,
    selectedFoods,
    selectedHouseholds,
    selectedTags,
    selectedTools,
  ]);
}
