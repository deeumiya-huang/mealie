import { useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import { useSearchParams } from "react-router";
import { Mode } from "vanilla-jsoneditor";
import { RecipeJsonEditor } from "@/components/global/RecipeJsonEditor";
import {
  RecipeCreateOption,
  RecipeCreateSubmit,
  RecipeCreateText,
  RecipeCreateTextField,
  RecipeCreateTitle,
} from "@/components/Domain/Recipe/RecipeCreate/RecipeCreateParts";
import { useUserApi } from "@/hooks/api";
import { useGroupSelf } from "@/hooks/use-groups";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { Recipe } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

// Port of pages/g/[groupSlug]/r/create/debug.vue: shows what the scraper extracts from a URL.
export default function RecipeCreateDebugPage() {
  const { t } = useI18n();
  const api = useUserApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const { group } = useGroupSelf();

  const [loading, setLoading] = useState(false);
  const [useOpenAI, setUseOpenAI] = useState(false);

  // The field starts with the URL of the query and writes every edit (trimmed) back to it, like the Vue computed.
  const [recipeUrl, setRecipeUrl] = useState<string | null>(() => searchParams.get("recipe_import_url"));

  function updateRecipeUrl(value: string) {
    const trimmed = value.trim();
    setRecipeUrl(trimmed);
    const next = new URLSearchParams(searchParams);
    next.set("recipe_import_url", trimmed);
    setSearchParams(next, { replace: true });
  }

  const form = useFormValidation({
    url: field(recipeUrl ?? "", [validators.url]),
  });

  const [debugTreeView, setDebugTreeView] = useState(false);
  const [debugData, setDebugData] = useState<Recipe | null>(null);

  async function debugUrl(url: string | null) {
    if (url === null) {
      return;
    }

    setLoading(true);

    const { data } = await api.recipes.testCreateOneUrl(url, useOpenAI);

    setLoading(false);
    setDebugData(data);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void debugUrl(recipeUrl);
  }

  return (
    <Box>
      <form onSubmit={onSubmit}>
        <Box>
          <RecipeCreateTitle>{t("recipe.recipe-debugger")}</RecipeCreateTitle>
          <RecipeCreateText>
            {t("recipe.recipe-debugger-description")}
            <RecipeCreateTextField
              label={t("new-recipe.recipe-url")}
              icon={icons.link}
              autoFocus
              value={recipeUrl ?? ""}
              onChange={updateRecipeUrl}
              onBlur={() => form.touch("url")}
              error={form.errorFor("url")}
              hint={t("new-recipe.url-form-hint")}
              sx={{ mt: 1 }}
            />
          </RecipeCreateText>
          {group?.aiProviderSettings?.aiEnabled && (
            <RecipeCreateText>
              {t("recipe.recipe-debugger-use-openai-description")}
              <RecipeCreateOption label={t("recipe.use-openai")} checked={useOpenAI} onChange={setUseOpenAI} />
            </RecipeCreateText>
          )}
          <RecipeCreateSubmit
            disabled={recipeUrl === null}
            loading={loading}
            showStatus={false}
            color="info"
            icon={icons.robot}
            text={t("recipe.debug")}
          />
        </Box>
      </form>
      {debugData && (
        <section>
          <RecipeCreateOption label={t("recipe.tree-view")} checked={debugTreeView} onChange={setDebugTreeView} />
          <RecipeJsonEditor
            value={debugData}
            height="700px"
            mode={debugTreeView ? Mode.tree : Mode.text}
            mainMenuBar={false}
            readOnly
          />
        </section>
      )}
    </Box>
  );
}
