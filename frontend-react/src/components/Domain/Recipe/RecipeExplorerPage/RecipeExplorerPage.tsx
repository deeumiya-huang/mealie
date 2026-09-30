import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import { useParams } from "react-router";
import { icons } from "~/lib/icons";
import { useLazyRecipes } from "~/hooks/recipes";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { RecipeExplorerSearchProvider, useRecipeExplorerSearch } from "~/hooks/use-recipe-explorer-search";
import { RecipeCardSection } from "../RecipeCardSection";
import { RecipeExplorerPageSearch } from "./RecipeExplorerPageParts/RecipeExplorerPageSearch";

function ExplorerContent({ groupSlug }: { groupSlug: string }) {
  const i18n = useI18n();
  const { isOwnGroup } = useLoggedInState();
  const { recipes, appendRecipes, replaceRecipes } = useLazyRecipes(isOwnGroup ? null : groupSlug);
  const { passedQueryWithSeed, filterItems } = useRecipeExplorerSearch();
  const [ready, setReady] = useState(false);

  return (
    <Container maxWidth={false} sx={{ px: 0 }}>
      <RecipeExplorerPageSearch onReady={() => setReady(true)} />
      <Divider />
      <Container maxWidth="lg" sx={{ mt: 3, px: { md: 3 }, pb: 8 }}>
        {ready && (
          <Box sx={{ mt: -2.5 }}>
            <RecipeCardSection
              icon={icons.silverwareForkKnife}
              title={i18n.t("general.recipes")}
              recipes={recipes}
              query={passedQueryWithSeed}
              disableSort
              onItemSelected={(item, urlPrefix) => filterItems(item, urlPrefix)}
              onReplaceRecipes={replaceRecipes}
              onAppendRecipes={appendRecipes}
            />
          </Box>
        )}
      </Container>
    </Container>
  );
}

export function RecipeExplorerPage() {
  const auth = useMealieAuth();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  // keyed by group so switching groups starts from a fresh search state
  return (
    <RecipeExplorerSearchProvider key={groupSlug} groupSlug={groupSlug}>
      <ExplorerContent groupSlug={groupSlug} />
    </RecipeExplorerSearchProvider>
  );
}

export default RecipeExplorerPage;
