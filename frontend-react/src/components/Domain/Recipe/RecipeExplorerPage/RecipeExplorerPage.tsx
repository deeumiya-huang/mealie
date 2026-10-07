// Usage: <RecipeExplorerPage /> — body of /g/:groupSlug: the search box (RecipeExplorerPageSearch) above the recipe
// cards that match its query. Logged-out visitors, and visitors of another group, load the recipes through the
// public explore API.
import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import { useParams } from "react-router";
import { RecipeCardSection } from "@/components/Domain/Recipe/RecipeCardSection";
import { useLazyRecipes } from "@/hooks/recipes";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useRecipeExplorerSearch } from "@/hooks/use-recipe-explorer-search";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { RecipeExplorerPageSearch } from "./RecipeExplorerPageParts/RecipeExplorerPageSearch";

/**
 * The page picks the user's or the public stores by `isOwnGroup` (`useRecipeExplorerStores`): remount it when that
 * changes (log in / log out while it is shown) so no component switches store hooks in place.
 */
export function RecipeExplorerPage() {
  const { isOwnGroup } = useLoggedInState();
  return <RecipeExplorerPageContent key={String(isOwnGroup)} />;
}

function RecipeExplorerPageContent() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const params = useParams();

  const { isOwnGroup } = useLoggedInState();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const { recipes, appendRecipes, replaceRecipes } = useLazyRecipes(isOwnGroup ? null : groupSlug);

  const [ready, setReady] = useState(false);

  // the search box owns the shared search state; the page reads the query it has settled on
  // (Vue also handed card chip selections to `filterItems`, but RecipeCardSection never emitted `item-selected`)
  const { passedQueryWithSeed } = useRecipeExplorerSearch(groupSlug);
  const searchQuery = ready ? passedQueryWithSeed : {};

  return (
    <Container maxWidth={false} disableGutters>
      <RecipeExplorerPageSearch key={groupSlug} onReady={() => setReady(true)} />
      <Divider />
      <Container sx={{ mt: 3, px: { md: 3 }, pb: 8 }}>
        {ready && (
          <Box sx={{ mt: -1.25 }}>
            <RecipeCardSection
              icon={icons.silverwareForkKnife}
              title={t("general.recipes")}
              recipes={recipes}
              query={searchQuery}
              disableSort
              onReplaceRecipes={replaceRecipes}
              onAppendRecipes={appendRecipes}
            />
          </Box>
        )}
      </Container>
    </Container>
  );
}
