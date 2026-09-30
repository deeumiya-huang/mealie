import { icons } from "~/lib/icons";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { HouseholdSummary } from "~/lib/api/types/household";
import type { IngredientFood, RecipeCategory, RecipeTag, RecipeTool } from "~/lib/api/types/recipe";
import { useI18n } from "~/hooks/use-global-i18n";
import { useRecipeExplorerSearch } from "~/hooks/use-recipe-explorer-search";
import { Icon } from "~/components/global/Icon";
import { SearchFilter } from "~/components/Domain/SearchFilter";

export function RecipeExplorerPageSearchFilters() {
  const i18n = useI18n();
  const s = useRecipeExplorerSearch();
  const { categories, tags, tools, foods, households } = s.stores;

  return (
    <>
      <SearchFilter
        items={categories as NoUndefinedField<RecipeCategory>[]}
        value={s.selectedCategories}
        onChange={s.setSelectedCategories}
        requireAll={s.state.requireAllCategories}
        onRequireAllChange={v => s.setState({ requireAllCategories: v })}
      >
        <Icon path={icons.categories} start />
        {i18n.t("category.categories")}
      </SearchFilter>
      <SearchFilter
        items={tags as NoUndefinedField<RecipeTag>[]}
        value={s.selectedTags}
        onChange={s.setSelectedTags}
        requireAll={s.state.requireAllTags}
        onRequireAllChange={v => s.setState({ requireAllTags: v })}
      >
        <Icon path={icons.tags} start />
        {i18n.t("tag.tags")}
      </SearchFilter>
      <SearchFilter
        items={tools as NoUndefinedField<RecipeTool>[]}
        value={s.selectedTools}
        onChange={s.setSelectedTools}
        requireAll={s.state.requireAllTools}
        onRequireAllChange={v => s.setState({ requireAllTools: v })}
      >
        <Icon path={icons.potSteam} start />
        {i18n.t("tool.tools")}
      </SearchFilter>
      <SearchFilter
        items={foods as IngredientFood[]}
        value={s.selectedFoods}
        onChange={s.setSelectedFoods}
        requireAll={s.state.requireAllFoods}
        onRequireAllChange={v => s.setState({ requireAllFoods: v })}
      >
        <Icon path={icons.foods} start />
        {i18n.t("general.foods")}
      </SearchFilter>
      {households.length > 1 && (
        <SearchFilter
          items={households as NoUndefinedField<HouseholdSummary>[]}
          value={s.selectedHouseholds}
          onChange={s.setSelectedHouseholds}
          radio
        >
          <Icon path={icons.household} start />
          {i18n.t("household.households")}
        </SearchFilter>
      )}
    </>
  );
}

export default RecipeExplorerPageSearchFilters;
