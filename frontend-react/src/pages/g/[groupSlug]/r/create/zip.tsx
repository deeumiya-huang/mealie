import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { FileInput } from "~/components/global/form";
import { useUserApi } from "~/hooks/api";
import { getGlobalI18n, useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { alert } from "~/hooks/use-toast";
import { icons } from "~/lib/icons";

const newRecipeZipFileName = "archive";

export default function RecipeCreateZipPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const params = useParams();
  const navigate = useNavigate();
  const api = useUserApi();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const [loading, setLoading] = useState(false);
  const [newRecipeZip, setNewRecipeZip] = useState<File | null>(null);

  async function createByZip() {
    if (!newRecipeZip) {
      return;
    }
    const formData = new FormData();
    formData.append(newRecipeZipFileName, newRecipeZip);

    try {
      const response = await api.upload.file("/api/recipes/create/zip", formData);
      if (response?.status !== 201) {
        throw new Error("Failed to upload zip");
      }
      void navigate(`/g/${groupSlug}/r/${response.data}`);
    }
    catch (error) {
      console.error(error);
      alert.error(getGlobalI18n().t("events.something-went-wrong"));
    }
    finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={e => e.preventDefault()}>
      <Typography variant="h5" sx={{ px: 2, pt: 2 }}>{i18n.t("recipe.import-from-zip")}</Typography>
      <Box sx={{ p: 2 }}>
        {i18n.t("recipe.import-from-zip-description")}
        <FileInput
          value={newRecipeZip}
          onChange={setNewRecipeZip}
          accept=".zip"
          label=".zip"
          variant="solo-filled"
          clearable
          sx={{ mt: 1 }}
          hint={i18n.t("recipe.zip-files-must-have-been-exported-from-mealie")}
          persistentHint
          prependInnerIcon={icons.zip}
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
        <Box sx={{ width: 250 }}>
          <BaseButton disabled={newRecipeZip === null} fullWidth loading={loading} onClick={() => void createByZip()} />
        </Box>
      </Box>
    </form>
  );
}
