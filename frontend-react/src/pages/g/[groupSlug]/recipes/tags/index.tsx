import { BaseContainer } from "~/components/global/BaseContainer";
import { RecipeOrganizerPage } from "~/components/Domain/Recipe/RecipeOrganizerPage";
import type { GenericItem } from "~/components/Domain/Recipe/RecipeOrganizerPage";
import { useTagStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { icons } from "~/lib/icons";
import type { RecipeTag } from "~/lib/api/types/recipe";

export default function TagsPage() {
  const i18n = useI18n();
  const { store, actions } = useTagStore();

  useSeoMeta({ title: i18n.t("tag.tags") });

  return (
    <BaseContainer>
      <RecipeOrganizerPage
        items={store as (RecipeTag & GenericItem)[]}
        icon={icons.tags}
        itemType="tags"
        title={i18n.t("tag.tags")}
        onDelete={id => void actions.deleteOne(id)}
        onUpdate={item => void actions.updateOne(item)}
      />
    </BaseContainer>
  );
}
