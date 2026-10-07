import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import CardActions from "@mui/material/CardActions";
import Box from "@mui/material/Box";
import { BaseButton } from "@/components/global/BaseButton";
import { RecipeCreateText, RecipeCreateTextField, RecipeCreateTitle } from "@/components/Domain/Recipe/RecipeCreate/RecipeCreateParts";
import { useUserApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

// Port of pages/g/[groupSlug]/r/create/new.vue: create a recipe from just a name.
export default function RecipeCreateNewPage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const params = useParams();
  const api = useUserApi();
  const navigate = useNavigate();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const [newRecipeName, setNewRecipeName] = useState("");
  const form = useFormValidation({
    name: field(newRecipeName, [validators.required]),
  });

  async function createByName(name: string) {
    // The Vue page did not await `validate()`, so it only reveals the field's message here and never blocks.
    form.validate();
    if (name === "") {
      return;
    }
    const { response } = await api.recipes.createOne({ name });
    if (response?.status !== 201) {
      return;
    }
    void navigate(`/g/${groupSlug}/r/${response.data}?edit=true`);
  }

  return (
    <Box>
      <RecipeCreateTitle>{t("recipe.create-recipe")}</RecipeCreateTitle>
      <RecipeCreateText>
        {t("recipe.create-a-recipe-by-providing-the-name-all-recipes-must-have-unique-names")}
        <form onSubmit={event => event.preventDefault()}>
          <RecipeCreateTextField
            label={t("recipe.recipe-name")}
            icon={icons.primary}
            autoFocus
            value={newRecipeName}
            onChange={setNewRecipeName}
            onBlur={() => form.touch("name")}
            error={form.errorFor("name")}
            hint={t("recipe.new-recipe-names-must-be-unique")}
            onEnter={() => void createByName(newRecipeName)}
            sx={{ mt: 1 }}
          />
        </form>
      </RecipeCreateText>
      <CardActions sx={{ justifyContent: "center" }}>
        <Box sx={{ width: 250 }}>
          <BaseButton
            disabled={newRecipeName.trim() === ""}
            fullWidth
            sx={{ borderRadius: "24px" }}
            onClick={() => void createByName(newRecipeName)}
          />
        </Box>
      </CardActions>
    </Box>
  );
}
