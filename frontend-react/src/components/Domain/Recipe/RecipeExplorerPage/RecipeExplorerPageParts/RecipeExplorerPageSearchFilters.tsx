// Usage: <RecipeExplorerPageSearchFilters /> — the category / tag / tool / food / household filter buttons of the
// recipe explorer; their selections live in the shared explorer search state (`useRecipeExplorerSearch`).
import { useEffect } from "react";
import Box from "@mui/material/Box";
import { useParams } from "react-router";
import { MdiIcon } from "@/components/global/MdiIcon";
import { SearchFilter } from "@/components/Domain/SearchFilter";
import { useRecipeExplorerSearch, useRecipeExplorerStores } from "@/hooks/use-recipe-explorer-search";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useI18n } from "@/i18n";
import type { HouseholdSummary } from "@/lib/api/types/household";
import type { NoUndefinedField } from "@/lib/api/types/non-generated";
import type { RecipeCategory, RecipeTag, RecipeTool } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

export function RecipeExplorerPageSearchFilters() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const {
    state,
    setState,
    selectedCategories,
    selectedFoods,
    selectedHouseholds,
    selectedTags,
    selectedTools,
    setSelectedCategories,
    setSelectedFoods,
    setSelectedHouseholds,
    setSelectedTags,
    setSelectedTools,
  } = useRecipeExplorerSearch(groupSlug);

  const { categories, tags, tools, foods, households } = useRecipeExplorerStores(groupSlug);
  const householdCount = households.store.length;

  useEffect(() => {
    // if exactly one household exists, then we shouldn't be filtering by household
    if (householdCount === 1 && selectedHouseholds.length > 0) {
      setSelectedHouseholds([]);
    }
  }, [householdCount, selectedHouseholds.length, setSelectedHouseholds]);

  const label = (path: string, text: string) => (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
      <MdiIcon path={path} sx={{ mr: 1 }} />
      {text}
    </Box>
  );

  return (
    <>
      {/* Category Filter */}
      <SearchFilter
        items={categories.store as NoUndefinedField<RecipeCategory>[]}
        value={selectedCategories}
        onChange={setSelectedCategories}
        requireAll={state.requireAllCategories}
        onRequireAllChange={requireAll => setState({ requireAllCategories: !!requireAll })}
      >
        {label(icons.categories, t("category.categories"))}
      </SearchFilter>

      {/* Tag Filter */}
      <SearchFilter
        items={tags.store as NoUndefinedField<RecipeTag>[]}
        value={selectedTags}
        onChange={setSelectedTags}
        requireAll={state.requireAllTags}
        onRequireAllChange={requireAll => setState({ requireAllTags: !!requireAll })}
      >
        {label(icons.tags, t("tag.tags"))}
      </SearchFilter>

      {/* Tool Filter */}
      <SearchFilter
        items={tools.store as NoUndefinedField<RecipeTool>[]}
        value={selectedTools}
        onChange={setSelectedTools}
        requireAll={state.requireAllTools}
        onRequireAllChange={requireAll => setState({ requireAllTools: !!requireAll })}
      >
        {label(icons.potSteam, t("tool.tools"))}
      </SearchFilter>

      {/* Food Filter */}
      <SearchFilter
        items={foods.store}
        value={selectedFoods}
        onChange={setSelectedFoods}
        requireAll={state.requireAllFoods}
        onRequireAllChange={requireAll => setState({ requireAllFoods: !!requireAll })}
      >
        {label(icons.foods, t("general.foods"))}
      </SearchFilter>

      {/* Household Filter */}
      {householdCount > 1 && (
        <SearchFilter
          items={households.store as NoUndefinedField<HouseholdSummary>[]}
          value={selectedHouseholds}
          onChange={setSelectedHouseholds}
          radio
        >
          {label(icons.household, t("household.households"))}
        </SearchFilter>
      )}
    </>
  );
}
