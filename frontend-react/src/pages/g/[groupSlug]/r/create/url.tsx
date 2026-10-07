import { useEffect, useRef, useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import { Link as RouterLink, useBlocker, useNavigate, useParams, useSearchParams } from "react-router";
import {
  RecipeCreateErrorAlert,
  RecipeCreateErrorLinks,
  RecipeCreateOption,
  RecipeCreateSubmit,
  RecipeCreateText,
  RecipeCreateTextField,
  RecipeCreateTitle,
} from "@/components/Domain/Recipe/RecipeCreate/RecipeCreateParts";
import { useUserApi } from "@/hooks/api";
import { useTagStore } from "@/hooks/store/use-tag-store";
import { useGroupSelf } from "@/hooks/use-groups";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useNewRecipeOptions } from "@/hooks/use-new-recipe-options";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

/**
 * The import URL the page starts with. Prefer the 'url' share field (recipe_import_url, populated by Chrome when
 * sharing a page URL). Fall back to the 'text' share field (recipe_import_text) for apps that share URLs as plain
 * text, but only when the text value is actually a valid http/https URL — shared text can be arbitrary.
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

// Port of pages/g/[groupSlug]/r/create/url.vue: import a recipe by scraping a URL. (The Vue `definePageMeta({ key })`
// remounted the page per path; here each importer is its own route element, so it remounts anyway.)
export default function RecipeCreateUrlPage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { group } = useGroupSelf();
  const tags = useTagStore();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const {
    importKeywordsAsTags,
    setImportKeywordsAsTags,
    importCategories,
    setImportCategories,
    stayInEditMode,
    setStayInEditMode,
    parseRecipe,
    setParseRecipe,
    navigateToRecipe,
  } = useNewRecipeOptions();

  const bulkImporterTarget = `/g/${groupSlug}/r/create/bulk`;
  const htmlOrJsonImporterTarget = `/g/${groupSlug}/r/create/html`;
  const aiImporterTarget = `/g/${groupSlug}/r/create/ai`;
  const aiEnabled = !!group?.aiProviderSettings?.aiEnabled;

  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  // The field starts with the URL of the query and writes every edit (trimmed) back to it, like the Vue computed.
  const [recipeUrlText, setRecipeUrlText] = useState(() => importUrlFromQuery(searchParams) ?? "");
  const recipeUrl = recipeUrlText === "" ? null : recipeUrlText;

  function updateRecipeUrl(value: string) {
    const trimmed = value.trim();
    setRecipeUrlText(trimmed);
    const next = new URLSearchParams(searchParams);
    next.set("recipe_import_url", trimmed);
    setSearchParams(next, { replace: true });
  }

  const form = useFormValidation({
    url: field(recipeUrl ?? "", [validators.url]),
  });

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

      // The URL is pre-filled from the query.
      // Do not auto-submit: the user should review the import options and
      // confirm by clicking the submit button.
    }
    // only on mount, like Vue's onMounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remove import URL from query params when leaving the page
  const isLeaving = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !isLeaving.current && currentLocation.pathname !== nextLocation.pathname && currentLocation.search !== "");
  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }
    isLeaving.current = true;
    const target = blocker.location;
    blocker.reset();
    void (async () => {
      await navigate({ search: "" }, { replace: true });
      await navigate(target);
    })();
  }, [blocker, navigate]);

  async function createByUrl(url: string | null) {
    if (url === null) {
      return;
    }

    // The Vue page did not await `validate()`, so it only reveals the field's message here and never blocks.
    form.validate();
    if (url === "") {
      console.log("Invalid URL", url);
      return;
    }
    setLoading(true);
    const { response } = await api.recipes.createOneByUrl(url, importKeywordsAsTags, importCategories, setCreateStatus);
    setCreateStatus(null);

    if (response?.status !== 201) {
      setError(true);
      setLoading(false);
      return;
    }
    if (importKeywordsAsTags) {
      void tags.actions.refresh();
    }

    await navigateToRecipe(response.data, groupSlug, `/g/${groupSlug}/r/create/url`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void createByUrl(recipeUrl);
  }

  return (
    <Box>
      <form onSubmit={onSubmit}>
        <Box>
          <RecipeCreateTitle>{t("recipe.scrape-recipe")}</RecipeCreateTitle>
          <RecipeCreateText>
            <RecipeCreateText sx={{ p: 0 }}>
              <p>{t("recipe.scrape-recipe-description")}</p>
              {group?.aiProviderSettings?.audioProviderEnabled && (
                <p>{t("recipe.scrape-recipe-description-transcription")}</p>
              )}
            </RecipeCreateText>
            <RecipeCreateText sx={{ px: 0 }}>
              <p>
                {`${t("recipe.scrape-recipe-have-a-lot-of-recipes")} `}
                <Link component={RouterLink} to={bulkImporterTarget} color="primary">{t("recipe.scrape-recipe-suggest-bulk-importer")}</Link>
                .
              </p>
              <p>
                {`${t("recipe.scrape-recipe-have-raw-html-or-json-data")} `}
                <Link component={RouterLink} to={htmlOrJsonImporterTarget} color="primary">{t("recipe.scrape-recipe-you-can-import-from-raw-data-directly")}</Link>
                .
              </p>
              {aiEnabled && (
                <p>
                  {`${t("recipe.scrape-recipe-have-ai-read-the-page")} `}
                  <Link component={RouterLink} to={aiImporterTarget} color="primary">{t("recipe.import-with-ai")}</Link>
                  .
                </p>
              )}
            </RecipeCreateText>
            <RecipeCreateTextField
              label={t("new-recipe.recipe-url")}
              icon={icons.link}
              autoFocus
              value={recipeUrlText}
              onChange={updateRecipeUrl}
              onBlur={() => form.touch("url")}
              error={form.errorFor("url")}
              hint={t("new-recipe.url-form-hint")}
              sx={{ mt: 1 }}
            />
          </RecipeCreateText>
          <RecipeCreateOption
            label={t("recipe.import-original-keywords-as-tags")}
            checked={importKeywordsAsTags}
            onChange={setImportKeywordsAsTags}
          />
          <RecipeCreateOption
            label={t("recipe.import-original-categories")}
            checked={importCategories}
            onChange={setImportCategories}
          />
          <RecipeCreateOption
            label={t("recipe.stay-in-edit-mode")}
            checked={stayInEditMode}
            onChange={setStayInEditMode}
          />
          <RecipeCreateOption
            label={t("recipe.parse-recipe-ingredients-after-import")}
            checked={parseRecipe}
            onChange={setParseRecipe}
          />
          <RecipeCreateSubmit disabled={recipeUrl === null} loading={loading} status={createStatus} />
        </Box>
      </form>
      <RecipeCreateErrorAlert open={error}>
        <Box>
          <p>
            {`${t("recipe.scrape-recipe-website-being-blocked")} `}
            <RouterLink to={htmlOrJsonImporterTarget}>{t("recipe.scrape-recipe-try-importing-raw-html-instead")}</RouterLink>
          </p>
          {aiEnabled && (
            <p>
              {`${t("recipe.scrape-recipe-have-ai-read-the-page")} `}
              <RouterLink to={aiImporterTarget}>{t("recipe.import-with-ai")}</RouterLink>
              .
            </p>
          )}
          <br />
          <p>{t("new-recipe.error-details")}</p>
        </Box>
        <RecipeCreateErrorLinks />
      </RecipeCreateErrorAlert>
    </Box>
  );
}
