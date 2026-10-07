import { useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import Switch from "@mui/material/Switch";
import { Link as RouterLink, useParams } from "react-router";
import { Mode } from "vanilla-jsoneditor";
import { RecipeJsonEditor } from "@/components/global/RecipeJsonEditor";
import {
  RecipeCreateErrorAlert,
  RecipeCreateErrorLinks,
  RecipeCreateOption,
  RecipeCreateSubmit,
  RecipeCreateText,
  RecipeCreateTextField,
  RecipeCreateTitle,
} from "@/components/Domain/Recipe/RecipeCreate/RecipeCreateParts";
import {
  convertImportContent,
  importContentAsString,
  type RecipeImportContent,
} from "@/components/Domain/Recipe/RecipeCreate/recipe-create-content";
import { useUserApi } from "@/hooks/api";
import { useTagStore } from "@/hooks/store/use-tag-store";
import { useGroupSelf } from "@/hooks/use-groups";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useNewRecipeOptions } from "@/hooks/use-new-recipe-options";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

// Port of pages/g/[groupSlug]/r/create/html.vue: import a recipe from raw HTML or JSON (schema.org/Recipe) data.
// The JSON editor's `mode="code"` is vanilla-jsoneditor's legacy alias of text mode.
export default function RecipeCreateHtmlPage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const params = useParams();
  const api = useUserApi();
  const tags = useTagStore();
  const { group } = useGroupSelf();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const aiImporterTarget = `/g/${groupSlug}/r/create/ai`;
  const aiEnabled = !!group?.aiProviderSettings?.aiEnabled;

  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditJSON, setIsEditJSON] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  const [newRecipeData, setNewRecipeData] = useState<RecipeImportContent>(null);
  const [newRecipeUrl, setNewRecipeUrl] = useState<string | null>(null);

  const form = useFormValidation({
    url: field(newRecipeUrl ?? "", [validators.urlOptional]),
  });

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

  function handleIsEditJson(editJson: boolean) {
    setIsEditJSON(editJson);
    setNewRecipeData(convertImportContent(newRecipeData, editJson));
  }

  async function createFromHtmlOrJson(htmlOrJsonData: RecipeImportContent, url: string | null = null) {
    if (!htmlOrJsonData) {
      return;
    }

    if (!form.validate()) {
      return;
    }

    const dataString = importContentAsString(htmlOrJsonData) ?? "";

    setError(false);
    setLoading(true);
    const { response } = await api.recipes.createOneByHtmlOrJson(dataString, importKeywordsAsTags, importCategories, url, setCreateStatus);
    setCreateStatus(null);

    if (response?.status !== 201) {
      setError(true);
      setLoading(false);
      return;
    }
    if (importKeywordsAsTags) {
      void tags.actions.refresh();
    }

    await navigateToRecipe(response.data, groupSlug, `/g/${groupSlug}/r/create/html`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void createFromHtmlOrJson(newRecipeData, newRecipeUrl);
  }

  return (
    <form onSubmit={onSubmit}>
      <Box>
        <RecipeCreateTitle>{t("recipe.import-from-html-or-json")}</RecipeCreateTitle>
        <RecipeCreateText>
          <p>{t("recipe.import-from-html-or-json-description")}</p>
          <p>
            {`${t("recipe.json-import-format-description-colon")} `}
            <Link href="https://schema.org/Recipe" target="_blank" rel="noreferrer" color="primary">https://schema.org/Recipe</Link>
          </p>
          {aiEnabled && (
            <p>
              {`${t("recipe.import-from-html-or-json-have-ai-read-it")} `}
              <Link component={RouterLink} to={aiImporterTarget} color="primary">{t("recipe.import-with-ai")}</Link>
              .
            </p>
          )}
          <FormControlLabel
            label={t("recipe.json-editor")}
            sx={{ display: "flex", mx: 0, mt: 1 }}
            control={<Switch color="primary" checked={isEditJSON} onChange={event => handleIsEditJson(event.target.checked)} />}
          />
          <RecipeCreateTextField
            label={t("new-recipe.recipe-url")}
            icon={icons.link}
            value={newRecipeUrl ?? ""}
            onChange={setNewRecipeUrl}
            onClear={() => setNewRecipeUrl(null)}
            onBlur={() => form.touch("url")}
            error={form.errorFor("url")}
            hint={t("new-recipe.copy-and-paste-the-source-url-of-your-data-optional")}
            sx={{ mt: 5, mb: 2, maxWidth: 500 }}
          />
          {isEditJSON
            ? (
                <RecipeJsonEditor
                  value={typeof newRecipeData === "object" && newRecipeData ? newRecipeData : {}}
                  onChange={setNewRecipeData}
                  height="250px"
                  mode={Mode.text}
                  mainMenuBar={false}
                />
              )
            : (
                <RecipeCreateTextField
                  label={t("new-recipe.recipe-html-or-json")}
                  icon={icons.codeTags}
                  multiline
                  autoFocus
                  value={typeof newRecipeData === "string" ? newRecipeData : ""}
                  onChange={value => setNewRecipeData(value)}
                  onClear={() => setNewRecipeData(null)}
                />
              )}
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
        </RecipeCreateText>
        <RecipeCreateSubmit disabled={!newRecipeData} loading={loading} status={createStatus} />
        <RecipeCreateErrorAlert open={error}>
          <Box>
            <p>{t("new-recipe.html-or-json-error-details")}</p>
          </Box>
          <RecipeCreateErrorLinks />
        </RecipeCreateErrorAlert>
      </Box>
    </form>
  );
}
