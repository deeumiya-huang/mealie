import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { BaseButton } from "@/components/global/BaseButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import { RecipeCreateText, RecipeCreateTitle } from "@/components/Domain/Recipe/RecipeCreate/RecipeCreateParts";
import { useUserApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { alert } from "@/hooks/use-toast";
import { getGlobalI18n, useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

const NEW_RECIPE_ZIP_FILE_NAME = "archive";

// Port of pages/g/[groupSlug]/r/create/zip.vue: import a recipe from a zip exported by Mealie.
export default function RecipeCreateZipPage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const params = useParams();
  const api = useUserApi();
  const navigate = useNavigate();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const [loading, setLoading] = useState(false);
  const [newRecipeZip, setNewRecipeZip] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function onFileChanged(event: ChangeEvent<HTMLInputElement>) {
    setNewRecipeZip(event.target.files?.[0] ?? null);
  }

  function clearFile() {
    setNewRecipeZip(null);
    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  async function createByZip() {
    if (!newRecipeZip) {
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append(NEW_RECIPE_ZIP_FILE_NAME, newRecipeZip);

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
    <form onSubmit={event => event.preventDefault()}>
      <Box>
        <RecipeCreateTitle>{t("recipe.import-from-zip")}</RecipeCreateTitle>
        <RecipeCreateText>
          {t("recipe.import-from-zip-description")}
          {/* v-file-input: the real input is hidden, the field shows the chosen file and opens the picker */}
          <input
            ref={fileInput}
            type="file"
            accept=".zip"
            data-testid="zip-file-input"
            tabIndex={-1}
            style={{ display: "none" }}
            onChange={onFileChanged}
          />
          <TextField
            fullWidth
            variant="filled"
            label=".zip"
            value={newRecipeZip?.name ?? ""}
            helperText={t("recipe.zip-files-must-have-been-exported-from-mealie")}
            onClick={() => fileInput.current?.click()}
            slotProps={{
              input: {
                readOnly: true,
                disableUnderline: true,
                sx: { cursor: "pointer" },
                startAdornment: <InputAdornment position="start"><MdiIcon path={icons.zip} /></InputAdornment>,
                endAdornment: newRecipeZip
                  ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          edge="end"
                          aria-label={t("general.clear")}
                          onClick={(event) => {
                            event.stopPropagation();
                            clearFile();
                          }}
                        >
                          <MdiIcon path={icons.close} size="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  : undefined,
              },
              formHelperText: { sx: { mx: 2 } },
            }}
            sx={{ "mt": 1, "& .MuiFilledInput-root": { borderRadius: "24px", overflow: "hidden" } }}
          />
        </RecipeCreateText>
        <CardActions sx={{ justifyContent: "center" }}>
          <Box sx={{ width: 250 }}>
            <BaseButton
              disabled={newRecipeZip === null}
              fullWidth
              loading={loading}
              sx={{ borderRadius: "24px" }}
              onClick={() => void createByZip()}
            />
          </Box>
        </CardActions>
      </Box>
    </form>
  );
}
