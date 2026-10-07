// The recipe as the recipe page edits it. Vue shared one mutable `recipe` object (defineModel) down the component
// tree and every part mutated it in place; here the page owns it in state and the parts get the value plus an
// `onChange(update)` taking a new recipe or an updater of the previous one (React `SetStateAction`), so several
// edits in one event compose.
import type { SetStateAction } from "react";
import type { NoUndefinedField } from "@/lib/api/types/non-generated";
import type { Recipe } from "@/lib/api/types/recipe";

export type RecipeModel = NoUndefinedField<Recipe>;

export type RecipeChange = (update: SetStateAction<RecipeModel>) => void;

/** Applies a `SetStateAction` to a value (for sub-models passed down with their own setter). */
export function applyUpdate<T>(update: SetStateAction<T>, prev: T): T {
  return typeof update === "function" ? (update as (prev: T) => T)(prev) : update;
}

/**
 * The API types say every field is set (`NoUndefinedField`), but new rows are created with empty fields; Vue silenced
 * this with `@ts-expect-error`, the port with this cast at the boundary.
 */
export function asModel<T>(value: T): NoUndefinedField<T> {
  return value as NoUndefinedField<T>;
}
