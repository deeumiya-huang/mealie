// Usage: <CookbookPage /> — body of /g/:groupSlug/cookbooks/:slug: the cookbook's name and description with an edit
// button (own household only) and the recipes that match the cookbook. Logged-out visitors, and visitors of another
// group, read the cookbook and its recipes through the public explore API.
import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { useNavigate, useParams } from "react-router";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { RecipeCardSection } from "@/components/Domain/Recipe/RecipeCardSection";
import { useLazyRecipes } from "@/hooks/recipes";
import { useCookbookStore } from "@/hooks/store/use-cookbook-store";
import { useCookbookData } from "@/hooks/use-group-cookbooks";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { ReadCookBook } from "@/lib/api/types/cookbook";
import { icons } from "@/lib/icons";
import { CookbookEditor } from "./CookbookEditor";

interface CookbookEditDialogProps {
  book: ReadCookBook;
  groupSlug: string | undefined;
  onClose: () => void;
}

// Own component so the (authenticated) cookbook store is only used while editing.
function CookbookEditDialog({ book, groupSlug, onClose }: CookbookEditDialogProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { actions } = useCookbookStore();
  const [editTarget, setEditTarget] = useState<ReadCookBook>(book);

  async function editCookbook() {
    const response = await actions.updateOne(editTarget);

    if (response?.slug && book.slug !== response.slug) {
      // if name changed, redirect to new slug
      void navigate(`/g/${groupSlug}/cookbooks/${response.slug}`);
    }
    else {
      // otherwise reload the page, since the recipe criteria changed
      window.location.reload();
    }
    onClose();
  }

  return (
    <BaseDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      width="100%"
      maxWidth="1100px"
      icon={icons.pages}
      title={t("general.edit")}
      submitIcon={icons.save}
      submitText={t("general.save")}
      submitDisabled={!editTarget.queryFilterString}
      canSubmit
      onSubmit={() => void editCookbook()}
    >
      <CardContent>
        <CookbookEditor value={editTarget} onChange={setEditTarget} />
      </CardContent>
    </BaseDialog>
  );
}

export function CookbookPage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const { isOwnGroup } = useLoggedInState();

  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const slug = params.slug as string;

  const publicGroupSlug = isOwnGroup ? null : groupSlug;
  const { recipes, appendRecipes, replaceRecipes } = useLazyRecipes(publicGroupSlug);
  const { data: book } = useCookbookData(publicGroupSlug, slug);

  const isOwnHousehold = !!(auth.user && book?.householdId) && auth.user.householdId === book.householdId;
  const canEdit = isOwnGroup && isOwnHousehold;

  const [editing, setEditing] = useState(false);

  const query = useMemo(() => ({ cookbook: slug }), [slug]);

  // Vue read the (still empty) cookbook once during setup, so its title was always the fallback
  usePageTitle(t("cookbook.cookbook"));

  return (
    <div>
      {/* Edit Dialog */}
      {editing && book && (
        <CookbookEditDialog book={book} groupSlug={params.groupSlug} onClose={() => setEditing(false)} />
      )}

      {book && (
        <Container sx={{ my: 0 }}>
          <Box sx={{ display: "flex", flexDirection: "column", width: "100%", p: 0, m: 0, backgroundColor: "transparent", boxShadow: "none" }}>
            <Box sx={{ display: "flex", alignItems: "center", width: "100%", mb: 1 }}>
              <Typography variant="h5" component="div" sx={{ display: "flex", alignItems: "center", mb: 0 }}>
                <MdiIcon path={icons.pages} size="large" sx={{ mr: 1.5 }} />
                {book.name}
              </Typography>
              {canEdit && (
                <Box sx={{ mx: 0.5 }}>
                  <BaseButton edit onClick={() => setEditing(true)} />
                </Box>
              )}
            </Box>
            {book.description && (
              <Typography variant="subtitle1" sx={{ color: "grey.400", mb: 1 }}>
                {book.description}
              </Typography>
            )}
          </Box>

          <Container sx={{ p: 0 }}>
            <RecipeCardSection
              recipes={recipes}
              query={query}
              onReplaceRecipes={replaceRecipes}
              onAppendRecipes={appendRecipes}
            />
          </Container>
        </Container>
      )}
    </div>
  );
}
