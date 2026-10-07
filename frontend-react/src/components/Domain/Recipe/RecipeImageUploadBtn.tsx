// Usage: <RecipeImageUploadBtn slug={recipe.slug} onUpload={file => …} onRefresh={image => …} onDelete={() => …} />
// The "Image" button of the recipe editor: upload a file (reported through `onUpload`), fetch the image from a URL
// (`onRefresh(image)`), or delete it after a confirmation (`onDelete`).
import { useState, type ChangeEvent, type MouseEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppButtonUpload } from "@/components/global/AppButtonUpload";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { alertUnreportedError } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface RecipeImageUploadBtnProps {
  slug: string;
  className?: string;
  onRefresh?: (image: string) => void;
  onUpload?: (fileObject: File) => void;
  onDelete?: () => void;
}

export function RecipeImageUploadBtn({ slug, className, onRefresh, onUpload, onDelete }: RecipeImageUploadBtnProps) {
  const { t } = useI18n();
  const api = useUserApi();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dialogDeleteImage, setDialogDeleteImage] = useState(false);

  function uploadImage(fileObject: File) {
    onUpload?.(fileObject);
    setMenuAnchor(null);
  }

  async function deleteImage() {
    setLoading(true);
    const { error } = await api.recipes.deleteImage(slug);
    setLoading(false);

    if (error) {
      alertUnreportedError(error, t("events.something-went-wrong"));
      return;
    }

    onDelete?.();
    setMenuAnchor(null);
  }

  async function getImageFromURL() {
    setLoading(true);
    const { data, error } = await api.recipes.updateImagebyURL(slug, url);
    setLoading(false);

    if (error) {
      alertUnreportedError(error, t("events.something-went-wrong"));
      return;
    }

    if (data?.image) {
      onRefresh?.(data.image);
    }
    setMenuAnchor(null);
  }

  const messages = slug ? "" : t("recipe.save-recipe-before-use");

  return (
    <Box className={className} sx={{ textAlign: "center" }}>
      <BaseDialog
        open={dialogDeleteImage}
        onOpenChange={setDialogDeleteImage}
        bottomSheet
        title={t("recipe.delete-image")}
        icon={icons.alertCircle}
        color="error"
        canDelete
        onDelete={() => void deleteImage()}
      >
        <CardContent>
          {t("recipe.delete-image-confirmation")}
        </CardContent>
      </BaseDialog>
      <Button
        color="accent"
        variant="contained"
        aria-haspopup="true"
        aria-expanded={!!menuAnchor}
        startIcon={<MdiIcon path={icons.fileImage} />}
        onClick={(event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget)}
      >
        {t("general.image")}
      </Button>
      <Popover
        open={!!menuAnchor}
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Card sx={{ width: 400, maxWidth: "100%" }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", px: 2, pt: 2 }}>
            <Typography variant="h6" component="div">
              {t("recipe.recipe-image")}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <AppButtonUpload
                url="none"
                fileName="image"
                textBtn={false}
                post={false}
                onUploaded={(payload) => {
                  if (payload instanceof File) {
                    uploadImage(payload);
                  }
                }}
              />
              <Box sx={{ ml: 1 }}>
                <BaseButton delete onClick={() => setDialogDeleteImage(true)} />
              </Box>
            </Box>
          </Box>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "flex-start", pt: 1 }}>
              <TextField
                value={url}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setUrl(event.target.value)}
                label={t("general.url")}
                variant="filled"
                fullWidth
                helperText={messages || " "}
                slotProps={{
                  input: {
                    endAdornment: url
                      ? (
                          <InputAdornment position="end">
                            <IconButton size="small" edge="end" aria-label={t("general.clear")} onClick={() => setUrl("")}>
                              <MdiIcon path={icons.close} size="small" />
                            </IconButton>
                          </InputAdornment>
                        )
                      : undefined,
                  },
                }}
              />
              <Button
                sx={{ ml: 1, mt: 1 }}
                color="primary"
                variant="contained"
                loading={loading}
                disabled={!slug}
                onClick={() => void getImageFromURL()}
              >
                {t("general.get")}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Popover>
    </Box>
  );
}
