import { useRef, useState } from "react";
import { Link as RouterLink, useParams } from "react-router";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { TextInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { RecipeCreateDataInput, convertRecipeData, recipeDataAsString } from "~/components/Domain/Recipe/RecipeCreate/RecipeCreateDataInput";
import type { RecipeData } from "~/components/Domain/Recipe/RecipeCreate/RecipeCreateDataInput";
import { RecipeCreateErrorAlert, RecipeCreateHelpLinks, RecipeCreateSubmit } from "~/components/Domain/Recipe/RecipeCreate/RecipeCreateErrorAlert";
import { useUserApi } from "~/hooks/api";
import { useTagStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroupSelf } from "~/hooks/use-groups";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useNewRecipeOptions } from "~/hooks/use-new-recipe-options";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";

export default function RecipeCreateHtmlPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();
  const params = useParams();
  const { group } = useGroupSelf();
  const tags = useTagStore();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const domUrlForm = useRef<FormHandle>(null);

  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditJSON, setIsEditJSON] = useState(false);
  const [newRecipeData, setNewRecipeData] = useState<RecipeData>(null);
  const [newRecipeUrl, setNewRecipeUrl] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  const aiImporterTarget = `/g/${groupSlug}/r/create/ai`;
  const aiEnabled = !!group?.aiProviderSettings?.aiEnabled;

  const {
    importKeywordsAsTags: [importKeywordsAsTags, setImportKeywordsAsTags],
    importCategories: [importCategories, setImportCategories],
    stayInEditMode: [stayInEditMode, setStayInEditMode],
    parseRecipe: [parseRecipe, setParseRecipe],
    navigateToRecipe,
  } = useNewRecipeOptions();

  function handleIsEditJson(value: boolean) {
    setIsEditJSON(value);
    setNewRecipeData(convertRecipeData(value, newRecipeData));
  }

  async function createFromHtmlOrJson() {
    const dataString = recipeDataAsString(newRecipeData);
    if (!dataString) {
      return;
    }
    if (!domUrlForm.current?.validate()) {
      return;
    }

    setError(false);
    setLoading(true);
    const { response } = await api.recipes.createOneByHtmlOrJson(
      dataString,
      importKeywordsAsTags,
      importCategories,
      newRecipeUrl,
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
    navigateToRecipe(response.data, groupSlug, `/g/${groupSlug}/r/create/html`);
  }

  const option = (label: string, checked: boolean, set: (v: boolean) => void) => (
    <FormControlLabel sx={{ display: "flex" }} control={<Checkbox checked={checked} onChange={e => set(e.target.checked)} />} label={label} />
  );

  return (
    <VForm
      ref={domUrlForm}
      onSubmit={(e) => {
        e.preventDefault();
        void createFromHtmlOrJson();
      }}
    >
      <Typography variant="h5" sx={{ px: 2, pt: 2 }}>{i18n.t("recipe.import-from-html-or-json")}</Typography>
      <Box sx={{ p: 2 }}>
        <p>{i18n.t("recipe.import-from-html-or-json-description")}</p>
        <p>
          {i18n.t("recipe.json-import-format-description-colon")}
          {" "}
          <Link href="https://schema.org/Recipe" target="_blank">https://schema.org/Recipe</Link>
        </p>
        {aiEnabled && (
          <p>
            {i18n.t("recipe.import-from-html-or-json-have-ai-read-it")}
            {" "}
            <Link component={RouterLink} to={aiImporterTarget}>{i18n.t("recipe.import-with-ai")}</Link>
            .
          </p>
        )}
        <FormControlLabel
          sx={{ mt: 1 }}
          control={<Switch checked={isEditJSON} onChange={e => handleIsEditJson(e.target.checked)} />}
          label={i18n.t("recipe.json-editor")}
        />
        <TextInput
          value={newRecipeUrl}
          onChange={v => setNewRecipeUrl(v || null)}
          label={i18n.t("new-recipe.recipe-url")}
          prependInnerIcon={icons.link}
          variant="solo-filled"
          clearable
          rules={[validators.urlOptional]}
          hint={i18n.t("new-recipe.copy-and-paste-the-source-url-of-your-data-optional")}
          persistentHint
          sx={{ mt: 5, mb: 2, maxWidth: 500 }}
        />
        <RecipeCreateDataInput
          isEditJSON={isEditJSON}
          value={newRecipeData}
          onChange={setNewRecipeData}
          label={i18n.t("new-recipe.recipe-html-or-json")}
          icon={icons.codeTags}
          autoFocus
        />
        {option(i18n.t("recipe.import-original-keywords-as-tags"), importKeywordsAsTags, setImportKeywordsAsTags)}
        {option(i18n.t("recipe.import-original-categories"), importCategories, setImportCategories)}
        {option(i18n.t("recipe.stay-in-edit-mode"), stayInEditMode, setStayInEditMode)}
        {option(i18n.t("recipe.parse-recipe-ingredients-after-import"), parseRecipe, setParseRecipe)}
      </Box>
      <RecipeCreateSubmit disabled={!newRecipeData} loading={loading} status={createStatus} />
      <RecipeCreateErrorAlert show={error}>
        <p>{i18n.t("new-recipe.html-or-json-error-details")}</p>
        <RecipeCreateHelpLinks />
      </RecipeCreateErrorAlert>
    </VForm>
  );
}
