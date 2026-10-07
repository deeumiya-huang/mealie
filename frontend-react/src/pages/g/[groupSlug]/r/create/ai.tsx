import { useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import { Link as RouterLink, useParams } from "react-router";
import { Mode } from "vanilla-jsoneditor";
import { MdiIcon } from "@/components/global/MdiIcon";
import { RecipeJsonEditor } from "@/components/global/RecipeJsonEditor";
import {
  RecipeCreateErrorAlert,
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
import { RecipeImportImages } from "@/components/Domain/Recipe/RecipeImportImages";
import { useUserApi } from "@/hooks/api";
import { useTagStore } from "@/hooks/store/use-tag-store";
import { useGroupSelf } from "@/hooks/use-groups";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useNewRecipeOptions } from "@/hooks/use-new-recipe-options";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

// Port of pages/g/[groupSlug]/r/create/ai.vue: import a recipe with the group's AI provider from a URL, pasted
// content and/or images. (The Vue `definePageMeta({ key })` remounted the page per path; each importer is its own
// route element here, so it remounts anyway.)
export default function RecipeCreateAiPage() {
  const i18n = useI18n();
  const { t } = i18n;
  const api = useUserApi();
  const auth = useMealieAuth();
  const params = useParams();
  const tags = useTagStore();
  const { group } = useGroupSelf();

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const urlImporterTarget = `/g/${groupSlug}/r/create/url`;
  const htmlOrJsonImporterTarget = `/g/${groupSlug}/r/create/html`;
  const aiEnabled = !!group?.aiProviderSettings?.aiEnabled;
  const imagesEnabled = !!group?.aiProviderSettings?.imageProviderEnabled;
  const videosEnabled = !!group?.aiProviderSettings?.audioProviderEnabled;

  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditJSON, setIsEditJSON] = useState(false);

  const [recipeUrl, setRecipeUrl] = useState<string | null>(null);
  const [newRecipeData, setNewRecipeData] = useState<RecipeImportContent>(null);
  const [uploadedImages, setUploadedImages] = useState<(Blob | File)[]>([]);
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  const form = useFormValidation({
    url: field(recipeUrl ?? "", [validators.urlOptional]),
  });

  const {
    stayInEditMode,
    setStayInEditMode,
    parseRecipe,
    setParseRecipe,
    translateRecipe,
    setTranslateRecipe,
    createNewOrganizers,
    setCreateNewOrganizers,
    navigateToRecipe,
  } = useNewRecipeOptions({
    enableImportKeywords: false,
    enableImportCategories: false,
    enableTranslateRecipe: true,
    enableCreateNewOrganizers: true,
  });

  const contentAsString = importContentAsString(newRecipeData);
  const hasSource = !!(recipeUrl || contentAsString || uploadedImages.length);

  function handleIsEditJson(editJson: boolean) {
    setIsEditJSON(editJson);
    setNewRecipeData(convertImportContent(newRecipeData, editJson));
  }

  async function createRecipe() {
    if (!hasSource) {
      return;
    }

    if (!form.validate()) {
      return;
    }

    setError(false);
    setErrorMessage("");
    setLoading(true);

    const { data, error: requestError } = await api.recipes.createOneWithAI(
      {
        content: contentAsString,
        url: recipeUrl,
        images: uploadedImages,
        translateLanguage: translateRecipe ? i18n.locale : null,
        createNewOrganizers,
      },
      setCreateStatus,
    );

    setCreateStatus(null);

    if (requestError || !data) {
      setError(true);
      setErrorMessage((requestError as Error | null)?.message || "");
      setLoading(false);
      return;
    }

    if (createNewOrganizers) {
      void tags.actions.refresh();
    }

    await navigateToRecipe(data, groupSlug, `/g/${groupSlug}/r/create/ai`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void createRecipe();
  }

  return (
    <form onSubmit={onSubmit}>
      <Box>
        <RecipeCreateTitle>{t("recipe.import-with-ai")}</RecipeCreateTitle>
        {!aiEnabled
          ? (
              <RecipeCreateText>
                <Alert severity="info" variant="standard">
                  {t("recipe.import-with-ai-provider-required")}
                </Alert>
              </RecipeCreateText>
            )
          : (
              <RecipeCreateText>
                <p>{t("recipe.import-with-ai-description")}</p>
                {videosEnabled && <p>{t("recipe.import-with-ai-video-description")}</p>}
                <br />
                <p>
                  {`${t("recipe.import-with-ai-without-ai-question")} `}
                  <Link component={RouterLink} to={urlImporterTarget} color="primary">{t("recipe.import-with-ai-use-url-import")}</Link>
                  .
                </p>
                <p>
                  {`${t("recipe.scrape-recipe-have-raw-html-or-json-data")} `}
                  <Link component={RouterLink} to={htmlOrJsonImporterTarget} color="primary">{t("recipe.scrape-recipe-you-can-import-from-raw-data-directly")}</Link>
                  .
                </p>

                <RecipeCreateTextField
                  label={t("new-recipe.recipe-url")}
                  icon={icons.link}
                  value={recipeUrl ?? ""}
                  onChange={setRecipeUrl}
                  onClear={() => setRecipeUrl(null)}
                  onBlur={() => form.touch("url")}
                  error={form.errorFor("url")}
                  hint={t("recipe.import-with-ai-url-hint")}
                  disabled={loading}
                  sx={{ mt: 4, mb: 2 }}
                />

                <FormControlLabel
                  label={t("recipe.json-editor")}
                  disabled={loading}
                  sx={{ display: "flex", mx: 0, mt: 1 }}
                  control={<Switch color="primary" checked={isEditJSON} onChange={event => handleIsEditJson(event.target.checked)} />}
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
                        label={t("recipe.import-with-ai-content")}
                        icon={icons.textBox}
                        multiline
                        value={typeof newRecipeData === "string" ? newRecipeData : ""}
                        onChange={value => setNewRecipeData(value)}
                        onClear={() => setNewRecipeData(null)}
                        hint={t("recipe.import-with-ai-content-hint")}
                        disabled={loading}
                      />
                    )}

                {imagesEnabled
                  ? (
                      <Box sx={{ mt: 3 }}>
                        <RecipeImportImages value={uploadedImages} onChange={setUploadedImages} disabled={loading} />
                      </Box>
                    )
                  : (
                      <Alert severity="info" variant="standard" sx={{ mt: 3 }}>
                        {t("recipe.import-with-ai-image-provider-required")}
                      </Alert>
                    )}

                <RecipeCreateOption
                  label={t("recipe.should-translate-description")}
                  checked={translateRecipe}
                  onChange={setTranslateRecipe}
                  disabled={loading}
                />
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <RecipeCreateOption
                    label={t("recipe.create-new-organizers")}
                    checked={createNewOrganizers}
                    onChange={setCreateNewOrganizers}
                    disabled={loading}
                  />
                  <Tooltip title={t("recipe.create-new-organizers-hint")} placement="bottom" slotProps={{ tooltip: { sx: { maxWidth: 300 } } }}>
                    <Box component="span" sx={{ display: "inline-flex", ms: 1 }}>
                      <MdiIcon path={icons.help} size="small" />
                    </Box>
                  </Tooltip>
                </Box>
                <RecipeCreateOption
                  label={t("recipe.stay-in-edit-mode")}
                  checked={stayInEditMode}
                  onChange={setStayInEditMode}
                  disabled={loading}
                />
                <RecipeCreateOption
                  label={t("recipe.parse-recipe-ingredients-after-import")}
                  checked={parseRecipe}
                  onChange={setParseRecipe}
                  disabled={loading}
                />
              </RecipeCreateText>
            )}
        {aiEnabled && <RecipeCreateSubmit disabled={!hasSource} loading={loading} status={createStatus} />}

        <RecipeCreateErrorAlert open={error}>
          <Box>
            <p>{errorMessage || t("recipe.import-with-ai-error-details")}</p>
          </Box>
        </RecipeCreateErrorAlert>
      </Box>
    </form>
  );
}
