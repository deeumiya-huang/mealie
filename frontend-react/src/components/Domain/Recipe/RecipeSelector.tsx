// Usage: <RecipeSelector value={recipe} onChange={setRecipe} height="auto" queryFilter={filter}
//          filters={<Switch …/>} noResults={<Alert …/>} ref={selectorRef} />
// Search + category/tag filters + an infinite list of recipes to pick one from. Vue `v-model` → `value` + `onChange`,
// the `#filters` / `#no-results` slots → `filters` / `noResults`, `defineExpose({ reset })` → `ref` with `{ reset }`.
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { MdiIcon } from "@/components/global/MdiIcon";
import { SearchFilter } from "@/components/Domain/SearchFilter";
import { useLazyRecipes } from "@/hooks/recipes";
import { useCategoryStore, useTagStore } from "@/hooks/store";
import { useDebouncedValue } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { NoUndefinedField } from "@/lib/api/types/non-generated";
import type { Recipe, RecipeCategory, RecipeSummary, RecipeTag } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeCardLineItem } from "./RecipeCardLineItem";

export interface RecipeSelectorHandle {
  reset: () => void;
}

interface RecipeSelectorProps {
  queryFilter?: string | null;
  height?: string;
  value?: RecipeSummary | null;
  onChange?: (recipe: RecipeSummary | null) => void;
  filters?: ReactNode;
  noResults?: ReactNode;
  ref?: Ref<RecipeSelectorHandle>;
}

interface RequestParams {
  search: string;
  categories: string[];
  tags: string[];
  queryFilter: string | null;
}

interface ResultState {
  key: string | null;
  recipes: Recipe[];
  hasMore: boolean;
  page: number;
}

const PER_PAGE = 20;

export function RecipeSelector({ queryFilter = null, height = "100%", value = null, onChange, filters, noResults, ref }: RecipeSelectorProps) {
  const { t } = useI18n();
  const { fetchMore } = useLazyRecipes();
  const { store: categories } = useCategoryStore();
  const { store: tags } = useTagStore();

  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<NoUndefinedField<RecipeCategory>[]>([]);
  const [selectedTags, setSelectedTags] = useState<NoUndefinedField<RecipeTag>[]>([]);

  const [result, setResult] = useState<ResultState>({ key: null, recipes: [], hasMore: true, page: 1 });
  const [loadingMore, setLoadingMore] = useState(false);

  // discards the results of any request that was superseded while it was in flight
  const latestRequest = useRef(0);
  const resultRef = useRef(result);
  const loadingMoreRef = useRef(loadingMore);
  const fetchMoreRef = useRef(fetchMore);
  useEffect(() => {
    resultRef.current = result;
    loadingMoreRef.current = loadingMore;
    fetchMoreRef.current = fetchMore;
  });

  const requestKey = JSON.stringify({
    search: search || "",
    categories: selectedCategories.flatMap(category => (category.id ? [category.id] : [])),
    tags: selectedTags.flatMap(tag => (tag.id ? [tag.id] : [])),
    queryFilter,
  } satisfies RequestParams);
  const debouncedKey = useDebouncedValue(requestKey, 300);
  const loading = result.key !== debouncedKey || loadingMore;

  useImperativeHandle(ref, () => ({
    reset() {
      setSearch("");
      setSelectedCategories([]);
      setSelectedTags([]);
    },
  }), []);

  // loads the first page on mount and whenever the (debounced) search settings change
  useEffect(() => {
    const requestId = ++latestRequest.current;
    const params = JSON.parse(debouncedKey) as RequestParams;

    void (async () => {
      // we double-up the first call so the results overflow their container,
      // otherwise there's nothing to scroll and no more recipes are ever loaded
      const newRecipes = await fetchMoreRef.current(
        1,
        PER_PAGE * 2,
        "name",
        "asc",
        null,
        { search: params.search, categories: params.categories, tags: params.tags },
        params.queryFilter,
      );
      if (requestId !== latestRequest.current) {
        return;
      }

      setResult({ key: debouncedKey, recipes: newRecipes, hasMore: newRecipes.length >= PER_PAGE * 2, page: 2 });
      setLoadingMore(false);
    })();
  }, [debouncedKey]);

  const loadMore = useCallback(async () => {
    const current = resultRef.current;
    if (!current.hasMore || loadingMoreRef.current || current.key === null) {
      return;
    }

    const requestId = ++latestRequest.current;
    const page = current.page + 1;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    const params = JSON.parse(current.key) as RequestParams;
    const newRecipes = await fetchMoreRef.current(
      page,
      PER_PAGE,
      "name",
      "asc",
      null,
      { search: params.search, categories: params.categories, tags: params.tags },
      params.queryFilter,
    );
    if (requestId !== latestRequest.current) {
      return;
    }

    setResult({ ...current, recipes: [...current.recipes, ...newRecipes], hasMore: newRecipes.length >= PER_PAGE, page });
    setLoadingMore(false);
  }, []);

  const resultsContainer = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = sentinel.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[entries.length - 1]?.isIntersecting) {
        void loadMore();
      }
    }, { root: resultsContainer.current });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  const { recipes } = result;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, height }}>
      {/* the field must not stretch when the results are short */}
      <TextField
        autoFocus
        size="small"
        variant="outlined"
        color="primary"
        placeholder={t("search.search-placeholder")}
        value={search}
        onChange={event => setSearch(event.target.value)}
        sx={{ flexGrow: 0 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <MdiIcon path={icons.search} />
              </InputAdornment>
            ),
            endAdornment: search
              ? (
                  <InputAdornment position="end">
                    <IconButton size="small" edge="end" aria-label={t("general.clear")} onClick={() => setSearch("")}>
                      <MdiIcon path={icons.close} size="small" />
                    </IconButton>
                  </InputAdornment>
                )
              : undefined,
          },
        }}
      />

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 1, mt: 1.5 }}>
        {categories.length > 0 && (
          <SearchFilter
            items={categories as NoUndefinedField<RecipeCategory>[]}
            value={selectedCategories}
            onChange={setSelectedCategories}
          >
            <MdiIcon path={icons.categories} sx={{ mr: 1 }} />
            {t("category.categories")}
          </SearchFilter>
        )}
        {tags.length > 0 && (
          <SearchFilter
            items={tags as NoUndefinedField<RecipeTag>[]}
            value={selectedTags}
            onChange={setSelectedTags}
          >
            <MdiIcon path={icons.tags} sx={{ mr: 1 }} />
            {t("tag.tags")}
          </SearchFilter>
        )}
        {filters}
      </Box>

      {value && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
          <Typography component="span" variant="caption" sx={{ opacity: 0.6 }}>{t("general.selected")}</Typography>
          <Chip
            color="primary"
            icon={<MdiIcon path={icons.silverwareForkKnife} />}
            label={value.name}
            sx={{ borderRadius: 1 }}
            onDelete={() => onChange?.(null)}
          />
        </Box>
      )}

      <Box ref={resultsContainer} sx={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", mt: 1.5 }}>
        {recipes.length > 0
          ? (
              <List sx={{ py: 0 }}>
                {recipes.map(recipe => (
                  <RecipeCardLineItem
                    key={recipe.id}
                    recipe={recipe}
                    active={recipe.id === value?.id}
                    disableLink
                    onClick={() => onChange?.(recipe)}
                  />
                ))}
              </List>
            )
          : !loading && (
              <Box sx={{ py: 1 }}>
                {noResults ?? <Alert severity="info" variant="standard">{t("search.no-results")}</Alert>}
              </Box>
            )}

        <div ref={sentinel} />

        {loading && <CircularProgress sx={{ display: "block", mx: "auto", my: 1.5 }} />}
      </Box>
    </Box>
  );
}
