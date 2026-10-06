// Usage: <RecipeCardImage small recipeId={id} slug={slug} imageVersion={recipe.image} height={200} onClick={…}>overlay</RecipeCardImage>
// The recipe image (tiny / small / large, default large) covering its box; recipes without an image version,
// or whose image fails to load, show the Mealie icon instead. `children` are drawn over the image.
import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { BaseImg } from "@/components/global/BaseImg";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useStaticRoutes } from "@/hooks/api";
import { icons } from "@/lib/icons";

interface RecipeCardImageProps {
  tiny?: boolean | null;
  small?: boolean | null;
  large?: boolean | null;
  iconSize?: number | string;
  slug?: string | null;
  recipeId: string;
  // Recipe.image is typed unknown in the generated API types, so callers
  // passing it directly cannot narrow to string here.
  imageVersion?: unknown;
  height?: number | string;
  minHeight?: number | string;
  children?: ReactNode;
  onClick?: () => void;
}

export function RecipeCardImage({
  tiny = null,
  small = null,
  iconSize = 100,
  recipeId,
  imageVersion = null,
  height = "100%",
  minHeight = 125,
  children,
  onClick,
}: RecipeCardImageProps) {
  const { recipeImage, recipeSmallImage, recipeTinyImage } = useStaticRoutes();

  // The image that failed to load; a different recipe or image version is tried again.
  const imageKey = `${recipeId}|${String(imageVersion)}`;
  const [failedKey, setFailedKey] = useState<string | null>(null);

  // Recipes without an image have no image version, so there is nothing to fetch.
  // Rendering the image anyway would only produce a 404 before falling back.
  const showImage = !!imageVersion && failedKey !== imageKey;

  const src = tiny
    ? recipeTinyImage(recipeId, imageVersion)
    : small
      ? recipeSmallImage(recipeId, imageVersion)
      : recipeImage(recipeId, imageVersion);

  if (showImage) {
    return (
      <BaseImg
        src={src}
        cover
        height={height}
        minHeight={minHeight}
        onClick={onClick}
        onError={() => setFailedKey(imageKey)}
      >
        {children}
      </BaseImg>
    );
  }

  return (
    <Box className="icon-slot" onClick={onClick} sx={{ "position": "relative", "& > div": { top: 0, position: "absolute", zIndex: 1 } }}>
      <MdiIcon
        path={icons.primary}
        color="primary"
        size={Number(iconSize)}
        sx={{ opacity: 0.8, display: "flex", position: "relative", mx: "auto" }}
      />
      {children}
    </Box>
  );
}
