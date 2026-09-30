import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import { AppButtonUpload } from "~/components/global/AppButtonUpload";
import { Icon } from "~/components/global/Icon";
import { ImageCropper } from "~/components/global/ImageCropper";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";

export interface RecipeImportImagesProps {
  value: (Blob | File)[];
  onChange: (images: (Blob | File)[]) => void;
  disabled?: boolean;
}

function swapped<T>(array: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= array.length || j >= array.length) {
    return array;
  }
  const next = [...array];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

export function RecipeImportImages({ value: images, onChange, disabled = false }: RecipeImportImagesProps) {
  const i18n = useI18n();
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const urlsRef = useRef(previewUrls);
  urlsRef.current = previewUrls;

  function uploadImages(files: File[]) {
    onChange([...images, ...files]);
    setPreviewUrls(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
  }

  function clearImage(index: number) {
    // Revoke _before_ removing
    URL.revokeObjectURL(previewUrls[index]!);
    onChange(images.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }

  function updateImage(index: number, croppedImage: Blob) {
    onChange(images.map((img, i) => (i === index ? croppedImage : img)));
    setPreviewUrls(prev => prev.map((url, i) => (i === index ? URL.createObjectURL(croppedImage) : url)));
  }

  // Put the intended cover image at the start of the array.
  // The backend uses the first image as the cover image.
  function setCoverImage(index: number) {
    if (index < 0 || index >= images.length || index === 0) {
      return;
    }
    onChange(swapped(images, 0, index));
    setPreviewUrls(prev => swapped(prev, 0, index));
  }

  useEffect(() => () => urlsRef.current.forEach(url => URL.revokeObjectURL(url)), []);

  return (
    <div>
      <Box sx={{ display: "flex" }}>
        <Box sx={{ ml: "auto" }}>
          <AppButtonUpload
            url="none"
            fileName="images"
            accept="image/*"
            text={images.length ? i18n.t("recipe.upload-more-images") : i18n.t("recipe.upload-images")}
            textBtn={false}
            post={false}
            multiple
            disabled={disabled}
            onUploaded={files => uploadImages(files as File[])}
          />
        </Box>
      </Box>
      {!!images.length && (
        <Box sx={{ mt: 1.5 }}>
          <p style={{ margin: "8px 0" }}>{i18n.t("recipe.crop-and-rotate-the-image")}</p>
          <Grid container spacing={2}>
            {previewUrls.map((imageUrl, index) => (
              <Grid key={imageUrl} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }} sx={{ p: 1.5 }}>
                <Box sx={{ mt: 2, mb: 1 }}>
                  <ImageCropper
                    img={imageUrl}
                    cropperWidth="100%"
                    submitted={disabled}
                    onSave={croppedImage => updateImage(index, croppedImage)}
                    onDelete={() => clearImage(index)}
                  />
                </Box>
                {images.length > 1 && (
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={disabled || index === 0}
                    startIcon={<Icon path={index === 0 ? icons.check : icons.fileImage} />}
                    onClick={() => setCoverImage(index)}
                  >
                    {index === 0 ? i18n.t("recipe.cover-image") : i18n.t("recipe.set-as-cover-image")}
                  </Button>
                )}
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </div>
  );
}

export default RecipeImportImages;
