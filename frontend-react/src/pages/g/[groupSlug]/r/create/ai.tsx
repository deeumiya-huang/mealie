import { useRef, useState } from "react";
import { Link as RouterLink, useParams } from "react-router";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Icon } from "~/components/global/Icon";
import { TextInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { RecipeImportImages } from "~/components/Domain/Recipe/RecipeImportImages";
import { RecipeCreateDataInput, convertRecipeData, recipeDataAsString } from "~/components/Domain/Recipe/RecipeCreate/RecipeCreateDataInput";
import type { RecipeData } from "~/components/Domain/Recipe/RecipeCreate/RecipeCreateDataInput";
import { RecipeCreateErrorAlert, RecipeCreateSubmit } from "~/components/Domain/Recipe/RecipeCreate/RecipeCreateErrorAlert";
import { useUserApi } from "~/hooks/api";
import { useTagStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroupSelf } from "~/hooks/use-groups";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useNewRecipeOptions } from "~/hooks/use-new-recipe-options";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";

export default function RecipeCreateAiPage() {
  const i18n = useI18n();
  const api = useUserApi();
  const auth = useMealieAuth();
  const params = useParams();
  const tags = useTagStore();
  const { group } = useGroupSelf();

  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditJSON, setIsEditJSON] = useState(false);

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const urlImporterTarget = `/g/${groupSlug}/r/create/url`;
  const htmlOrJsonImporterTarget = `/g/${groupSlug}/r/create/html`;
  const aiEnabled = !!group?.aiProviderSettings?.aiEnabled;
  const imagesEnabled = !!group?.aiProviderSettings?.imageProviderEnabled;
  const videosEnabled = !!group?.aiProviderSettings?.audioProviderEnabled;

  const domUrlForm = useRef<FormHandle>(null);
  const [recipeUrl, setRecipeUrl] = useState<string | null>(null);
  const [newRecipeData, setNewRecipeData] = useState<RecipeData>(null);
  const [uploadedImages, setUploadedImages] = useState<(Blob | File)[]>([]);
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  const {
    stayInEditMode: [stayInEditMode, setStayInEditMode],
    parseRecipe: [parseRecipe, setParseRecipe],
    translateRecipe: [translateRecipe, setTranslateRecipe],
    createNewOrganizers: [createNewOrganizers, setCreateNewOrganizers],
    navigateToRecipe,
  } = useNewRecipeOptions({
    enableImportKeywords: false,
    enableImportCategories: false,
    enableTranslateRecipe: true,
    enableCreateNewOrganizers: true,
  });

  const contentAsString = recipeDataAsString(newRecipeData);
  const hasSource = !!(recipeUrl || contentAsString || uploadedImages.length);

  function handleIsEditJson(value: boolean) {
    setIsEditJSON(value);
    setNewRecipeData(convertRecipeData(value, newRecipeData));
  }

  async function createRecipe() {
    if (!hasSource) {
      return;
    }
    if (!domUrlForm.current?.validate()) {
      return;
    }

    setError(false);
    setErrorMessage("");
    setLoading(true);

    const { data, error } = await api.recipes.createOneWithAI(
      {
        content: contentAsString,
        url: recipeUrl,
        images: uploadedImages,
        translateLanguage: translateRecipe ? i18n.locale : null,
        createNewOrganizers,
      },
      (message: string) => setCreateStatus(message),
    );

    setCreateStatus(null);

    if (error || !data) {
      setError(true);
      setErrorMessage((error as { message?: string } | null)?.message || "");
      setLoading(false);
      return;
    }

    if (createNewOrganizers) {
      void tags.actions.refresh();
    }

    navigateToRecipe(data, groupSlug, `/g/${groupSlug}/r/create/ai`);
  }

  const option = (label: string, checked: boolean, set: (v: boolean) => void) => (
    <FormControlLabel control={<Checkbox checked={checked} disabled={loading} onChange={e => set(e.target.checked)} />} label={label} />
  );

  return (
    <VForm
      ref={domUrlForm}
      onSubmit={(e) => {
        e.preventDefault();
        void createRecipe();
      }}
    >
      <Typography variant="h5" sx={{ px: 2, pt: 2 }}>{i18n.t("recipe.import-with-ai")}</Typography>
      {!aiEnabled
        ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="info" variant="standard">{i18n.t("recipe.import-with-ai-provider-required")}</Alert>
            </Box>
          )
        : (
            <Box sx={{ p: 2 }}>
              <p>{i18n.t("recipe.import-with-ai-description")}</p>
              {videosEnabled && <p>{i18n.t("recipe.import-with-ai-video-description")}</p>}
              <br />
              <p>
                {i18n.t("recipe.import-with-ai-without-ai-question")}
                {" "}
                <Link component={RouterLink} to={urlImporterTarget}>{i18n.t("recipe.import-with-ai-use-url-import")}</Link>
                .
              </p>
              <p>
                {i18n.t("recipe.scrape-recipe-have-raw-html-or-json-data")}
                {" "}
                <Link component={RouterLink} to={htmlOrJsonImporterTarget}>{i18n.t("recipe.scrape-recipe-you-can-import-from-raw-data-directly")}</Link>
                .
              </p>

              <TextInput
                value={recipeUrl}
                onChange={v => setRecipeUrl(v || null)}
                label={i18n.t("new-recipe.recipe-url")}
                prependInnerIcon={icons.link}
                variant="solo-filled"
                clearable
                rules={[validators.urlOptional]}
                hint={i18n.t("recipe.import-with-ai-url-hint")}
                persistentHint
                sx={{ mt: 4, mb: 2 }}
                disabled={loading}
              />

              <FormControlLabel
                sx={{ mt: 1, display: "flex" }}
                control={<Switch checked={isEditJSON} disabled={loading} onChange={e => handleIsEditJson(e.target.checked)} />}
                label={i18n.t("recipe.json-editor")}
              />
              <RecipeCreateDataInput
                isEditJSON={isEditJSON}
                value={newRecipeData}
                onChange={setNewRecipeData}
                label={i18n.t("recipe.import-with-ai-content")}
                icon={icons.textBox}
                hint={i18n.t("recipe.import-with-ai-content-hint")}
                disabled={loading}
              />

              {imagesEnabled
                ? (
                    <Box sx={{ mt: 3 }}>
                      <RecipeImportImages value={uploadedImages} onChange={setUploadedImages} disabled={loading} />
                    </Box>
                  )
                : (
                    <Alert severity="info" variant="standard" sx={{ mt: 3 }}>
                      {i18n.t("recipe.import-with-ai-image-provider-required")}
                    </Alert>
                  )}

              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {option(i18n.t("recipe.should-translate-description"), translateRecipe, setTranslateRecipe)}
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {option(i18n.t("recipe.create-new-organizers"), createNewOrganizers, setCreateNewOrganizers)}
                  <Tooltip title={i18n.t("recipe.create-new-organizers-hint")} placement="bottom" slotProps={{ tooltip: { sx: { maxWidth: 300 } } }}>
                    <span style={{ display: "inline-flex" }}><Icon path={icons.help} size="small" /></span>
                  </Tooltip>
                </Box>
                {option(i18n.t("recipe.stay-in-edit-mode"), stayInEditMode, setStayInEditMode)}
                {option(i18n.t("recipe.parse-recipe-ingredients-after-import"), parseRecipe, setParseRecipe)}
              </Box>
            </Box>
          )}
      {aiEnabled && <RecipeCreateSubmit disabled={!hasSource} loading={loading} status={createStatus} />}

      <RecipeCreateErrorAlert show={error}>
        <p>{errorMessage || i18n.t("recipe.import-with-ai-error-details")}</p>
      </RecipeCreateErrorAlert>
    </VForm>
  );
}
