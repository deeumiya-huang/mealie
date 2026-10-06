// Usage: <RecipeCardSection recipes={recipes} query={query} title={t("…")} icon={icons.tags}
//   onReplaceRecipes={replaceRecipes} onAppendRecipes={appendRecipes} />   (state from `useLazyRecipes`)
// A titled grid of recipe cards with a toolbar (random recipe, sort menu, card-density toggle) that loads the
// recipes 32 at a time while the page scrolls, remembers the scroll position per page, and reloads when `query`
// changes. The recipes themselves are owned by the parent: this component reports every load through
// `onReplaceRecipes` / `onAppendRecipes`.
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Fade from "@mui/material/Fade";
import Grid from "@mui/material/Grid";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import { useLocation, useNavigate, useParams } from "react-router";
import { AppLoader } from "@/components/global/AppLoader";
import { ContextMenu } from "@/components/global/ContextMenu";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useLazyRecipes } from "@/hooks/recipes";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useScrollPosition } from "@/hooks/use-scroll-position";
import { useUserSortPreferences, type UserRecipePreferences } from "@/hooks/use-users/preferences";
import { useDisplay, useThrottledCallback } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { Recipe } from "@/lib/api/types/recipe";
import type { RecipeSearchQuery } from "@/lib/api/user/recipes/recipe";
import { icons } from "@/lib/icons";
import { AppScrollToTop } from "@/components/Layout/LayoutParts/AppScrollToTop";
import { RecipeCard } from "./RecipeCard";
import { RecipeCardMobile } from "./RecipeCardMobile";

interface RecipeCardSectionProps {
  disableToolbar?: boolean;
  disableSort?: boolean;
  icon?: string | null;
  title?: string | null;
  singleColumn?: boolean;
  recipes?: Recipe[];
  query?: RecipeSearchQuery | null;
  onReplaceRecipes?: (recipes: Recipe[]) => void;
  onAppendRecipes?: (recipes: Recipe[]) => void;
}

const EVENTS = {
  az: "az",
  rating: "rating",
  created: "created",
  updated: "updated",
  lastMade: "lastMade",
  shuffle: "shuffle",
};

const PER_PAGE = 32;
const NO_RECIPES: Recipe[] = [];

function newSearchSeed() {
  return Date.now().toString();
}

export function RecipeCardSection({
  disableToolbar = false,
  disableSort = false,
  icon = null,
  title = null,
  singleColumn = false,
  recipes = NO_RECIPES,
  query = null,
  onReplaceRecipes,
  onAppendRecipes,
}: RecipeCardSectionProps) {
  const { t } = useI18n();
  const { xs, smAndDown } = useDisplay();
  const [preferences, setPreferences] = useUserSortPreferences();
  const auth = useMealieAuth();
  const { isOwnGroup } = useLoggedInState();
  const params = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const useMobileCards = smAndDown || preferences.useMobileCards;
  const displayTitleIcon = icon || icons.tags;
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [sortLoading, setSortLoading] = useState(false);
  const [ready, setReady] = useState(false);
  // the first load starts with the component
  const [loading, setLoading] = useState(true);

  const randomSeed = useRef<string | null>(null);
  const page = useRef(1);
  const hasMore = useRef(true);

  const { fetchMore, getRandom } = useLazyRecipes(isOwnGroup ? null : groupSlug);
  const { savePosition, getSavedPage, restorePosition } = useScrollPosition();

  const queryFilter = query?.queryFilter || null;

  // `preferences` are passed in because a sort change fetches before the stored preferences re-render
  async function fetchRecipes(pageCount = 1, prefs: UserRecipePreferences = preferences) {
    const orderDir = query?.orderDirection || prefs.orderDirection;
    const orderByNullPosition = query?.orderByNullPosition || orderDir === "asc" ? "first" : "last";
    const orderBy = query?.orderBy || prefs.orderBy;
    const localQuery = { ...query };
    if (orderBy === "random") {
      randomSeed.current ??= newSearchSeed();
      localQuery._searchSeed = randomSeed.current;
    }
    return await fetchMore(
      page.current,
      PER_PAGE * pageCount,
      orderBy,
      orderDir,
      orderByNullPosition,
      localQuery,
      // we use a computed queryFilter to filter out recipes that have a null value for the property we're sorting by
      queryFilter,
    );
  }

  async function initRecipes() {
    if (preferences.orderBy === "random") {
      randomSeed.current = newSearchSeed();
    }
    page.current = 1;
    hasMore.current = true;

    // we double-up the first call to avoid a bug with large screens that render
    // the entire first page without scrolling, preventing additional loading
    const newRecipes = await fetchRecipes(page.current + 1);
    if (newRecipes.length < PER_PAGE) {
      hasMore.current = false;
    }

    // since we doubled the first call, we also need to advance the page
    page.current = page.current + 1;

    onReplaceRecipes?.(newRecipes);
  }

  // First load: a remembered page count is fetched in one go, and the scroll position restored afterwards.
  // Nothing is set before the first await, so it can run from an effect.
  async function loadOnMount() {
    const savedPage = getSavedPage(pathname);

    if (savedPage && savedPage > 2) {
      page.current = 1;
      hasMore.current = true;
      const newRecipes = await fetchRecipes(savedPage);
      if (newRecipes.length < PER_PAGE * savedPage) {
        hasMore.current = false;
      }
      page.current = savedPage;
      onReplaceRecipes?.(newRecipes);
      setReady(true);
      restorePosition(pathname);
    }
    else {
      await initRecipes();
      setReady(true);
      if (savedPage) {
        restorePosition(pathname);
      }
    }
    setLoading(false);
  }

  async function reloadForQuery() {
    await initRecipes();
    setReady(true);
  }

  // A new query reloads the recipes (Vue: watch(() => props.query), compared by its JSON).
  const queryKey = JSON.stringify(query);
  const [lastQuery, setLastQuery] = useState(queryKey);
  const [reloadKey, setReloadKey] = useState(0);
  if (queryKey !== lastQuery) {
    setLastQuery(queryKey);
    setReady(false);
    setReloadKey(key => key + 1);
  }

  const loaders = useRef({ loadOnMount, reloadForQuery });
  useEffect(() => {
    loaders.current = { loadOnMount, reloadForQuery };
  });
  useEffect(() => {
    void (reloadKey === 0 ? loaders.current.loadOnMount() : loaders.current.reloadForQuery());
  }, [reloadKey]);

  // The element at the bottom of the list loads the next page once it comes into view.
  const infiniteScroll = useThrottledCallback(() => {
    if (!hasMore.current || loading) {
      return;
    }

    void (async () => {
      setLoading(true);
      page.current = page.current + 1;

      const newRecipes = await fetchRecipes();
      if (newRecipes.length < PER_PAGE) {
        hasMore.current = false;
      }
      if (newRecipes.length) {
        onAppendRecipes?.(newRecipes);
      }

      savePosition(pathname, page.current);

      setLoading(false);
    })();
  }, 500);

  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!sentinel || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        infiniteScroll();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, infiniteScroll]);

  async function sortRecipes(sortType: string) {
    if (sortLoading || loading) {
      return;
    }

    function sorted(
      orderBy: string,
      ascIcon: string,
      descIcon: string,
      defaultOrderDirection = "asc",
      filterNull = false,
    ): UserRecipePreferences {
      const next = { ...preferences };
      if (preferences.orderBy !== orderBy) {
        next.orderBy = orderBy;
        next.orderDirection = defaultOrderDirection;
        next.filterNull = filterNull;
      }
      else {
        next.orderDirection = preferences.orderDirection === "asc" ? "desc" : "asc";
      }
      next.sortIcon = next.orderDirection === "asc" ? ascIcon : descIcon;
      return next;
    }

    let next: UserRecipePreferences;
    switch (sortType) {
      case EVENTS.az:
        next = sorted("name", icons.sortAlphabeticalAscending, icons.sortAlphabeticalDescending, "asc", false);
        break;
      case EVENTS.rating:
        next = sorted("rating", icons.sortAscending, icons.sortDescending, "desc", true);
        break;
      case EVENTS.created:
        next = sorted("created_at", icons.sortCalendarAscending, icons.sortCalendarDescending, "desc", false);
        break;
      case EVENTS.updated:
        next = sorted("updated_at", icons.sortClockAscending, icons.sortClockDescending, "desc", false);
        break;
      case EVENTS.lastMade:
        next = sorted("last_made", icons.sortCalendarAscending, icons.sortCalendarDescending, "desc", true);
        break;
      case EVENTS.shuffle:
        next = sorted(
          "random",
          icons.diceMultiple,
          icons.diceMultiple, // icon in asc and desc is the same for random
        );
        // We update the seed value to have a different order
        randomSeed.current = newSearchSeed();
        break;
      default:
        console.log("Unknown Event", sortType);
        return;
    }
    setPreferences(next);
    setSortAnchor(null);

    // reset pagination
    page.current = 1;
    hasMore.current = true;

    setSortLoading(true);
    setLoading(true);

    // fetch new recipes
    const newRecipes = await fetchRecipes(1, next);
    onReplaceRecipes?.(newRecipes);

    setSortLoading(false);
    setLoading(false);
  }

  async function navigateRandom() {
    const recipe = await getRandom(query, queryFilter);
    if (!recipe?.slug) {
      return;
    }

    void navigate(`/g/${groupSlug}/r/${recipe.slug}`);
  }

  function toggleMobileCards() {
    setPreferences({ ...preferences, useMobileCards: !preferences.useMobileCards });
  }

  const sortItems = [
    { event: EVENTS.az, icon: icons.orderAlphabeticalAscending, text: t("general.sort-alphabetically") },
    { event: EVENTS.rating, icon: icons.star, text: t("general.rating") },
    { event: EVENTS.created, icon: icons.newBox, text: t("general.created") },
    { event: EVENTS.updated, icon: icons.update, text: t("general.updated") },
    { event: EVENTS.lastMade, icon: icons.chefHat, text: t("general.last-made") },
    { event: EVENTS.shuffle, icon: icons.diceMultiple, text: t("general.random") },
  ];

  return (
    <div>
      {!disableToolbar && (
        <Box sx={{ display: "flex", alignItems: "center", pb: 1 }}>
          {title && <MdiIcon path={displayTitleIcon} size="large" sx={{ mr: 1 }} />}
          <Box component="span" className="text-headline-small" sx={{ fontSize: "1.5rem", lineHeight: "2rem", fontWeight: 400 }}>
            {title}
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {xs
            ? (
                <IconButton aria-label={t("general.random")} disabled={recipes.length === 0} onClick={() => void navigateRandom()}>
                  <MdiIcon path={icons.diceMultiple} />
                </IconButton>
              )
            : (
                <Button
                  variant="text"
                  color="inherit"
                  disabled={recipes.length === 0}
                  startIcon={<MdiIcon path={icons.diceMultiple} />}
                  onClick={() => void navigateRandom()}
                >
                  {t("general.random")}
                </Button>
              )}
          {!disableSort && (
            <>
              {xs
                ? (
                    <IconButton
                      aria-label={t("general.sort")}
                      aria-haspopup="menu"
                      disabled={sortLoading}
                      onClick={event => setSortAnchor(event.currentTarget)}
                    >
                      <MdiIcon path={preferences.sortIcon} />
                    </IconButton>
                  )
                : (
                    <Button
                      variant="text"
                      color="inherit"
                      loading={sortLoading}
                      aria-haspopup="menu"
                      startIcon={<MdiIcon path={preferences.sortIcon} />}
                      onClick={event => setSortAnchor(event.currentTarget)}
                    >
                      {t("general.sort")}
                    </Button>
                  )}
              <Menu
                anchorEl={sortAnchor}
                open={sortAnchor !== null}
                onClose={() => setSortAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                {sortItems.map(item => (
                  <MenuItem key={item.event} onClick={() => void sortRecipes(item.event)}>
                    <ListItemIcon>
                      <MdiIcon path={item.icon} size="small" />
                    </ListItemIcon>
                    <ListItemText>{item.text}</ListItemText>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
          {!smAndDown && (
            <ContextMenu
              items={[
                {
                  title: t("general.toggle-view"),
                  icon: icons.eye,
                  event: "toggle-dense-view",
                },
              ]}
              onAction={event => event === "toggle-dense-view" && toggleMobileCards()}
            />
          )}
        </Box>
      )}
      {recipes && ready && (
        <div>
          <Box sx={{ mt: 1 }}>
            {!useMobileCards
              ? (
                  <Grid container spacing={3}>
                    {recipes.map(recipe => (
                      <Grid key={recipe.id} size={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 3 }}>
                        <RecipeCard
                          name={recipe.name ?? ""}
                          description={recipe.description}
                          slug={recipe.slug ?? ""}
                          rating={recipe.rating ?? 0}
                          image={recipe.image}
                          tags={recipe.tags ?? undefined}
                          recipeId={recipe.id ?? ""}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )
              : (
                  <Grid container spacing={2}>
                    {recipes.map(recipe => (
                      <Grid
                        key={recipe.id}
                        size={{
                          xs: 12,
                          sm: 12,
                          md: singleColumn ? 12 : 6,
                          lg: singleColumn ? 12 : 4,
                          xl: singleColumn ? 12 : 3,
                        }}
                      >
                        <RecipeCardMobile
                          name={recipe.name ?? ""}
                          description={recipe.description ?? ""}
                          slug={recipe.slug ?? ""}
                          rating={recipe.rating ?? 0}
                          image={recipe.image}
                          tags={recipe.tags ?? undefined}
                          recipeId={recipe.id ?? ""}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
          </Box>
          <Box ref={setSentinel} sx={{ minHeight: 1 }} />
        </div>
      )}
      <Fade in={loading} unmountOnExit>
        <Box>
          <AppLoader loading={loading} waitingText={t("general.loading-recipes")} />
        </Box>
      </Fade>
      <AppScrollToTop />
    </div>
  );
}
