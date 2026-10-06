import { useCallback, useEffect } from "react";
import { useUserApi } from "@/hooks/api";
import { registerCacheReset } from "@/hooks/use-clear-composable-caches";
import type { PlanEntryType, PlanRulesDay, PlanRulesOut } from "@/lib/api/types/meal-plan";
import { createStore, useStore } from "@/lib/store";

const DAYS_OF_WEEK: PlanRulesDay[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getDayOfWeek(date: Date): PlanRulesDay {
  return DAYS_OF_WEEK[date.getDay()] ?? "unset";
}

export function getApplicableRules(
  rules: PlanRulesOut[],
  date: Date,
  entryType: PlanEntryType,
): PlanRulesOut[] {
  const day = getDayOfWeek(date);

  return rules.filter((rule) => {
    const dayMatches = !rule.day || rule.day === "unset" || rule.day === day;
    const typeMatches = !rule.entryType || rule.entryType === "unset" || rule.entryType === entryType;
    return dayMatches && typeMatches;
  });
}

export function buildRuleQueryFilter(
  rules: PlanRulesOut[],
  date: Date,
  entryType: PlanEntryType,
): string | null {
  const queryFilters = getApplicableRules(rules, date, entryType)
    .map(rule => rule.queryFilterString)
    .filter(queryFilterString => !!queryFilterString)
    .map(queryFilterString => `(${queryFilterString})`);

  return queryFilters.length ? queryFilters.join(" AND ") : null;
}

// Module-level state shared by every component (Vue: module-scope refs).
const rulesStore = createStore<PlanRulesOut[]>([]);
const loadingStore = createStore(false);
const initializedStore = createStore(false);

export function resetMealplanRuleStore() {
  rulesStore.set([]);
  loadingStore.set(false);
  initializedStore.set(false);
}
registerCacheReset(resetMealplanRuleStore);

export const useMealplanRules = function () {
  const api = useUserApi();
  const rules = useStore(rulesStore);
  const loading = useStore(loadingStore);
  const initialized = useStore(initializedStore);

  const refresh = useCallback(async () => {
    loadingStore.set(true);

    const { data } = await api.mealplanRules.getAll();
    if (data) {
      rulesStore.set(data.items ?? []);
    }

    initializedStore.set(true);
    loadingStore.set(false);
  }, [api]);

  // initial hydration
  useEffect(() => {
    if (!loadingStore.get() && !initializedStore.get()) {
      void refresh();
    }
  }, [refresh]);

  return { rules, loading, initialized, refresh };
};
