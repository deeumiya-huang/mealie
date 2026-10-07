import Container from "@mui/material/Container";
import { RecipeOrganizerPage } from "@/components/Domain/Recipe/RecipeOrganizerPage";
import { useTagStore } from "@/hooks/store";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

export default function RecipeTagsPage() {
  const { store, actions } = useTagStore();
  const { t } = useI18n();

  usePageTitle(t("tag.tags"));

  return (
    <Container>
      <RecipeOrganizerPage
        items={store}
        icon={icons.tags}
        itemType="tags"
        title={t("tag.tags")}
        onDelete={id => void actions.deleteOne(id)}
        onUpdate={item => void actions.updateOne(item)}
      />
    </Container>
  );
}
