import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { RecipeCardSection } from "~/components/Domain/Recipe/RecipeCardSection";
import { useLazyRecipes } from "~/hooks/recipes";
import { useCookbookStore } from "~/hooks/store";
import { useCookbook } from "~/hooks/use-group-cookbooks";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { icons } from "~/lib/icons";
import type { ReadCookBook } from "~/lib/api/types/cookbook";
import { CookbookEditor } from "./CookbookEditor";

export function CookbookPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const navigate = useNavigate();
  const params = useParams();
  const { isOwnGroup } = useLoggedInState();

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const slug = params.slug || "";

  const { recipes, appendRecipes, replaceRecipes } = useLazyRecipes(isOwnGroup ? null : groupSlug);
  const { book } = useCookbook(slug, isOwnGroup ? null : groupSlug);
  const { actions } = useCookbookStore();

  const isOwnHousehold = !!(auth.user && book?.householdId) && auth.user.householdId === book.householdId;
  const canEdit = isOwnGroup && isOwnHousehold;

  const [editDialog, setEditDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<ReadCookBook | null>(null);

  function handleEditCookbook() {
    setEditDialog(true);
    setEditTarget(book);
  }

  async function editCookbook() {
    if (!editTarget) {
      return;
    }
    const response = await actions.updateOne(editTarget);

    if (response?.slug && book?.slug !== response.slug) {
      // if name changed, redirect to new slug
      void navigate(`/g/${params.groupSlug}/cookbooks/${response.slug}`);
    }
    else {
      // otherwise reload the page, since the recipe criteria changed
      void navigate(0);
    }
    setEditDialog(false);
    setEditTarget(null);
  }

  useSeoMeta({ title: book?.name || "Cookbook" });

  return (
    <div>
      {editTarget && (
        <BaseDialog
          open={editDialog}
          onOpenChange={setEditDialog}
          width="100%"
          maxWidth="1100px"
          icon={icons.pages}
          title={i18n.t("general.edit")}
          submitIcon={icons.save}
          submitText={i18n.t("general.save")}
          submitDisabled={!editTarget.queryFilterString}
          canSubmit
          onSubmit={() => void editCookbook()}
        >
          <Box sx={{ px: 2 }}>
            <CookbookEditor value={editTarget} onChange={update => setEditTarget(prev => (prev ? update(prev) : prev))} />
          </Box>
        </BaseDialog>
      )}

      {book && (
        <BaseContainer sx={{ my: 0 }}>
          <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", width: "100%", mb: 1 }}>
              <Typography variant="h5" component="div" sx={{ display: "flex", alignItems: "center" }}>
                <Icon path={icons.pages} size="large" sx={{ mr: 1.5 }} />
                {book.name}
              </Typography>
              {canEdit && <Box sx={{ mx: 0.5 }}><BaseButton edit onClick={handleEditCookbook} /></Box>}
            </Box>
            {book.description && (
              <Typography variant="subtitle1" sx={{ color: "text.secondary", mb: 1 }}>{book.description}</Typography>
            )}
          </Box>

          <Box sx={{ mb: 2.5, mx: 0.5 }}>
            <RecipeCardSection
              recipes={recipes}
              query={{ cookbook: slug }}
              onReplaceRecipes={replaceRecipes}
              onAppendRecipes={appendRecipes}
            />
          </Box>
        </BaseContainer>
      )}
    </div>
  );
}

export default CookbookPage;
