import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { alertUnreportedError } from "~/hooks/use-toast";
import { AppButtonUpload } from "~/components/global/AppButtonUpload";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { TextInput } from "~/components/global/form";

export interface RecipeImageUploadBtnProps {
  slug: string;
  className?: string;
  onUpload?: (file: File) => void;
  onRefresh?: (image: string) => void;
  onDelete?: () => void;
}

export function RecipeImageUploadBtn({ slug, className, onUpload, onRefresh, onDelete }: RecipeImageUploadBtnProps) {
  const i18n = useI18n();
  const api = useUserApi();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialogDeleteImage, setDialogDeleteImage] = useState(false);

  async function deleteImage() {
    setLoading(true);
    const { error } = await api.recipes.deleteImage(slug);
    setLoading(false);
    if (error) {
      alertUnreportedError(error, i18n.t("events.something-went-wrong"));
      return;
    }
    onDelete?.();
    setAnchor(null);
  }

  async function getImageFromURL() {
    setLoading(true);
    const { data, error } = await api.recipes.updateImagebyURL(slug, url);
    setLoading(false);
    if (error) {
      alertUnreportedError(error, i18n.t("events.something-went-wrong"));
      return;
    }
    if (data?.image) onRefresh?.(data.image);
    setAnchor(null);
  }

  return (
    <Box className={className} sx={{ textAlign: "center" }}>
      <BaseDialog
        open={dialogDeleteImage}
        onOpenChange={setDialogDeleteImage}
        bottomSheet
        title={i18n.t("recipe.delete-image")}
        icon={icons.alertCircle}
        color="error"
        canDelete
        onDelete={() => void deleteImage()}
      >
        <CardContent>{i18n.t("recipe.delete-image-confirmation")}</CardContent>
      </BaseDialog>
      <Button color="accent" variant="contained" onClick={e => setAnchor(e.currentTarget)} startIcon={<Icon path={icons.fileImage} />}>
        {i18n.t("general.image")}
      </Button>
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Card sx={{ width: 400, maxWidth: "100vw" }}>
          <Box sx={{ p: 2, pb: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ flex: "1 0 100%" }}>{i18n.t("recipe.recipe-image")}</Typography>
            <AppButtonUpload
              url="none"
              fileName="image"
              textBtn={false}
              post={false}
              onUploaded={(file) => {
                onUpload?.(file as File);
                setAnchor(null);
              }}
            />
            <BaseButton sx={{ ml: 1 }} delete onClick={() => setDialogDeleteImage(true)} />
          </Box>
          <CardContent>
            <TextInput
              value={url}
              onChange={setUrl}
              label={i18n.t("general.url")}
              sx={{ pt: 1 }}
              clearable
              hint={slug ? undefined : i18n.t("recipe.save-recipe-before-use")}
              persistentHint={!slug}
              appendInner={(
                <InputAdornment position="end">
                  <Button sx={{ ml: 1 }} color="primary" variant="contained" disabled={!slug || loading} onClick={() => void getImageFromURL()}>
                    {i18n.t("general.get")}
                  </Button>
                </InputAdornment>
              )}
            />
          </CardContent>
        </Card>
      </Popover>
    </Box>
  );
}

export default RecipeImageUploadBtn;
