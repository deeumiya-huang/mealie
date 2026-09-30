import { BaseContainer } from "~/components/global/BaseContainer";
import { RecipeOrganizerPage } from "~/components/Domain/Recipe/RecipeOrganizerPage";
import type { GenericItem } from "~/components/Domain/Recipe/RecipeOrganizerPage";
import { useCategoryStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { icons } from "~/lib/icons";
import type { RecipeCategory } from "~/lib/api/types/recipe";

export default function CategoriesPage() {
  const i18n = useI18n();
  const { store, actions } = useCategoryStore();

  useSeoMeta({ title: i18n.t("category.categories") });

  return (
    <BaseContainer>
      <RecipeOrganizerPage
        items={store as (RecipeCategory & GenericItem)[]}
        icon={icons.categories}
        itemType="categories"
        title={i18n.t("category.categories")}
        onDelete={id => void actions.deleteOne(id)}
        onUpdate={item => void actions.updateOne(item)}
      />
    </BaseContainer>
  );
}
