import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import type { IngredientFood, RecipeCategory, RecipeTag, RecipeTool } from "~/lib/api/types/recipe";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { HouseholdSummary } from "~/lib/api/types/household";
import type { RecipeSearchQuery } from "~/lib/api/user/recipes/recipe";
import { useCategoryStoreFor, useFoodStoreFor, useHouseholdStoreFor, useTagStoreFor, useToolStoreFor } from "~/hooks/store";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useUserSearchQuerySession, useUserSortPreferences } from "~/hooks/use-users/preferences";

export interface ExplorerState {
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

export interface RecipeExplorerSearchState {
  state: ExplorerState;
  setState: (patch: Partial<ExplorerState>) => void;
  selectedCategories: NoUndefinedField<RecipeCategory>[];
  setSelectedCategories: (v: NoUndefinedField<RecipeCategory>[]) => void;
  selectedFoods: IngredientFood[];
  setSelectedFoods: (v: IngredientFood[]) => void;
  selectedHouseholds: NoUndefinedField<HouseholdSummary>[];
  setSelectedHouseholds: (v: NoUndefinedField<HouseholdSummary>[]) => void;
  selectedTags: NoUndefinedField<RecipeTag>[];
  setSelectedTags: (v: NoUndefinedField<RecipeTag>[]) => void;
  selectedTools: NoUndefinedField<RecipeTool>[];
  setSelectedTools: (v: NoUndefinedField<RecipeTool>[]) => void;
  passedQueryWithSeed: RecipeSearchQuery & { _searchSeed: string };
  search: () => Promise<void>;
  reset: () => void;
  toggleOrderDirection: () => void;
  setOrderBy: (value: string) => void;
  setRandomOrderBy: () => void;
  filterItems: (item: RecipeCategory | RecipeTag | RecipeTool, urlPrefix: string) => void;
  initialize: () => Promise<void>;
  stores: {
    categories: RecipeCategory[];
    tags: RecipeTag[];
    tools: RecipeTool[];
    foods: IngredientFood[];
    households: HouseholdSummary[];
  };
}

const queryDefaults = {
  search: "",
  orderBy: "created_at",
  orderDirection: "desc" as "asc" | "desc",
  requireAllCategories: false,
  requireAllTags: false,
  requireAllTools: false,
  requireAllFoods: false,
};

function toIDArray(array: { id: string }[]) {
  return array.map(item => item.id).sort();
}

/** Resolves once `condition()` is true (polled), or rejects after the timeout. */
function waitUntilAndExecute(condition: () => boolean, callback: () => void, opts = { timeout: 2000, interval: 500 }): Promise<void> {
  return new Promise((resolve, reject) => {
    if (condition()) {
      callback();
      resolve();
      return;
    }
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        clearTimeout(timeout);
        callback();
        resolve();
      }
    }, opts.interval);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error("Timeout"));
    }, opts.timeout);
  });
}

type QueryObject = Record<string, string | string[] | undefined>;

export function queryToSearch(query: QueryObject): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach(v => params.append(key, v));
    else params.append(key, value);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function searchToQuery(search: string): QueryObject {
  const params = new URLSearchParams(search);
  const query: QueryObject = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    query[key] = all.length > 1 ? all : all[0];
  }
  return query;
}

const asArray = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

type Selections = {
  selectedCategories: NoUndefinedField<RecipeCategory>[];
  selectedFoods: IngredientFood[];
  selectedHouseholds: NoUndefinedField<HouseholdSummary>[];
  selectedTags: NoUndefinedField<RecipeTag>[];
  selectedTools: NoUndefinedField<RecipeTool>[];
};

const Ctx = createContext<RecipeExplorerSearchState | null>(null);

/**
 * Shared search state for the recipe explorer (search box, filters and results). The Vue app
 * memoised one instance per group slug; here one provider per explorer page mount does the same.
 */
export function RecipeExplorerSearchProvider({ groupSlug, children }: { groupSlug: string; children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOwnGroup } = useLoggedInState();
  const [searchQuerySession, setSearchQuerySession] = useUserSearchQuerySession();
  const [sortPreferences, setSortPreferences] = useUserSortPreferences();

  const [state, setStateRaw] = useState<ExplorerState>({ auto: true, ready: false, ...queryDefaults, randomSeed: 0 });
  const setState = useCallback((patch: Partial<ExplorerState>) => setStateRaw(s => ({ ...s, ...patch })), []);

  const categories = useCategoryStoreFor(isOwnGroup, groupSlug);
  const foods = useFoodStoreFor(isOwnGroup, groupSlug);
  const households = useHouseholdStoreFor(isOwnGroup, groupSlug);
  const tags = useTagStoreFor(isOwnGroup, groupSlug);
  const tools = useToolStoreFor(isOwnGroup, groupSlug);
  const storesRef = useRef({ categories: categories.store, foods: foods.store, households: households.store, tags: tags.store, tools: tools.store });
  storesRef.current = { categories: categories.store, foods: foods.store, households: households.store, tags: tags.store, tools: tools.store };

  const [selectedCategories, setSelectedCategories] = useState<NoUndefinedField<RecipeCategory>[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<IngredientFood[]>([]);
  const [selectedHouseholds, setSelectedHouseholds] = useState<NoUndefinedField<HouseholdSummary>[]>([]);
  const [selectedTags, setSelectedTags] = useState<NoUndefinedField<RecipeTag>[]>([]);
  const [selectedTools, setSelectedTools] = useState<NoUndefinedField<RecipeTool>[]>([]);

  // Sync sort preferences
  useEffect(() => {
    setSortPreferences({ orderBy: state.orderBy, orderDirection: state.orderDirection });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- watch(orderBy / orderDirection)
  }, [state.orderBy, state.orderDirection]);

  const latest = useRef<{ state: ExplorerState } & Selections>({ state, selectedCategories, selectedFoods, selectedHouseholds, selectedTags, selectedTools });
  latest.current = { state, selectedCategories, selectedFoods, selectedHouseholds, selectedTags, selectedTools };

  const calcPassedQuery = useCallback((): RecipeSearchQuery => {
    const l = latest.current;
    return {
      search: l.state.search ? l.state.search : "",
      categories: toIDArray(l.selectedCategories),
      foods: toIDArray(l.selectedFoods),
      households: toIDArray(l.selectedHouseholds),
      tags: toIDArray(l.selectedTags),
      tools: toIDArray(l.selectedTools),
      requireAllCategories: l.state.requireAllCategories,
      requireAllTags: l.state.requireAllTags,
      requireAllTools: l.state.requireAllTools,
      requireAllFoods: l.state.requireAllFoods,
      orderBy: l.state.orderBy,
      orderDirection: l.state.orderDirection,
    };
  }, []);

  const [passedQuery, setPassedQuery] = useState<RecipeSearchQuery>(() => calcPassedQuery());
  const passedQueryRef = useRef(passedQuery);

  const passedQueryWithSeed = useMemo(() => ({
    ...passedQuery,
    _searchSeed: Date.now().toString(),
    _randomSeed: state.randomSeed,
  }), [passedQuery, state.randomSeed]);

  const setRandomOrderBy = useCallback(() => setState({ orderBy: "random", randomSeed: Date.now() }), [setState]);

  const reset = useCallback(() => {
    setState({ ...queryDefaults });
    setSortPreferences({ orderBy: queryDefaults.orderBy, orderDirection: queryDefaults.orderDirection });
    setSelectedCategories([]);
    setSelectedFoods([]);
    setSelectedHouseholds([]);
    setSelectedTags([]);
    setSelectedTools([]);
  }, [setState, setSortPreferences]);

  const toggleOrderDirection = useCallback(() => {
    setState({ orderDirection: latest.current.state.orderDirection === "asc" ? "desc" : "asc" });
  }, [setState]);

  const setOrderBy = useCallback((value: string) => setState({ orderBy: value }), [setState]);

  const search = useCallback(async () => {
    const newQueryValue = calcPassedQuery();
    if (JSON.stringify(passedQueryRef.current) === JSON.stringify(newQueryValue)) {
      return;
    }
    passedQueryRef.current = newQueryValue;
    setPassedQuery(newQueryValue);

    const householdCount = storesRef.current.households.length;
    const query: QueryObject = {
      categories: newQueryValue.categories,
      foods: newQueryValue.foods,
      tags: newQueryValue.tags,
      tools: newQueryValue.tools,
      // Only add the query param if it's not the default value
      auto: latest.current.state.auto ? undefined : "false",
      search: newQueryValue.search === queryDefaults.search ? undefined : newQueryValue.search,
      households: !newQueryValue.households?.length || newQueryValue.households?.length === householdCount ? undefined : newQueryValue.households,
      requireAllCategories: newQueryValue.requireAllCategories ? "true" : undefined,
      requireAllTags: newQueryValue.requireAllTags ? "true" : undefined,
      requireAllTools: newQueryValue.requireAllTools ? "true" : undefined,
      requireAllFoods: newQueryValue.requireAllFoods ? "true" : undefined,
    };
    await navigate({ search: queryToSearch(query) });
    setSearchQuerySession({ recipe: JSON.stringify(query) });
  }, [calcPassedQuery, navigate, setSearchQuerySession]);

  const filterItems = useCallback((item: RecipeCategory | RecipeTag | RecipeTool, urlPrefix: string) => {
    const s = storesRef.current;
    if (urlPrefix === "categories") {
      setSelectedCategories(s.categories.filter(category => (category.id as string).includes(item.id as string)) as NoUndefinedField<RecipeCategory>[]);
    }
    else if (urlPrefix === "tags") {
      setSelectedTags(s.tags.filter(tag => (tag.id as string).includes(item.id as string)) as NoUndefinedField<RecipeTag>[]);
    }
    else if (urlPrefix === "tools") {
      setSelectedTools(s.tools.filter(tool => tool.id.includes(item.id || "")) as NoUndefinedField<RecipeTool>[]);
    }
  }, []);

  const hydrateSearch = useCallback(async (query: QueryObject, sort: { orderBy: string; orderDirection: string }) => {
    const bool = (key: string, fallback: boolean) => (query[key]?.length ? query[key] === "true" : fallback);
    const patch: Partial<ExplorerState> = {
      search: query.search?.length ? (query.search as string) : queryDefaults.search,
      orderBy: sort.orderBy,
      orderDirection: sort.orderDirection as "asc" | "desc",
      requireAllCategories: bool("requireAllCategories", queryDefaults.requireAllCategories),
      requireAllTags: bool("requireAllTags", queryDefaults.requireAllTags),
      requireAllTools: bool("requireAllTools", queryDefaults.requireAllTools),
      requireAllFoods: bool("requireAllFoods", queryDefaults.requireAllFoods),
    };
    if (query.auto?.length) patch.auto = query.auto === "true";
    setState(patch);
    latest.current = { ...latest.current, state: { ...latest.current.state, ...patch } };

    const promises: Promise<void>[] = [];
    function select<K extends keyof Selections>(key: string, field: K, store: () => { id?: string | null }[], set: (v: Selections[K]) => void) {
      const ids = asArray(query[key]);
      const apply = (result: Selections[K]) => {
        set(result);
        latest.current = { ...latest.current, [field]: result };
      };
      if (ids.length) {
        promises.push(waitUntilAndExecute(() => store().length > 0, () => {
          apply(store().filter(item => ids.includes(item.id as string)) as Selections[K]);
        }));
      }
      else {
        apply([] as unknown as Selections[K]);
      }
    }
    select("categories", "selectedCategories", () => storesRef.current.categories, setSelectedCategories);
    select("tags", "selectedTags", () => storesRef.current.tags, setSelectedTags);
    select("tools", "selectedTools", () => storesRef.current.tools, setSelectedTools);
    select("foods", "selectedFoods", () => storesRef.current.foods, setSelectedFoods);
    select("households", "selectedHouseholds", () => storesRef.current.households, setSelectedHouseholds);

    await Promise.allSettled(promises);
  }, [setState]);

  const sortRef = useRef(sortPreferences);
  sortRef.current = sortPreferences;
  const initialLocation = useRef(location.search);
  const sessionRef = useRef(searchQuerySession);

  const initialize = useCallback(async () => {
    let query = searchToQuery(initialLocation.current);
    // Restore the user's last search query
    if (sessionRef.current.recipe && !(Object.keys(query).length > 0)) {
      try {
        query = JSON.parse(sessionRef.current.recipe) as QueryObject;
        await navigate({ search: queryToSearch(query) }, { replace: true });
      }
      catch {
        setSearchQuerySession({ recipe: "" });
        query = {};
        await navigate({ search: "" }, { replace: true });
      }
    }

    await hydrateSearch(query, sortRef.current);
    await search();
    setState({ ready: true });
  }, [hydrateSearch, navigate, search, setSearchQuerySession, setState]);

  // Clearing the query (e.g. clicking the Recipes link again) resets the filters
  const hadQuery = useRef(location.search !== "");
  useEffect(() => {
    const hasQuery = location.search !== "" && location.search !== "?";
    if (!hasQuery && hadQuery.current) {
      reset();
    }
    hadQuery.current = hasQuery;
  }, [location.search, reset]);

  // Auto-search when parameters change (debounced 500ms)
  const selectionKey = JSON.stringify([
    state.search, state.requireAllCategories, state.requireAllTags, state.requireAllTools, state.requireAllFoods, state.orderBy, state.orderDirection,
    toIDArray(selectedCategories), toIDArray(selectedFoods), toIDArray(selectedHouseholds), toIDArray(selectedTags), toIDArray(selectedTools),
  ]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (latest.current.state.ready && latest.current.state.auto) {
        void search();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [selectionKey, search]);

  // if exactly one household exists, then we shouldn't be filtering by household
  useEffect(() => {
    if (households.store.length === 1) setSelectedHouseholds([]);
  }, [households.store]);

  const value: RecipeExplorerSearchState = {
    state,
    setState,
    selectedCategories,
    setSelectedCategories,
    selectedFoods,
    setSelectedFoods,
    selectedHouseholds,
    setSelectedHouseholds,
    selectedTags,
    setSelectedTags,
    selectedTools,
    setSelectedTools,
    passedQueryWithSeed,
    search,
    reset,
    toggleOrderDirection,
    setOrderBy,
    setRandomOrderBy,
    filterItems,
    initialize,
    stores: {
      categories: categories.store,
      tags: tags.store,
      tools: tools.store,
      foods: foods.store,
      households: households.store,
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecipeExplorerSearch(): RecipeExplorerSearchState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useRecipeExplorerSearch must be used inside <RecipeExplorerSearchProvider>");
  }
  return ctx;
}
