import type { GlobalI18n } from "@/i18n";

export type I18n = GlobalI18n;
export type TRoute = string;
export type TranslationResult = string;

export type ActivityRoute = (groupSlug?: string) => TRoute;
export type ActivityLabel = (i18n: I18n) => TranslationResult;

export type Activity = {
  key: ActivityKey;
  route: ActivityRoute;
  label: ActivityLabel;
};

export const enum ActivityKey {
  RECIPES = "recipes",
  MEALPLANNER = "mealplanner",
  SHOPPING_LIST = "shopping_list",
}
