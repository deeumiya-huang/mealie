import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { TextInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { RecipeCreateErrorAlert, RecipeCreateHelpLinks, RecipeCreateSubmit } from "~/components/Domain/Recipe/RecipeCreate/RecipeCreateErrorAlert";
import { useUserApi } from "~/hooks/api";
import { useTagStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroupSelf } from "~/hooks/use-groups";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useNewRecipeOptions } from "~/hooks/use-new-recipe-options";
import { useStripQueryOnLeave } from "~/hooks/use-router";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";

/**
 * Prefer the 'url' share field (recipe_import_url, populated by Chrome when sharing a page URL).
 * Fall back to the 'text' share field (recipe_import_text) for apps that share URLs as plain text,
 * but only when the text value is actually a valid http/https URL — shared text can be arbitrary.
 */
function importUrlFromQuery(query: URLSearchParams): string | null {
  const urlFromField = query.get("recipe_import_url");
  if (urlFromField) {
    return urlFromField;
  }
  const textFromField = query.get("recipe_import_text");
  if (textFromField) {
    try {
      const parsed = new URL(textFromField);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return textFromField;
      }
    }
    catch { /* not a URL, ignore */ }
  }
  return null;
}

export default function RecipeCreateUrlPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { group } = useGroupSelf();
  const tags = useTagStore();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  const {
    importKeywordsAsTags: [importKeywordsAsTags, setImportKeywordsAsTags],
    importCategories: [importCategories, setImportCategories],
    stayInEditMode: [stayInEditMode, setStayInEditMode],
    parseRecipe: [parseRecipe, setParseRecipe],
    navigateToRecipe,
  } = useNewRecipeOptions();

  const bulkImporterTarget = `/g/${groupSlug}/r/create/bulk`;
  const htmlOrJsonImporterTarget = `/g/${groupSlug}/r/create/html`;
  const aiImporterTarget = `/g/${groupSlug}/r/create/ai`;
  const aiEnabled = !!group?.aiProviderSettings?.aiEnabled;

  const recipeUrl = importUrlFromQuery(searchParams);
  function setRecipeUrl(value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("recipe_import_url", value.trim());
      return next;
    }, { replace: true });
  }

  useEffect(() => {
    if (recipeUrl) {
      // Apply legacy query params for older automations such as the Bookmarklet.
      // These are no longer used by the app itself but are easy to keep supporting.
      const importKeywordsAsTagsParam = searchParams.get("use_keywords");
      if (importKeywordsAsTagsParam === "1") {
        setImportKeywordsAsTags(true);
      }
      else if (importKeywordsAsTagsParam === "0") {
        setImportKeywordsAsTags(false);
      }

      const stayInEditModeParam = searchParams.get("edit");
      if (stayInEditModeParam === "1") {
        setStayInEditMode(true);
      }
      else if (stayInEditModeParam === "0") {
        setStayInEditMode(false);
      }

      // The URL is pre-filled from the query. Do not auto-submit: the user should review the
      // import options and confirm by clicking the submit button.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  // Remove import URL from query params when leaving the page
  useStripQueryOnLeave();

  const domUrlForm = useRef<FormHandle>(null);

  async function createByUrl(url: string | null) {
    if (url === null) {
      return;
    }
    if (!domUrlForm.current?.validate() || url === "") {
      console.log("Invalid URL", url);
      return;
    }
    setLoading(true);
    const { response } = await api.recipes.createOneByUrl(
      url,
      importKeywordsAsTags,
      importCategories,
      (message: string) => setCreateStatus(message),
    );
    setCreateStatus(null);
    if (response?.status !== 201) {
      setError(true);
      setLoading(false);
      return;
    }
    if (importKeywordsAsTags) {
      void tags.actions.refresh();
    }
    navigateToRecipe(response.data, groupSlug, `/g/${groupSlug}/r/create/url`);
  }

  const option = (label: string, checked: boolean, set: (v: boolean) => void) => (
    <FormControlLabel sx={{ display: "flex" }} control={<Checkbox checked={checked} onChange={e => set(e.target.checked)} />} label={label} />
  );

  return (
    <div>
      <VForm
        ref={domUrlForm}
        onSubmit={(e) => {
          e.preventDefault();
          void createByUrl(recipeUrl);
        }}
      >
        <Typography variant="h5" sx={{ px: 2, pt: 2 }}>{i18n.t("recipe.scrape-recipe")}</Typography>
        <Box sx={{ p: 2 }}>
          <p>{i18n.t("recipe.scrape-recipe-description")}</p>
          {group?.aiProviderSettings?.audioProviderEnabled && <p>{i18n.t("recipe.scrape-recipe-description-transcription")}</p>}
          <Box sx={{ py: 2 }}>
            <p>
              {i18n.t("recipe.scrape-recipe-have-a-lot-of-recipes")}
              {" "}
              <Link component={RouterLink} to={bulkImporterTarget}>{i18n.t("recipe.scrape-recipe-suggest-bulk-importer")}</Link>
              .
            </p>
            <p>
              {i18n.t("recipe.scrape-recipe-have-raw-html-or-json-data")}
              {" "}
              <Link component={RouterLink} to={htmlOrJsonImporterTarget}>{i18n.t("recipe.scrape-recipe-you-can-import-from-raw-data-directly")}</Link>
              .
            </p>
            {aiEnabled && (
              <p>
                {i18n.t("recipe.scrape-recipe-have-ai-read-the-page")}
                {" "}
                <Link component={RouterLink} to={aiImporterTarget}>{i18n.t("recipe.import-with-ai")}</Link>
                .
              </p>
            )}
          </Box>
          <TextInput
            value={recipeUrl}
            onChange={setRecipeUrl}
            label={i18n.t("new-recipe.recipe-url")}
            prependInnerIcon={icons.link}
            autoFocus
            variant="solo-filled"
            clearable
            sx={{ mt: 1 }}
            rules={[validators.url]}
            hint={i18n.t("new-recipe.url-form-hint")}
            persistentHint
          />
        </Box>
        {option(i18n.t("recipe.import-original-keywords-as-tags"), importKeywordsAsTags, setImportKeywordsAsTags)}
        {option(i18n.t("recipe.import-original-categories"), importCategories, setImportCategories)}
        {option(i18n.t("recipe.stay-in-edit-mode"), stayInEditMode, setStayInEditMode)}
        {option(i18n.t("recipe.parse-recipe-ingredients-after-import"), parseRecipe, setParseRecipe)}
        <RecipeCreateSubmit disabled={recipeUrl === null} loading={loading} status={createStatus} />
      </VForm>
      <RecipeCreateErrorAlert show={error}>
        <p>
          {i18n.t("recipe.scrape-recipe-website-being-blocked")}
          {" "}
          <RouterLink to={htmlOrJsonImporterTarget}>{i18n.t("recipe.scrape-recipe-try-importing-raw-html-instead")}</RouterLink>
        </p>
        {aiEnabled && (
          <p>
            {i18n.t("recipe.scrape-recipe-have-ai-read-the-page")}
            {" "}
            <RouterLink to={aiImporterTarget}>{i18n.t("recipe.import-with-ai")}</RouterLink>
            .
          </p>
        )}
        <br />
        <p>{i18n.t("new-recipe.error-details")}</p>
        <RecipeCreateHelpLinks />
      </RecipeCreateErrorAlert>
    </div>
  );
}
