import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Fade from "@mui/material/Fade";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useLocation, useNavigate, useParams } from "react-router";
import { icons } from "~/lib/icons";
import { throttle } from "~/lib/throttle";
import type { Recipe } from "~/lib/api/types/recipe";
import type { RecipeSearchQuery } from "~/lib/api/user/recipes/recipe";
import { useLazyRecipes } from "~/hooks/recipes";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useScrollPosition } from "~/hooks/use-scroll-position";
import { useUserSortPreferences } from "~/hooks/use-users/preferences";
import { AppLoader } from "~/components/global/AppLoader";
import { ContextMenu } from "~/components/global/ContextMenu";
import { Icon } from "~/components/global/Icon";
import { Intersect } from "~/components/global/Intersect";
import { AppScrollToTop } from "~/components/Layout/LayoutParts/AppScrollToTop";
import { RecipeCard } from "./RecipeCard";
import { RecipeCardMobile } from "./RecipeCardMobile";
import type { RecipeChipsProps } from "./RecipeChips";

const EVENTS = {
  az: "az",
  rating: "rating",
  created: "created",
  updated: "updated",
  lastMade: "lastMade",
  shuffle: "shuffle",
};

const perPage = 32;

export interface RecipeCardSectionProps {
  disableToolbar?: boolean;
  disableSort?: boolean;
  icon?: string | null;
  title?: string | null;
  singleColumn?: boolean;
  recipes?: Recipe[];
  query?: RecipeSearchQuery | null;
  className?: string;
  onReplaceRecipes?: (recipes: Recipe[]) => void;
  onAppendRecipes?: (recipes: Recipe[]) => void;
  onItemSelected?: RecipeChipsProps["onItemSelected"];
}

/** Recipe grid with sorting, random pick and infinite scroll. */
export function RecipeCardSection(props: RecipeCardSectionProps) {
  const { disableToolbar = false, disableSort = false, icon = null, title = null, singleColumn = false, recipes = [], query = null, className, onReplaceRecipes, onAppendRecipes, onItemSelected } = props;
  const i18n = useI18n();
  const display = useDisplay();
  const [preferences, setPreferences] = useUserSortPreferences();
  const auth = useMealieAuth();
  const { isOwnGroup } = useLoggedInState();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const useMobileCards = display.smAndDown || preferences.useMobileCards;

  const [sortLoading, setSortLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const page = useRef(1);
  const hasMore = useRef(true);
  const loadingRef = useRef(false);
  const randomSeed = useRef(Date.now().toString());

  const { fetchMore, getRandom } = useLazyRecipes(isOwnGroup ? null : groupSlug);
  const { savePosition, getSavedPage, restorePosition } = useScrollPosition();

  // TODO (as in the Vue app): allow filtering out null values when ordering by a nullable property
  const queryFilter = query?.queryFilter || null;

  const latest = useRef({ query, preferences, queryFilter, fetchMore, onReplaceRecipes, onAppendRecipes });
  latest.current = { query, preferences, queryFilter, fetchMore, onReplaceRecipes, onAppendRecipes };

  async function fetchRecipes(pageCount = 1) {
    const { query: q, preferences: prefs } = latest.current;
    const orderDir = q?.orderDirection || prefs.orderDirection;
    // (sic) precedence as in the Vue app
    const orderByNullPosition = q?.orderByNullPosition || orderDir === "asc" ? "first" : "last";
    const orderBy = q?.orderBy || prefs.orderBy;
    const localQuery = { ...q };
    if (orderBy === "random") {
      localQuery._searchSeed = randomSeed.current;
    }
    return await latest.current.fetchMore(page.current, perPage * pageCount, orderBy, orderDir, orderByNullPosition, localQuery, latest.current.queryFilter);
  }

  async function initRecipes() {
    if (latest.current.preferences.orderBy === "random") {
      randomSeed.current = Date.now().toString();
    }
    page.current = 1;
    hasMore.current = true;

    // we double-up the first call to avoid a bug with large screens that render
    // the entire first page without scrolling, preventing additional loading
    const newRecipes = await fetchRecipes(page.current + 1);
    if (newRecipes.length < perPage) {
      hasMore.current = false;
    }
    // since we doubled the first call, we also need to advance the page
    page.current = page.current + 1;
    latest.current.onReplaceRecipes?.(newRecipes);
  }

  useEffect(() => {
    let cancelled = false;
    async function mount() {
      setLoading(true);
      loadingRef.current = true;
      const savedPage = getSavedPage(location.pathname);
      if (savedPage && savedPage > 2) {
        page.current = 1;
        hasMore.current = true;
        const newRecipes = await fetchRecipes(savedPage);
        if (cancelled) return;
        if (newRecipes.length < perPage * savedPage) hasMore.current = false;
        page.current = savedPage;
        latest.current.onReplaceRecipes?.(newRecipes);
        setReady(true);
        restorePosition(location.pathname);
      }
      else {
        await initRecipes();
        if (cancelled) return;
        setReady(true);
        if (savedPage) restorePosition(location.pathname);
      }
      setLoading(false);
      loadingRef.current = false;
    }
    void mount();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onMounted
  }, []);

  const lastQuery = useRef(JSON.stringify(query));
  useEffect(() => {
    const next = JSON.stringify(query);
    if (lastQuery.current === next) return;
    lastQuery.current = next;
    setReady(false);
    void initRecipes().then(() => setReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- watch(query)
  }, [query]);

  const infiniteScroll = useMemo(() => throttle(async () => {
    if (!hasMore.current || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    page.current = page.current + 1;

    const newRecipes = await fetchRecipes();
    if (newRecipes.length < perPage) hasMore.current = false;
    if (newRecipes.length) latest.current.onAppendRecipes?.(newRecipes);

    savePosition(window.location.pathname, page.current);
    loadingRef.current = false;
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reads the latest values through refs
  }, 500), []);

  async function sortRecipes(sortType: string) {
    setSortAnchor(null);
    if (sortLoading || loading) return;

    let next = { ...latest.current.preferences };
    function setter(orderBy: string, ascIcon: string, descIcon: string, defaultOrderDirection = "asc", filterNull = false) {
      if (next.orderBy !== orderBy) {
        next = { ...next, orderBy, orderDirection: defaultOrderDirection, filterNull };
      }
      else {
        next = { ...next, orderDirection: next.orderDirection === "asc" ? "desc" : "asc" };
      }
      next.sortIcon = next.orderDirection === "asc" ? ascIcon : descIcon;
    }

    switch (sortType) {
      case EVENTS.az:
        setter("name", icons.sortAlphabeticalAscending, icons.sortAlphabeticalDescending, "asc", false);
        break;
      case EVENTS.rating:
        setter("rating", icons.sortAscending, icons.sortDescending, "desc", true);
        break;
      case EVENTS.created:
        setter("created_at", icons.sortCalendarAscending, icons.sortCalendarDescending, "desc", false);
        break;
      case EVENTS.updated:
        setter("updated_at", icons.sortClockAscending, icons.sortClockDescending, "desc", false);
        break;
      case EVENTS.lastMade:
        setter("last_made", icons.sortCalendarAscending, icons.sortCalendarDescending, "desc", true);
        break;
      case EVENTS.shuffle:
        // icon in asc and desc is the same for random
        setter("random", icons.diceMultiple, icons.diceMultiple);
        // We update the seed value to have a different order
        randomSeed.current = Date.now().toString();
        break;
      default:
        console.log("Unknown Event", sortType);
        return;
    }
    setPreferences(next);
    latest.current = { ...latest.current, preferences: next };

    // reset pagination
    page.current = 1;
    hasMore.current = true;
    setSortLoading(true);
    setLoading(true);

    const newRecipes = await fetchRecipes();
    latest.current.onReplaceRecipes?.(newRecipes);

    setSortLoading(false);
    setLoading(false);
  }

  async function navigateRandom() {
    const recipe = await getRandom(query, queryFilter);
    if (!recipe?.slug) return;
    void navigate(`/g/${groupSlug}/r/${recipe.slug}`);
  }

  const sortItems = [
    { event: EVENTS.az, icon: icons.orderAlphabeticalAscending, text: i18n.t("general.sort-alphabetically") },
    { event: EVENTS.rating, icon: icons.star, text: i18n.t("general.rating") },
    { event: EVENTS.created, icon: icons.newBox, text: i18n.t("general.created") },
    { event: EVENTS.updated, icon: icons.update, text: i18n.t("general.updated") },
    { event: EVENTS.lastMade, icon: icons.chefHat, text: i18n.t("general.last-made") },
    { event: EVENTS.shuffle, icon: icons.diceMultiple, text: i18n.t("general.random") },
  ];

  return (
    <Box className={className}>
      {!disableToolbar && (
        <Box sx={{ display: "flex", alignItems: "center", pb: 1 }}>
          {title && <Icon path={icon || icons.tags} size="large" start />}
          <Typography variant="h5" component="span">{title}</Typography>
          <Box sx={{ flex: 1 }} />
          {display.xs
            ? <IconButton disabled={recipes.length === 0} onClick={() => void navigateRandom()}><Icon path={icons.diceMultiple} /></IconButton>
            : (
                <Button variant="text" disabled={recipes.length === 0} onClick={() => void navigateRandom()} startIcon={<Icon path={icons.diceMultiple} />}>
                  {i18n.t("general.random")}
                </Button>
              )}
          {!disableSort && (
            <>
              {display.xs
                ? (
                    <IconButton onClick={e => setSortAnchor(e.currentTarget)}>
                      {sortLoading ? <CircularProgress size={20} /> : <Icon path={preferences.sortIcon} />}
                    </IconButton>
                  )
                : (
                    <Button
                      variant="text"
                      onClick={e => setSortAnchor(e.currentTarget)}
                      startIcon={sortLoading ? <CircularProgress size={18} /> : <Icon path={preferences.sortIcon} />}
                    >
                      {i18n.t("general.sort")}
                    </Button>
                  )}
              <Menu anchorEl={sortAnchor} open={!!sortAnchor} onClose={() => setSortAnchor(null)}>
                {sortItems.map(item => (
                  <MenuItem key={item.event} onClick={() => void sortRecipes(item.event)}>
                    <ListItemIcon><Icon path={item.icon} /></ListItemIcon>
                    <ListItemText>{item.text}</ListItemText>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
          {!display.smAndDown && (
            <ContextMenu
              items={[{ title: i18n.t("general.toggle-view"), icon: icons.eye, event: "toggle-dense-view" }]}
              onEvent={() => setPreferences({ useMobileCards: !preferences.useMobileCards })}
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
                      <Grid key={recipe.id!} size={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 3 }}>
                        <RecipeCard
                          name={recipe.name!}
                          description={recipe.description!}
                          slug={recipe.slug!}
                          rating={recipe.rating!}
                          image={recipe.image}
                          tags={recipe.tags!}
                          recipeId={recipe.id!}
                          onItemSelected={onItemSelected}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )
              : (
                  <Grid container spacing={2}>
                    {recipes.map(recipe => (
                      <Grid key={recipe.id!} size={{ xs: 12, sm: 12, md: singleColumn ? 12 : 6, lg: singleColumn ? 12 : 4, xl: singleColumn ? 12 : 3 }}>
                        <RecipeCardMobile
                          name={recipe.name!}
                          description={recipe.description!}
                          slug={recipe.slug!}
                          rating={recipe.rating!}
                          image={recipe.image}
                          tags={recipe.tags!}
                          recipeId={recipe.id!}
                          onItemSelected={onItemSelected}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
          </Box>
          <Intersect onIntersect={() => infiniteScroll()} />
        </div>
      )}
      <Fade in={loading} unmountOnExit>
        <div><AppLoader loading={loading} waitingText={i18n.t("general.loading-recipes")} /></div>
      </Fade>
      <AppScrollToTop />
    </Box>
  );
}

export default RecipeCardSection;
