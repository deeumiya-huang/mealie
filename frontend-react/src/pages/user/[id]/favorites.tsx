import { useMemo } from "react";
import Container from "@mui/material/Container";
import { useParams } from "react-router";
import { RecipeCardSection } from "@/components/Domain/Recipe/RecipeCardSection";
import { useLazyRecipes } from "@/hooks/recipes";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

export default function UserFavoritesPage() {
  const params = useParams();
  const { t } = useI18n();
  const { isOwnGroup } = useLoggedInState();

  usePageTitle(t("general.favorites"));

  const userId = params.id;
  const query = useMemo(() => ({ queryFilter: `favoritedBy.id = "${userId}"` }), [userId]);
  const { recipes, appendRecipes, replaceRecipes } = useLazyRecipes();

  return (
    <Container>
      {isOwnGroup && (
        <RecipeCardSection
          icon={icons.heart}
          title={t("user.user-favorites")}
          recipes={recipes}
          query={query}
          onReplaceRecipes={replaceRecipes}
          onAppendRecipes={appendRecipes}
        />
      )}
    </Container>
  );
}
