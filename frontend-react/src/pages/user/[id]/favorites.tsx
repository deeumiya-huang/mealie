import { useParams } from "react-router";
import { BaseContainer } from "~/components/global/BaseContainer";
import { RecipeCardSection } from "~/components/Domain/Recipe/RecipeCardSection";
import { useLazyRecipes } from "~/hooks/recipes";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { icons } from "~/lib/icons";

export default function UserFavoritesPage() {
  const params = useParams();
  const i18n = useI18n();
  const { isOwnGroup } = useLoggedInState();

  useSeoMeta({ title: i18n.t("general.favorites") });

  const userId = params.id;
  const query = { queryFilter: `favoritedBy.id = "${userId}"` };
  const { recipes, appendRecipes, replaceRecipes } = useLazyRecipes();

  return (
    <BaseContainer>
      {recipes && isOwnGroup && (
        <RecipeCardSection
          icon={icons.heart}
          title={i18n.t("user.user-favorites")}
          recipes={recipes}
          query={query}
          onReplaceRecipes={replaceRecipes}
          onAppendRecipes={appendRecipes}
        />
      )}
    </BaseContainer>
  );
}
