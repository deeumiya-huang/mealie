import Container from "@mui/material/Container";
import { RecipeOrganizerPage } from "@/components/Domain/Recipe/RecipeOrganizerPage";
import { useCategoryStore } from "@/hooks/store";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

export default function RecipeCategoriesPage() {
  const { store, actions } = useCategoryStore();
  const { t } = useI18n();

  usePageTitle(t("category.categories"));

  return (
    <Container>
      <RecipeOrganizerPage
        items={store}
        icon={icons.categories}
        itemType="categories"
        title={t("category.categories")}
        onDelete={id => void actions.deleteOne(id)}
        onUpdate={item => void actions.updateOne(item)}
      />
    </Container>
  );
}
