import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import { throttle } from "~/lib/throttle";
import type { Recipe, RecipeTimelineEventOut, RecipeTimelineEventUpdate, TimelineEventType } from "~/lib/api/types/recipe";
import { useUserApi } from "~/hooks/api";
import { useTimelineEventTypes } from "~/hooks/recipes/use-recipe-timeline-events";
import { useI18n } from "~/hooks/use-global-i18n";
import { alert } from "~/hooks/use-toast";
import { useTimelinePreferences } from "~/hooks/use-users/preferences";
import { AppLoader } from "~/components/global/AppLoader";
import { Icon } from "~/components/global/Icon";
import { RecipeTimelineItem } from "./RecipeTimelineItem";

export interface RecipeTimelineProps {
  /** When this becomes true the events are reloaded (the dialog's v-model in the Vue component). */
  open?: boolean;
  queryFilter: string;
  maxHeight?: number | string;
  showRecipeCards?: boolean;
}

const perPage = 32;
const screenBuffer = 4;

export function RecipeTimeline({ open = false, queryFilter, maxHeight, showRecipeCards = false }: RecipeTimelineProps) {
  const api = useUserApi();
  const i18n = useI18n();
  const [preferences, setPreferences] = useTimelinePreferences();
  const { eventTypeOptions } = useTimelineEventTypes();
  const [loading, setLoading] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<RecipeTimelineEventOut[]>([]);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const recipes = useRef(new Map<string, Recipe>());
  const page = useRef(1);
  const hasMore = useRef(true);
  const loadingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  const filterBadgeCount = eventTypeOptions.length - preferences.types.length;
  const eventTypeFilterState = eventTypeOptions.map(option => ({ ...option, checked: preferences.types.includes(option.value) }));

  const updateRecipes = useCallback(async (events: RecipeTimelineEventOut[]) => {
    const recipeIds: string[] = [];
    events.forEach((event) => {
      if (recipeIds.includes(event.recipeId) || recipes.current.has(event.recipeId)) return;
      recipeIds.push(event.recipeId);
    });
    const qf = recipeIds.length ? "id IN [" + recipeIds.map(id => `"${id}"`).join(", ") + "]" : "";
    const { data } = await api.recipes.getAll(1, -1, { queryFilter: qf });
    (data?.items || []).forEach((result) => {
      if (result?.id) recipes.current.set(result.id, result);
    });
  }, [api]);

  const scrollTimelineEvents = useCallback(async () => {
    const prefs = prefsRef.current;
    const orderDirection = prefs.orderDirection === "asc" ? "asc" : "desc";
    const eventTypeValue = `["${prefs.types.join("\", \"")}"]`;
    const qf = `(${queryFilter}) AND eventType IN ${eventTypeValue}`;

    const response = await api.recipes.getAllTimelineEvents(page.current, perPage, { orderBy: "timestamp", orderDirection, queryFilter: qf });
    page.current += 1;
    if (!response?.data) return;

    const events = response.data.items;
    if (events.length < perPage) {
      hasMore.current = false;
      if (!events.length) return;
    }
    if (showRecipeCards) await updateRecipes(events);
    setTimelineEvents(prev => [...prev, ...events]);
  }, [api, queryFilter, showRecipeCards, updateRecipes]);

  const initializeTimelineEvents = useCallback(async () => {
    setLoading(true);
    loadingRef.current = true;
    page.current = 1;
    hasMore.current = true;
    setTimelineEvents([]);
    await scrollTimelineEvents();
    setLoading(false);
    loadingRef.current = false;
  }, [scrollTimelineEvents]);

  // preload events, and reload whenever the dialog opens
  useEffect(() => {
    void initializeTimelineEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load and whenever(open)
  }, [queryFilter]);
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) void initializeTimelineEvents();
    wasOpen.current = open;
  }, [open, initializeTimelineEvents]);

  const infiniteScroll = useMemo(() => throttle(async () => {
    if (!hasMore.current || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      await scrollTimelineEvents();
    }
    finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, 500), [scrollTimelineEvents]);

  useEffect(() => {
    function onScroll() {
      // if the inner element is scrollable, let its scroll event handle the infiniteScroll
      const el = containerRef.current;
      if (el && el.scrollHeight > el.clientHeight) return;
      const bottomOfWindow = document.documentElement.scrollTop + window.innerHeight >= document.documentElement.offsetHeight - (window.innerHeight * screenBuffer);
      if (bottomOfWindow) infiniteScroll();
    }
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [infiniteScroll]);

  function reverseSort() {
    if (loadingRef.current) return;
    const next = { ...prefsRef.current, orderDirection: prefsRef.current.orderDirection === "asc" ? "desc" : "asc" };
    setPreferences(next);
    prefsRef.current = next;
    void initializeTimelineEvents();
  }

  function toggleEventTypeOption(option: TimelineEventType) {
    if (loadingRef.current) return;
    const types = prefsRef.current.types.includes(option)
      ? prefsRef.current.types.filter(t => t !== option)
      : [...prefsRef.current.types, option];
    const next = { ...prefsRef.current, types };
    setPreferences(next);
    prefsRef.current = next;
    void initializeTimelineEvents();
  }

  async function updateTimelineEvent(index: number, event: RecipeTimelineEventUpdate) {
    const eventId = timelineEvents[index]!.id;
    const { response } = await api.recipes.updateTimelineEvent(eventId, event);
    if (response?.status !== 200) {
      alert.error(i18n.t("events.something-went-wrong"));
      return;
    }
    setTimelineEvents(prev => prev.map((e, i) => (i === index ? response.data : e)));
    alert.success(i18n.t("events.event-updated"));
  }

  async function deleteTimelineEvent(index: number) {
    const { response } = await api.recipes.deleteTimelineEvent(timelineEvents[index]!.id);
    if (response?.status !== 200) {
      alert.error(i18n.t("events.something-went-wrong"));
      return;
    }
    setTimelineEvents(prev => prev.filter((_e, i) => i !== index));
    alert.success(i18n.t("events.event-deleted"));
  }

  const maxHeightCss = typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;

  return (
    <Box sx={{ height: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 0, mt: 1.5, mx: 3.5, py: 1 }}>
        <Badge badgeContent={filterBadgeCount} invisible={filterBadgeCount <= 0} color="primary">
          <Button variant="text" onClick={e => setFilterAnchor(e.currentTarget)} startIcon={<Icon path={icons.filter} />}>
            {i18n.t("general.filter")}
          </Button>
        </Badge>
        <Menu anchorEl={filterAnchor} open={!!filterAnchor} onClose={() => setFilterAnchor(null)}>
          <MenuItem onClick={reverseSort}>
            <ListItemIcon><Icon path={preferences.orderDirection === "asc" ? icons.sortCalendarDescending : icons.sortCalendarAscending} /></ListItemIcon>
            <ListItemText>{preferences.orderDirection === "asc" ? i18n.t("general.sort-descending") : i18n.t("general.sort-ascending")}</ListItemText>
          </MenuItem>
          <Divider />
          {eventTypeFilterState.map(option => (
            <MenuItem key={option.value} selected={option.checked} onClick={() => toggleEventTypeOption(option.value)} sx={option.checked ? { color: "primary.main" } : undefined}>
              <ListItemIcon sx={option.checked ? { color: "primary.main" } : undefined}><Icon path={option.icon} /></ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </Box>
      {timelineEvents.length > 0
        ? (
            <Box
              id="timeline-container"
              ref={containerRef}
              sx={{ px: 0.5, width: "100%", ...(maxHeightCss ? { maxHeight: maxHeightCss, overflowY: "auto" } : {}) }}
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight * screenBuffer) infiniteScroll();
              }}
            >
              {timelineEvents.map((event, index) => (
                <RecipeTimelineItem
                  key={event.id}
                  event={event}
                  recipe={recipes.current.get(event.recipeId)}
                  showRecipeCards={showRecipeCards}
                  side={index % 2 === 0 ? "end" : "start"}
                  onUpdate={e => void updateTimelineEvent(index, e)}
                  onDelete={() => void deleteTimelineEvent(index)}
                />
              ))}
            </Box>
          )
        : !loading && (
            <Card sx={{ mt: 1 }}>
              <Typography variant="h6" sx={{ textAlign: "center", p: 4.5 }}>{i18n.t("recipe.timeline-no-events-found-try-adjusting-filters")}</Typography>
            </Card>
          )}
      {loading && (
        <Box sx={{ mb: 1.5, textAlign: "center" }}>
          <AppLoader loading={loading} waitingText={i18n.t("general.loading-events")} />
        </Box>
      )}
    </Box>
  );
}

export default RecipeTimeline;
