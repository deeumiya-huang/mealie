import { describe, expect, test, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useQueryFilterBuilder } from "../use-query-filter-builder";
import { Organizer } from "@/lib/api/types/non-generated";

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  const stub = { t: (key: string) => key };
  return {
    ...actual,
    useI18n: () => stub,
  };
});

// hooks need a React render context (Vue tests called the composable directly)
const builder = () => renderHook(useQueryFilterBuilder).result.current;

const LABEL_ID = "a5f1c6d2-0000-4000-8000-000000000001";
const OTHER_LABEL_ID = "a5f1c6d2-0000-4000-8000-000000000002";

const FOOD_LABEL_FIELD_DEF = {
  name: "recipe_ingredient.food.label_id",
  label: "Food Label",
  type: Organizer.Label,
};

describe("food label fields", () => {
  test("are handled as an organizer, so the shared picker and hydration apply", () => {
    const { isOrganizerType } = builder();

    expect(isOrganizerType(Organizer.Label)).toBe(true);
  });

  test("default to the IN operator", () => {
    const { getFieldFromFieldDef } = builder();

    const field = getFieldFromFieldDef(FOOD_LABEL_FIELD_DEF);

    expect(field.relationalOperatorValue.value).toBe("IN");
    expect(field.relationalOperatorChoices.map(choice => choice.value)).toEqual([
      "IN",
      "NOT IN",
      "CONTAINS ALL",
    ]);
  });

  test("build a quoted list query filter string", () => {
    const { getFieldFromFieldDef, buildQueryFilterString } = builder();

    const field = getFieldFromFieldDef(FOOD_LABEL_FIELD_DEF);
    field.values = [LABEL_ID, OTHER_LABEL_ID];

    expect(buildQueryFilterString([field], false)).toBe(
      `recipe_ingredient.food.label_id IN ["${LABEL_ID}","${OTHER_LABEL_ID}"]`,
    );
  });

  test("can exclude a label", () => {
    const { getFieldFromFieldDef, buildQueryFilterString, getRelOps } = builder();

    const field = getFieldFromFieldDef(FOOD_LABEL_FIELD_DEF);
    field.values = [LABEL_ID];
    field.relationalOperatorValue = getRelOps(Organizer.Label)["NOT IN"];

    expect(buildQueryFilterString([field], false)).toBe(
      `recipe_ingredient.food.label_id NOT IN ["${LABEL_ID}"]`,
    );
  });

  test("are invalid without a selected label", () => {
    const { getFieldFromFieldDef, buildQueryFilterString } = builder();

    const field = getFieldFromFieldDef(FOOD_LABEL_FIELD_DEF);

    expect(buildQueryFilterString([field], false)).toBe("");
  });
});

const TOTAL_TIME_FIELD_DEF = {
  name: "total_time_seconds",
  label: "Total Time",
  type: "duration" as const,
};

describe("duration fields", () => {
  test("default to the <= operator and only offer comparisons", () => {
    const { getFieldFromFieldDef } = builder();

    const field = getFieldFromFieldDef(TOTAL_TIME_FIELD_DEF);

    expect(field.relationalOperatorValue.value).toBe("<=");
    expect(field.relationalOperatorChoices.map(choice => choice.value)).toEqual(["<=", ">=", "<", ">"]);
  });

  test("build an unquoted seconds query filter string", () => {
    const { getFieldFromFieldDef, buildQueryFilterString } = builder();

    const field = getFieldFromFieldDef(TOTAL_TIME_FIELD_DEF);
    field.value = 1800;

    expect(buildQueryFilterString([field], false)).toBe("total_time_seconds <= 1800");
  });

  test("are invalid without a duration", () => {
    const { getFieldFromFieldDef, buildQueryFilterString } = builder();

    const field = getFieldFromFieldDef(TOTAL_TIME_FIELD_DEF);

    expect(buildQueryFilterString([field], false)).toBe("");
  });
});
