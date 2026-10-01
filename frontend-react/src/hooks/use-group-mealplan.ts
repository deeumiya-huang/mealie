import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { userApi } from "~/hooks/api";
import { getGlobalI18n, useI18n } from "~/hooks/use-global-i18n";
import type { CreatePlanEntry, PlanEntryType, ReadPlanEntry, RecipeSummary, UpdatePlanEntry } from "~/lib/api/types/meal-plan";

type PlanOption = {
  text: string;
  value: PlanEntryType;
};

export function usePlanTypeOptions(): PlanOption[] {
  const i18n = useI18n();
  return [
    { text: i18n.t("meal-plan.breakfast"), value: "breakfast" },
    { text: i18n.t("meal-plan.lunch"), value: "lunch" },
    { text: i18n.t("meal-plan.dinner"), value: "dinner" },
    { text: i18n.t("meal-plan.side"), value: "side" },
    { text: i18n.t("meal-plan.snack"), value: "snack" },
    { text: i18n.t("meal-plan.drink"), value: "drink" },
    { text: i18n.t("meal-plan.dessert"), value: "dessert" },
  ];
}

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

/** Meal plan entries for a date range; refetches when the range changes. */
export const useMealplans = function (range: DateRange) {
  const [mealplans, setMealplans] = useState<ReadPlanEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const startKey = format(range.start, "yyyy-MM-dd");
  const endKey = format(range.end, "yyyy-MM-dd");
  const rangeRef = useRef({ startKey, endKey });
  rangeRef.current = { startKey, endKey };

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const { startKey: start_date, endKey: end_date } = rangeRef.current;
    const { data } = await userApi().mealplans.getAll(1, -1, { start_date, end_date });
    if (data && data.items) {
      setMealplans(data.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [startKey, endKey, refreshAll]);

  const actions = useMemo(() => ({
    refreshAll,
    async createOne(payload: CreatePlanEntry) {
      setLoading(true);
      const { data } = await userApi().mealplans.createOne(payload);
      if (data) void refreshAll();
      setLoading(false);
    },
    async updateOne(updateData: UpdatePlanEntry) {
      if (!updateData.id) return;
      setLoading(true);
      const { data } = await userApi().mealplans.updateOne(updateData.id, updateData);
      if (data) void refreshAll();
      setLoading(false);
    },
    async deleteOne(id: string | number) {
      setLoading(true);
      const { data } = await userApi().mealplans.deleteOne(id);
      if (data) void refreshAll();
      setLoading(false);
    },
    async setType(payload: UpdatePlanEntry, type: PlanEntryType) {
      await this.updateOne({ ...payload, entryType: type });
    },
  }), [refreshAll]);

  return { mealplans, setMealplans, actions, loading };
};
