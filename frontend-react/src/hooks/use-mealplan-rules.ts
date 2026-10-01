import { useEffect } from "react";
import { userApi } from "~/hooks/api";
import { createStore, registerCacheReset, useStore } from "~/lib/store";
import type { PlanEntryType, PlanRulesDay, PlanRulesOut } from "~/lib/api/types/meal-plan";

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

const rulesStore = createStore<PlanRulesOut[]>([]);
const loadingStore = createStore(false);
const initializedStore = createStore(false);

export function resetMealplanRuleStore() {
  rulesStore.set([]);
  loadingStore.set(false);
  initializedStore.set(false);
}
registerCacheReset(resetMealplanRuleStore);

async function refresh() {
  loadingStore.set(true);

  const { data } = await userApi().mealplanRules.getAll();
  if (data) {
    rulesStore.set(data.items ?? []);
  }

  initializedStore.set(true);
  loadingStore.set(false);
}

export const useMealplanRules = function () {
  const rules = useStore(rulesStore);
  const loading = useStore(loadingStore);
  const initialized = useStore(initializedStore);

  // initial hydration
  useEffect(() => {
    if (!loadingStore.get() && !initializedStore.get()) {
      void refresh();
    }
  }, []);

  return { rules, loading, initialized, refresh };
};
