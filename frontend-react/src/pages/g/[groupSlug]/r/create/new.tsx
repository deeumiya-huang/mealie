import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { TextInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";

export default function RecipeCreateNewPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const params = useParams();
  const navigate = useNavigate();
  const api = useUserApi();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const [loading, setLoading] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState("");
  const domCreateByName = useRef<FormHandle>(null);

  async function createByName(name: string) {
    if (!domCreateByName.current?.validate() || name === "") {
      return;
    }
    setLoading(true);
    const { response } = await api.recipes.createOne({ name });
    if (response?.status !== 201) {
      setLoading(false);
      return;
    }
    void navigate(`/g/${groupSlug}/r/${response.data}?edit=true`);
  }

  return (
    <div>
      <Typography variant="h5" sx={{ px: 2, pt: 2 }}>{i18n.t("recipe.create-recipe")}</Typography>
      <Box sx={{ p: 2 }}>
        {i18n.t("recipe.create-a-recipe-by-providing-the-name-all-recipes-must-have-unique-names")}
        <VForm ref={domCreateByName} onSubmit={e => e.preventDefault()}>
          <TextInput
            value={newRecipeName}
            onChange={setNewRecipeName}
            label={i18n.t("recipe.recipe-name")}
            prependInnerIcon={icons.primary}
            autoFocus
            variant="solo-filled"
            clearable
            sx={{ mt: 1 }}
            rules={[validators.required]}
            hint={i18n.t("recipe.new-recipe-names-must-be-unique")}
            persistentHint
            onKeyDown={(e) => {
              if (e.key === "Enter") void createByName(newRecipeName);
            }}
          />
        </VForm>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
        <Box sx={{ width: 250 }}>
          <BaseButton
            disabled={newRecipeName.trim() === ""}
            fullWidth
            loading={loading}
            onClick={() => void createByName(newRecipeName)}
          />
        </Box>
      </Box>
    </div>
  );
}
