import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Icon } from "~/components/global/Icon";
import { SearchFilter } from "~/components/Domain/SearchFilter";
import { useLazyRecipes } from "~/hooks/recipes";
import { useCategoryStore, useTagStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe, RecipeCategory, RecipeSummary, RecipeTag } from "~/lib/api/types/recipe";
import type { RecipeSearchQuery } from "~/lib/api/user/recipes/recipe";
import { RecipeCardLineItem } from "./RecipeCardLineItem";

export interface RecipeSelectorProps {
  value: RecipeSummary | null;
  onChange: (recipe: RecipeSummary | null) => void;
  queryFilter?: string | null;
  height?: string;
  /** Extra controls next to the filters (the Vue `#filters` slot). */
  filters?: ReactNode;
  /** Replaces the "no results" alert (the Vue `#no-results` slot). */
  noResults?: ReactNode;
}

export interface RecipeSelectorHandle {
  reset: () => void;
}

const PER_PAGE = 20;

export const RecipeSelector = forwardRef<RecipeSelectorHandle, RecipeSelectorProps>(function RecipeSelector(
  { value, onChange, queryFilter = null, height = "100%", filters, noResults },
  ref,
) {
  const i18n = useI18n();
  const { fetchMore } = useLazyRecipes();
  const { store: categories } = useCategoryStore();
  const { store: tags } = useTagStore();

  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<NoUndefinedField<RecipeCategory>[]>([]);
  const [selectedTags, setSelectedTags] = useState<NoUndefinedField<RecipeTag>[]>([]);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const page = useRef(1);
  const hasMore = useRef(true);
  const loadingRef = useRef(false);
  // discards the results of any request that was superseded while it was in flight
  const latestRequest = useRef(0);

  useImperativeHandle(ref, () => ({
    reset() {
      setSearch("");
      setSelectedCategories([]);
      setSelectedTags([]);
    },
  }), []);

  const query: RecipeSearchQuery = {
    search: search || "",
    categories: selectedCategories.map(category => category.id),
    tags: selectedTags.map(tag => tag.id),
  };
  const queryRef = useRef({ query, queryFilter });
  queryRef.current = { query, queryFilter };

  const fetchPage = useCallback(
    (pageNumber: number, perPage: number) =>
      fetchMore(pageNumber, perPage, "name", "asc", null, queryRef.current.query, queryRef.current.queryFilter),
    [fetchMore],
  );

  const reload = useCallback(async () => {
    const requestId = ++latestRequest.current;
    loadingRef.current = true;
    setLoading(true);

    // we double-up the first call so the results overflow their container,
    // otherwise there's nothing to scroll and no more recipes are ever loaded
    const newRecipes = await fetchPage(1, PER_PAGE * 2);
    if (requestId !== latestRequest.current) {
      return;
    }

    setRecipes(newRecipes);
    hasMore.current = newRecipes.length >= PER_PAGE * 2;
    page.current = 2;
    loadingRef.current = false;
    setLoading(false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore.current || loadingRef.current) {
      return;
    }

    const requestId = ++latestRequest.current;
    loadingRef.current = true;
    setLoading(true);
    page.current += 1;

    const newRecipes = await fetchPage(page.current, PER_PAGE);
    if (requestId !== latestRequest.current) {
      return;
    }

    setRecipes(prev => [...prev, ...newRecipes]);
    hasMore.current = newRecipes.length >= PER_PAGE;
    loadingRef.current = false;
    setLoading(false);
  }, [fetchPage]);

  // Initial load, then a debounced reload whenever the query changes
  const queryKey = JSON.stringify([query, queryFilter]);
  const firstLoad = useRef(true);
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      void reload();
      return;
    }
    const timer = setTimeout(() => void reload(), 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialized query
  }, [queryKey]);

  const resultsContainer = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinel.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        void loadMore();
      }
    }, { root: resultsContainer.current });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height, minHeight: 0 }}>
      <TextField
        value={search}
        onChange={e => setSearch(e.target.value)}
        size="small"
        autoFocus
        fullWidth
        placeholder={i18n.t("search.search-placeholder")}
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start"><Icon path={icons.search} /></InputAdornment>,
          },
        }}
      />

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 1, mt: 1.5 }}>
        {categories.length > 0 && (
          <SearchFilter value={selectedCategories} onChange={setSelectedCategories} items={categories as NoUndefinedField<RecipeCategory>[]}>
            <Icon path={icons.categories} start />
            {i18n.t("category.categories")}
          </SearchFilter>
        )}
        {tags.length > 0 && (
          <SearchFilter value={selectedTags} onChange={setSelectedTags} items={tags as NoUndefinedField<RecipeTag>[]}>
            <Icon path={icons.tags} start />
            {i18n.t("tag.tags")}
          </SearchFilter>
        )}
        {filters}
      </Box>

      {value && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>{i18n.t("general.selected")}</Typography>
          <Chip
            color="primary"
            sx={{ borderRadius: 1 }}
            icon={<Icon path={icons.silverwareForkKnife} />}
            label={value.name}
            onDelete={() => onChange(null)}
          />
        </Box>
      )}

      <Box ref={resultsContainer} sx={{ mt: 1.5, flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
        {recipes.length > 0 && (
          <List sx={{ py: 0 }}>
            {recipes.map(recipe => (
              <RecipeCardLineItem
                key={recipe.id!}
                recipe={recipe}
                active={recipe.id === value?.id}
                disableLink
                onClick={() => onChange(recipe)}
              />
            ))}
          </List>
        )}
        {!recipes.length && !loading && (
          <Box sx={{ py: 1 }}>
            {noResults ?? <Alert severity="info" variant="standard">{i18n.t("search.no-results")}</Alert>}
          </Box>
        )}
        <div ref={sentinel} />
        {loading && <CircularProgress color="primary" sx={{ display: "block", mx: "auto", my: 1.5 }} />}
      </Box>
    </Box>
  );
});

export default RecipeSelector;
