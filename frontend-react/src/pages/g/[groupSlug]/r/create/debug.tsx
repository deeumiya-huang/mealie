import { useState } from "react";
import { useSearchParams } from "react-router";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { Icon } from "~/components/global/Icon";
import { RecipeJsonEditor } from "~/components/global/RecipeJsonEditor";
import { TextInput, VForm } from "~/components/global/form";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroupSelf } from "~/hooks/use-groups";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";
import type { Recipe } from "~/lib/api/types/recipe";

export default function RecipeCreateDebugPage() {
  const i18n = useI18n();
  const api = useUserApi();
  const { group } = useGroupSelf();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [useOpenAI, setUseOpenAI] = useState(false);
  const [debugTreeView, setDebugTreeView] = useState(false);
  const [debugData, setDebugData] = useState<Recipe | null>(null);

  const recipeUrl = searchParams.get("recipe_import_url");
  function setRecipeUrl(value: string | null) {
    if (value !== null) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("recipe_import_url", value.trim());
        return next;
      }, { replace: true });
    }
  }

  async function debugUrl(url: string | null) {
    if (url === null) {
      return;
    }
    setLoading(true);
    const { data } = await api.recipes.testCreateOneUrl(url, useOpenAI);
    setLoading(false);
    setDebugData(data);
  }

  return (
    <div>
      <VForm
        onSubmit={(e) => {
          e.preventDefault();
          void debugUrl(recipeUrl);
        }}
      >
        <Typography variant="h5" sx={{ px: 2, pt: 2 }}>{i18n.t("recipe.recipe-debugger")}</Typography>
        <Box sx={{ p: 2 }}>
          {i18n.t("recipe.recipe-debugger-description")}
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
        {group?.aiProviderSettings?.aiEnabled && (
          <Box sx={{ p: 2 }}>
            {i18n.t("recipe.recipe-debugger-use-openai-description")}
            <FormControlLabel
              sx={{ display: "flex" }}
              control={<Checkbox checked={useOpenAI} onChange={e => setUseOpenAI(e.target.checked)} />}
              label={i18n.t("recipe.use-openai")}
            />
          </Box>
        )}
        <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
          <Box sx={{ width: 250 }}>
            <BaseButton
              disabled={recipeUrl === null}
              fullWidth
              type="submit"
              color="info"
              loading={loading}
              iconSlot={<Icon path={icons.robot} />}
            >
              {i18n.t("recipe.debug")}
            </BaseButton>
          </Box>
        </Box>
      </VForm>
      {debugData && (
        <section>
          <FormControlLabel
            control={<Checkbox checked={debugTreeView} onChange={e => setDebugTreeView(e.target.checked)} />}
            label={i18n.t("recipe.tree-view")}
          />
          <RecipeJsonEditor
            value={debugData}
            onChange={() => {}}
            height="700px"
            mode={debugTreeView ? "tree" : "text"}
            mainMenuBar={false}
            readOnly
          />
        </section>
      )}
    </div>
  );
}
