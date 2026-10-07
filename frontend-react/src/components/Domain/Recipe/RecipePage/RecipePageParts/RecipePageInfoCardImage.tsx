// Usage: <RecipePageInfoCardImage recipe={recipe} maxWidth="50%" /> — the recipe photo of the info card (the small
// image on small screens); a click opens the full image in the lightbox. Hidden when the image fails to load.
import { useState } from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import { RecipeImageLightbox } from "@/components/Domain/Recipe/RecipeImageLightbox";
import { BaseImg } from "@/components/global/BaseImg";
import { useStaticRoutes } from "@/hooks/api";
import { usePageState } from "@/hooks/recipe-page/shared-state";
import { useDisplay } from "@/hooks/utils";
import type { RecipeModel } from "../recipe-model";

interface RecipePageInfoCardImageProps {
  recipe: RecipeModel;
  maxWidth?: string;
  sx?: SxProps<Theme>;
}

export function RecipePageInfoCardImage({ recipe, maxWidth = undefined, sx }: RecipePageInfoCardImageProps) {
  const display = useDisplay();
  const { recipeImage, recipeSmallImage } = useStaticRoutes();
  const { imageKey } = usePageState(recipe.slug);

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const imageHeight = display.xs ? "200" : "400";

  const recipeFullImageUrl = recipeImage(recipe.id, recipe.image, imageKey);

  const recipeImageUrl = display.smAndDown
    ? recipeSmallImage(recipe.id, recipe.image, imageKey)
    : recipeFullImageUrl;

  // hidden after a load error, until the URL changes (Vue: watch(recipeImageUrl, () => hideImage = false))
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hideImage = failedUrl === recipeImageUrl;

  function openLightbox() {
    if (hideImage) {
      return;
    }
    setLightboxOpen(true);
  }

  return (
    <>
      <BaseImg
        key={imageKey}
        maxWidth={maxWidth}
        minHeight="50"
        cover
        width="100%"
        height={hideImage ? undefined : imageHeight}
        src={recipeImageUrl}
        className="d-print-none"
        sx={[
          { displayPrint: "none", cursor: hideImage ? undefined : "zoom-in" },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        onError={() => setFailedUrl(recipeImageUrl)}
        onClick={openLightbox}
      />
      {lightboxOpen && (
        <RecipeImageLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          imageUrl={recipeFullImageUrl}
          imageAlt={recipe.name}
        />
      )}
    </>
  );
}
