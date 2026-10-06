// Usage: <RecipeTimeline queryFilter={`recipe.slug="${slug}"`} showRecipeCards maxHeight="60vh" open={dialogOpen} />
// The timeline of recipe events: a filter menu (sort direction, event types), the events as an @mui/lab timeline
// loaded 32 at a time while the page scrolls, and edit/delete of the user's own events. `open` (Vue `v-model`) reloads
// the events whenever it turns true, for a timeline that lives inside a dialog.
import { useEffect, useRef, useState } from "react";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Timeline from "@mui/lab/Timeline";
import { AppLoader } from "@/components/global/AppLoader";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { useTimelineEventTypes } from "@/hooks/recipes/use-recipe-timeline-events";
import { alert } from "@/hooks/use-toast";
import { useTimelinePreferences } from "@/hooks/use-users/preferences";
import { useDisplay, useThrottledCallback } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { Recipe, RecipeTimelineEventOut, RecipeTimelineEventUpdate, TimelineEventType } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeTimelineItem } from "./RecipeTimelineItem";

interface RecipeTimelineProps {
  open?: boolean;
  queryFilter: string;
  maxHeight?: number | string;
  showRecipeCards?: boolean;
}

const PER_PAGE = 32;
const SCREEN_BUFFER = 4;

export function RecipeTimeline({ open = false, queryFilter, maxHeight, showRecipeCards = false }: RecipeTimelineProps) {
  const api = useUserApi();
  const { t } = useI18n();
  const { xs, smAndDown } = useDisplay();
  const [preferences, setPreferences] = useTimelinePreferences();
  const { eventTypeOptions } = useTimelineEventTypes();

  const [loading, setLoading] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<RecipeTimelineEventOut[]>([]);
  const [recipes, setRecipes] = useState<Map<string, Recipe>>(() => new Map());
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);

  const page = useRef(1);
  const hasMore = useRef(true);
  const loadingRef = useRef(true);
  // a newer (re)load makes the answers of older ones obsolete
  const loadId = useRef(0);
  // the recipes already requested, so a recipe is fetched once
  const knownRecipeIds = useRef(new Set<string>());

  const filterBadgeCount = eventTypeOptions.length - preferences.types.length;
  const eventTypeFilterState = eventTypeOptions.map(option => ({
    ...option,
    checked: preferences.types.includes(option.value),
  }));

  function updateLoading(value: boolean) {
    loadingRef.current = value;
    setLoading(value);
  }

  // Timeline Actions
  async function updateTimelineEvent(index: number, event: RecipeTimelineEventUpdate) {
    const eventId = timelineEvents[index]?.id;
    if (!eventId) {
      return;
    }
    const { response } = await api.recipes.updateTimelineEvent(eventId, event);
    if (response?.status !== 200) {
      alert.error(t("events.something-went-wrong"));
      return;
    }

    // Update the local event data to reflect the changes in the UI
    setTimelineEvents(current => current.map(existing => (existing.id === eventId ? response.data : existing)));

    alert.success(t("events.event-updated"));
  }

  async function deleteTimelineEvent(index: number) {
    const eventId = timelineEvents[index]?.id;
    if (!eventId) {
      return;
    }
    const { response } = await api.recipes.deleteTimelineEvent(eventId);
    if (response?.status !== 200) {
      alert.error(t("events.something-went-wrong"));
      return;
    }

    setTimelineEvents(current => current.filter(existing => existing.id !== eventId));
    alert.success(t("events.event-deleted"));
  }

  async function getRecipes(recipeIds: string[]): Promise<Recipe[]> {
    let qf = "";
    if (recipeIds.length) {
      qf = "id IN [" + recipeIds.map(id => `"${id}"`).join(", ") + "]";
    }
    const { data } = await api.recipes.getAll(1, -1, { queryFilter: qf });
    return data?.items || [];
  }

  async function updateRecipes(events: RecipeTimelineEventOut[]) {
    const recipeIds: string[] = [];
    events.forEach((event) => {
      if (recipeIds.includes(event.recipeId) || knownRecipeIds.current.has(event.recipeId)) {
        return;
      }

      recipeIds.push(event.recipeId);
    });

    const results = await getRecipes(recipeIds);
    const fetched = new Map<string, Recipe>();
    results.forEach((result) => {
      if (!result?.id) {
        return;
      }
      fetched.set(result.id, result);
      knownRecipeIds.current.add(result.id);
    });
    setRecipes(current => new Map([...current, ...fetched]));
  }

  // Loads the next page; `replace` starts over (the page-one result replaces the list).
  async function scrollTimelineEvents(types: TimelineEventType[], orderDirection: string, id: number, replace: boolean) {
    const orderBy = "timestamp";
    const direction = orderDirection === "asc" ? "asc" : "desc";

    const eventTypeValue = `["${types.join("\", \"")}"]`;
    const filter = `(${queryFilter}) AND eventType IN ${eventTypeValue}`;

    const response = await api.recipes.getAllTimelineEvents(page.current, PER_PAGE, { orderBy, orderDirection: direction, queryFilter: filter });
    if (id !== loadId.current) {
      return;
    }
    page.current += 1;
    if (!response?.data) {
      return;
    }

    const events = response.data.items;
    if (events.length < PER_PAGE) {
      hasMore.current = false;
      if (!events.length) {
        return;
      }
    }

    // fetch recipes
    if (showRecipeCards) {
      await updateRecipes(events);
      if (id !== loadId.current) {
        return;
      }
    }

    setTimelineEvents(current => (replace ? events : [...current, ...events]));
  }

  // The synchronous half of a reload: show the spinner, drop the old events.
  function beginReload() {
    setLoading(true);
    setTimelineEvents([]);
  }

  // The asynchronous half: fetch the first page. Nothing is set before the first await, so
  // it is also safe to start from an effect.
  async function loadFirstPage(types: TimelineEventType[] = preferences.types, orderDirection: string = preferences.orderDirection) {
    loadId.current += 1;
    const id = loadId.current;
    loadingRef.current = true;

    page.current = 1;
    hasMore.current = true;
    await scrollTimelineEvents(types, orderDirection, id, true);

    if (id === loadId.current) {
      updateLoading(false);
    }
  }

  // Preferences
  function reverseSort() {
    if (loading) {
      return;
    }

    const orderDirection = preferences.orderDirection === "asc" ? "desc" : "asc";
    setPreferences({ ...preferences, orderDirection });
    beginReload();
    void loadFirstPage(preferences.types, orderDirection);
  }

  function toggleEventTypeOption(option: TimelineEventType) {
    if (loading) {
      return;
    }

    const types = preferences.types.includes(option)
      ? preferences.types.filter(type => type !== option)
      : [...preferences.types, option];
    setPreferences({ ...preferences, types });
    beginReload();
    void loadFirstPage(types, preferences.orderDirection);
  }

  // Reload each time the surrounding dialog opens (Vue: whenever(modelValue, …)).
  const [wasOpen, setWasOpen] = useState(open);
  const [reloadKey, setReloadKey] = useState(0);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      beginReload();
      setReloadKey(key => key + 1);
    }
  }

  // preload events when the timeline appears, and again on every reload request
  const loadFirstPageRef = useRef(loadFirstPage);
  useEffect(() => {
    loadFirstPageRef.current = loadFirstPage;
  });
  useEffect(() => {
    void loadFirstPageRef.current();
  }, [reloadKey]);

  const infiniteScroll = useThrottledCallback(() => {
    if (!hasMore.current || loadingRef.current) {
      return;
    }
    updateLoading(true);
    const id = loadId.current;
    void scrollTimelineEvents(preferences.types, preferences.orderDirection, id, false).finally(() => {
      if (id === loadId.current) {
        updateLoading(false);
      }
    });
  }, 500);

  useEffect(() => {
    function onScroll() {
      // if the inner element is scrollable, let its scroll event handle the infiniteScroll
      const timelineContainerElement = document.getElementById("timeline-container");
      if (timelineContainerElement) {
        const { clientHeight, scrollHeight } = timelineContainerElement;

        // if scrollHeight == clientHeight, the element is not scrollable, so we need to look at the global position
        // if scrollHeight > clientHeight, it is scrollable and we don't need to do anything here
        if (scrollHeight > clientHeight) {
          return;
        }
      }

      const bottomOfWindow = document.documentElement.scrollTop + window.innerHeight >= document.documentElement.offsetHeight - (window.innerHeight * SCREEN_BUFFER);
      if (bottomOfWindow) {
        infiniteScroll();
      }
    }

    document.addEventListener("scroll", onScroll);
    return () => document.removeEventListener("scroll", onScroll);
  }, [infiniteScroll]);

  return (
    <Box sx={{ height: "100%" }}>
      <Box sx={{ display: "flex", mb: 0, mt: 1.5, mx: 3.5 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ textAlign: "right", p: 1 }}>
          {/* Filters */}
          <Badge
            badgeContent={filterBadgeCount}
            invisible={filterBadgeCount <= 0}
            color="primary"
            overlap="rectangular"
          >
            <Button
              variant="text"
              color="inherit"
              startIcon={<MdiIcon path={icons.filter} />}
              aria-haspopup="menu"
              aria-expanded={filterAnchor !== null}
              onClick={event => setFilterAnchor(event.currentTarget)}
            >
              {t("general.filter")}
            </Button>
          </Badge>
          <Menu
            anchorEl={filterAnchor}
            open={filterAnchor !== null}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={reverseSort}>
              <ListItemIcon>
                <MdiIcon path={preferences.orderDirection === "asc" ? icons.sortCalendarDescending : icons.sortCalendarAscending} />
              </ListItemIcon>
              <ListItemText>
                {preferences.orderDirection === "asc" ? t("general.sort-descending") : t("general.sort-ascending")}
              </ListItemText>
            </MenuItem>
            <Divider />
            {eventTypeFilterState.map(option => (
              <MenuItem
                key={option.value}
                selected={option.checked}
                onClick={() => toggleEventTypeOption(option.value)}
              >
                <ListItemIcon>
                  <MdiIcon path={option.icon} />
                </ListItemIcon>
                <ListItemText>
                  {option.label}
                </ListItemText>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>
      {timelineEvents.length > 0
        ? (
            <Box
              id="timeline-container"
              sx={{ px: 0.5, width: "100%", ...(maxHeight ? { maxHeight, overflowY: "auto" } : {}) }}
            >
              <Timeline
                className="timeline"
                position={smAndDown ? "right" : "alternate"}
                sx={{
                  "p": xs ? 0 : undefined,
                  "& .MuiTimelineItem-root:last-of-type .MuiTimelineConnector-root": { display: "none" },
                }}
              >
                {timelineEvents.map((event, index) => (
                  <RecipeTimelineItem
                    key={event.id}
                    event={event}
                    recipe={recipes.get(event.recipeId)}
                    showRecipeCards={showRecipeCards}
                    onUpdate={updated => void updateTimelineEvent(index, updated)}
                    onDelete={() => void deleteTimelineEvent(index)}
                  />
                ))}
              </Timeline>
            </Box>
          )
        : !loading && (
            <Card sx={{ mt: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "center", p: 4.5, fontSize: "1.25rem", fontWeight: 500 }}>
                {t("recipe.timeline-no-events-found-try-adjusting-filters")}
              </Box>
            </Card>
          )}
      {loading && (
        <Box sx={{ mb: 1.5, textAlign: "center" }}>
          <AppLoader loading={loading} waitingText={t("general.loading-events")} />
        </Box>
      )}
    </Box>
  );
}
