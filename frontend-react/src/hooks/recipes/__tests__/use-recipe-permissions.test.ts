import { describe, test, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRecipePermissions } from "../use-recipe-permissions";
import type { HouseholdSummary } from "@/lib/api/types/household";
import type { Recipe } from "@/lib/api/types/recipe";
import type { UserOut } from "@/lib/api/types/user";

describe("test use recipe permissions", () => {
  // hooks need a React render context (Vue tests called the composable directly)
  const permissions = (recipe: Recipe, household: HouseholdSummary | undefined, user: UserOut | null) =>
    renderHook(() => useRecipePermissions(recipe, household, user)).result.current;

  const commonUserId = "my-user-id";
  const commonGroupId = "my-group-id";
  const commonHouseholdId = "my-household-id";

  const createRecipe = (overrides: Partial<Recipe>, isLocked = false): Recipe => ({
    id: "my-recipe-id",
    userId: commonUserId,
    groupId: commonGroupId,
    householdId: commonHouseholdId,
    settings: {
      locked: isLocked,
    },
    ...overrides,
  });

  const createUser = (overrides: Partial<UserOut>): UserOut => ({
    id: commonUserId,
    groupId: commonGroupId,
    groupSlug: "my-group",
    group: "my-group",
    householdId: commonHouseholdId,
    householdSlug: "my-household",
    household: "my-household",
    email: "bender.rodriguez@example.com",
    cacheKey: "1234",
    ...overrides,
  });

  const createRecipeHousehold = (overrides: Partial<HouseholdSummary>, lockRecipeEdits = false): HouseholdSummary => (
    ({
      id: commonHouseholdId,
      groupId: commonGroupId,
      name: "My Household",
      slug: "my-household",
      preferences: {
        id: "my-household-preferences-id",
        lockRecipeEditsFromOtherHouseholds: lockRecipeEdits,
      },
      ...overrides,
    })
  );

  test("when user is null, cannot edit", () => {
    const result = permissions(createRecipe({}), createRecipeHousehold({}), null);
    expect(result.canEditRecipe).toBe(false);
  });

  test("when user is recipe owner, can edit", () => {
    const result = permissions(createRecipe({}), undefined, createUser({}));
    expect(result.canEditRecipe).toBe(true);
  });

  test(
    "when user is not recipe owner, is correct group and household, recipe is unlocked, and household is unlocked, can edit",
    () => {
      const result = permissions(
        createRecipe({}),
        createRecipeHousehold({}),
        createUser({ id: "other-user-id" }),
      );
      expect(result.canEditRecipe).toBe(true);
    },
  );

  test(
    "when user is not recipe owner, is correct group and household, recipe is unlocked, but household is locked, can edit",
    () => {
      const result = permissions(
        createRecipe({}),
        createRecipeHousehold({}, true),
        createUser({ id: "other-user-id" }),
      );
      expect(result.canEditRecipe).toBe(true);
    },
  );

  test("when user is not recipe owner, and user is other group, cannot edit", () => {
    const result = permissions(
      createRecipe({}),
      createRecipeHousehold({}),
      createUser({ id: "other-user-id", groupId: "other-group-id" }),
    );
    expect(result.canEditRecipe).toBe(false);
  });

  test("when user is not recipe owner, and user is other household, and household is unlocked, can edit", () => {
    const result = permissions(
      createRecipe({}),
      createRecipeHousehold({}),
      createUser({ id: "other-user-id", householdId: "other-household-id" }),
    );
    expect(result.canEditRecipe).toBe(true);
  });

  test("when user is not recipe owner, and user is other household, and household is locked, cannot edit", () => {
    const result = permissions(
      createRecipe({}),
      createRecipeHousehold({}, true),
      createUser({ id: "other-user-id", householdId: "other-household-id" }),
    );
    expect(result.canEditRecipe).toBe(false);
  });

  test("when user is not recipe owner, and recipe is locked, cannot edit", () => {
    const result = permissions(
      createRecipe({}, true),
      createRecipeHousehold({}),
      createUser({ id: "other-user-id" }),
    );
    expect(result.canEditRecipe).toBe(false);
  });

  test("when user is recipe owner, and recipe is locked, and household is locked, can edit", () => {
    const result = permissions(createRecipe({}, true), createRecipeHousehold({}, true), createUser({}));
    expect(result.canEditRecipe).toBe(true);
  });

  test("when user is admin, and user is same group but other household, and household is locked, can edit", () => {
    const result = permissions(
      createRecipe({}),
      createRecipeHousehold({}, true),
      createUser({ id: "other-user-id", householdId: "other-household-id", admin: true }),
    );
    expect(result.canEditRecipe).toBe(true);
  });

  test("when user is admin, but user is other group, cannot edit", () => {
    const result = permissions(
      createRecipe({}),
      createRecipeHousehold({}),
      createUser({ id: "other-user-id", groupId: "other-group-id", admin: true }),
    );
    expect(result.canEditRecipe).toBe(false);
  });
});
