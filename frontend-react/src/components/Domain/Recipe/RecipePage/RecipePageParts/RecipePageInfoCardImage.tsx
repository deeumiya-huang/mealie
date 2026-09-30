import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import type { Recipe } from "~/lib/api/types/recipe";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import { useStaticRoutes } from "~/hooks/api";
import { usePageState } from "~/hooks/recipe-page/shared-state";
import { useDisplay } from "~/hooks/use-display";
import { RecipeImageLightbox } from "../../RecipeImageLightbox";

export function RecipePageInfoCardImage({ recipe, maxWidth, sx }: { recipe: NoUndefinedField<Recipe>; maxWidth?: string; sx?: SxProps<Theme> }) {
  const display = useDisplay();
  const { recipeImage, recipeSmallImage } = useStaticRoutes();
  const { imageKey } = usePageState(recipe.slug);
  const [hideImage, setHideImage] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const imageHeight = display.xs ? 200 : 400;
  const recipeFullImageUrl = recipeImage(recipe.id, recipe.image, imageKey);
  const recipeImageUrl = display.smAndDown ? recipeSmallImage(recipe.id, recipe.image, imageKey) : recipeFullImageUrl;

  useEffect(() => setHideImage(false), [recipeImageUrl]);

  return (
    <>
      <Box
        key={imageKey}
        className="d-print-none"
        onClick={() => !hideImage && setLightboxOpen(true)}
        sx={[
          { maxWidth, minHeight: 50, width: "100%", height: hideImage ? undefined : imageHeight, cursor: hideImage ? undefined : "zoom-in", overflow: "hidden" },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        {!hideImage && <img src={recipeImageUrl} alt="" onError={() => setHideImage(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </Box>
      {lightboxOpen && <RecipeImageLightbox open={lightboxOpen} onOpenChange={setLightboxOpen} imageUrl={recipeFullImageUrl} imageAlt={recipe.name} />}
    </>
  );
}

export default RecipePageInfoCardImage;
