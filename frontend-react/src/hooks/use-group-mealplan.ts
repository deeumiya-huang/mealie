import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useUserApi } from "@/hooks/api";
import { getGlobalI18n, useI18n } from "@/i18n";
import type { CreatePlanEntry, PlanEntryType, ReadPlanEntry, RecipeSummary, UpdatePlanEntry } from "@/lib/api/types/meal-plan";

type PlanOption = {
  text: string;
  value: PlanEntryType;
};
export function usePlanTypeOptions() {
  const i18n = useI18n();

  return useMemo(() => [
    { text: i18n.t("meal-plan.breakfast"), value: "breakfast" },
    { text: i18n.t("meal-plan.lunch"), value: "lunch" },
    { text: i18n.t("meal-plan.dinner"), value: "dinner" },
    { text: i18n.t("meal-plan.side"), value: "side" },
    { text: i18n.t("meal-plan.snack"), value: "snack" },
    { text: i18n.t("meal-plan.drink"), value: "drink" },
    { text: i18n.t("meal-plan.dessert"), value: "dessert" },
  ] as PlanOption[], [i18n]);
}

/** Not a hook (it only translates), so it can be called anywhere. */
export function getEntryTypeText(value: PlanEntryType) {
  return getGlobalI18n().t("meal-plan." + value);
}
export interface DateRange {
  start: Date;
  end: Date;
}
export type DaySection = {
  title: string;
  meals: ReadPlanEntry[];
};

export type Days = {
  date: Date;
  sections: DaySection[];
  recipes: RecipeSummary[];
};

export type MealsByDate = {
  date: Date;
  meals: ReadPlanEntry[];
};

export interface Meal {
  date: Date;
  title: string;
  text: string;
  recipeId?: string;
  entryType: PlanEntryType;
  existing: boolean;
  id: number;
  groupId: string;
  userId: string;
  note: boolean;
  householdId: string;
}

/**
 * Meal plan entries in `range`. Vue took the range as a ref and watched it; here the range is a plain
 * argument and the entries reload whenever its start or end day changes (and on mount).
 */
export const useMealplans = function (range: DateRange) {
  const api = useUserApi();
  const [loading, setLoading] = useState(false);
  const [mealplans, setMealplans] = useState<ReadPlanEntry[] | null>(null);

  const startDate = format(range.start, "yyyy-MM-dd");
  const endDate = format(range.end, "yyyy-MM-dd");

  const fetchEntries = useCallback(async () => {
    const { data } = await api.mealplans.getAll(1, -1, { start_date: startDate, end_date: endDate });
    return data;
  }, [api, startDate, endDate]);

  const getAll = useCallback(async () => {
    setLoading(true);
    const data = await fetchEntries();
    const items = data ? data.items : null;
    setMealplans(items);
    setLoading(false);
    return items;
  }, [fetchEntries]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const data = await fetchEntries();

    if (data && data.items) {
      setMealplans(data.items);
    }

    setLoading(false);
  }, [fetchEntries]);

  const createOne = useCallback(async (payload: CreatePlanEntry) => {
    setLoading(true);

    const { data } = await api.mealplans.createOne(payload);
    if (data) {
      await refreshAll();
    }

    setLoading(false);
  }, [api, refreshAll]);

  const updateOne = useCallback(async (updateData: UpdatePlanEntry) => {
    if (!updateData.id) {
      return;
    }

    setLoading(true);
    const { data } = await api.mealplans.updateOne(updateData.id, updateData);
    if (data) {
      await refreshAll();
    }
    setLoading(false);
  }, [api, refreshAll]);

  const deleteOne = useCallback(async (id: string | number) => {
    setLoading(true);
    const { data } = await api.mealplans.deleteOne(id);
    if (data) {
      await refreshAll();
    }
    setLoading(false);
  }, [api, refreshAll]);

  const setType = useCallback(async (payload: UpdatePlanEntry, type: PlanEntryType) => {
    payload.entryType = type;
    await updateOne(payload);
  }, [updateOne]);

  // initial load (Vue: `actions.getAll()` in setup) and reload when the range changes (`watch(range, refreshAll)`)
  useEffect(() => {
    let active = true;
    void fetchEntries().then((data) => {
      if (active && data && data.items) {
        setMealplans(data.items);
      }
    });
    return () => {
      active = false;
    };
  }, [fetchEntries]);

  const actions = { getAll, refreshAll, createOne, updateOne, deleteOne, setType };

  return { mealplans, actions, loading };
};
