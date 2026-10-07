// Usage: <RecipeImportImages value={images} onChange={setImages} disabled={loading} /> — upload button plus a cropper
// card per chosen image (crop, rotate, delete, pick the cover image). `value` is the list of images to import;
// the backend uses the first one as the cover image.
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import { AppButtonUpload } from "@/components/global/AppButtonUpload";
import { ImageCropper } from "@/components/global/ImageCropper";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface RecipeImportImagesProps {
  value?: (Blob | File)[];
  onChange?: (images: (Blob | File)[]) => void;
  disabled?: boolean;
}

const NO_IMAGES: (Blob | File)[] = [];

function swapItem<T>(array: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= array.length || j >= array.length) {
    return array;
  }

  const copy = [...array];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

export function RecipeImportImages({ value = NO_IMAGES, onChange, disabled = false }: RecipeImportImagesProps) {
  const { t } = useI18n();
  const images = value;

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // The URLs to revoke when the component goes away
  const latestUrls = useRef(previewUrls);
  useEffect(() => {
    latestUrls.current = previewUrls;
  });
  useEffect(() => {
    return () => {
      latestUrls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  function uploadImages(files: File[]) {
    const newUrls = files.map(file => URL.createObjectURL(file));
    onChange?.([...images, ...files]);
    setPreviewUrls(current => [...current, ...newUrls]);
  }

  function clearImage(index: number) {
    // Revoke _before_ removing
    URL.revokeObjectURL(previewUrls[index]);

    onChange?.(images.filter((_, imageIndex) => imageIndex !== index));
    setPreviewUrls(current => current.filter((_, urlIndex) => urlIndex !== index));
  }

  function updateImage(index: number, croppedImage: Blob) {
    const newUrl = URL.createObjectURL(croppedImage);
    onChange?.(images.map((image, imageIndex) => (imageIndex === index ? croppedImage : image)));
    setPreviewUrls(current => current.map((url, urlIndex) => (urlIndex === index ? newUrl : url)));
  }

  // Put the intended cover image at the start of the array.
  // The backend uses the first image as the cover image.
  function setCoverImage(index: number) {
    if (index < 0 || index >= images.length || index === 0) {
      return;
    }

    onChange?.(swapItem(images, 0, index));
    setPreviewUrls(current => swapItem(current, 0, index));
  }

  return (
    <Box>
      <AppButtonUpload
        url="none"
        fileName="images"
        accept="image/*"
        text={images.length ? t("recipe.upload-more-images") : t("recipe.upload-images")}
        textBtn={false}
        post={false}
        multiple
        disabled={disabled}
        onUploaded={files => uploadImages(files as File[])}
      />
      {images.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Box component="p" sx={{ my: 1 }}>
            {t("recipe.crop-and-rotate-the-image")}
          </Box>
          <Grid container spacing={1}>
            {previewUrls.map((imageUrl, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
                <Box sx={{ p: 1 }}>
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
                      startIcon={<MdiIcon path={index === 0 ? icons.check : icons.fileImage} />}
                      onClick={() => setCoverImage(index)}
                    >
                      {index === 0 ? t("recipe.cover-image") : t("recipe.set-as-cover-image")}
                    </Button>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
