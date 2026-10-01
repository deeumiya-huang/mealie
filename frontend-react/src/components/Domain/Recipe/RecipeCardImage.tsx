import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { icons } from "~/lib/icons";
import { useStaticRoutes } from "~/hooks/api";
import { Icon } from "~/components/global/Icon";

export interface RecipeCardImageProps {
  tiny?: boolean | null;
  small?: boolean | null;
  large?: boolean | null;
  iconSize?: number | string;
  slug?: string | null;
  recipeId: string;
  /** Recipe.image is typed unknown in the generated API types. */
  imageVersion?: unknown;
  height?: number | string;
  width?: number | string;
  minHeight?: number | string;
  onClick?: () => void;
  children?: ReactNode;
}

function css(size: number | string | undefined) {
  return typeof size === "number" || (typeof size === "string" && /^\d+$/.test(size)) ? `${size}px` : size;
}

export function RecipeCardImage({
  tiny = null, small = null, large = null, iconSize = 100, recipeId, imageVersion = null, height = "100%", width, minHeight = 125, onClick, children,
}: RecipeCardImageProps) {
  const { recipeImage, recipeSmallImage, recipeTinyImage } = useStaticRoutes();
  const [fallBackImage, setFallBackImage] = useState(false);

  useEffect(() => {
    setFallBackImage(false);
  }, [recipeId, imageVersion]);

  // Recipes without an image have no image version, so there is nothing to fetch.
  const showImage = !!imageVersion && !fallBackImage;
  const size = tiny ? "tiny" : small ? "small" : large ? "large" : "large";
  const src = size === "tiny"
    ? recipeTinyImage(recipeId, imageVersion)
    : size === "small"
      ? recipeSmallImage(recipeId, imageVersion)
      : recipeImage(recipeId, imageVersion);

  if (showImage) {
    return (
      <Box
        onClick={onClick}
        sx={{ position: "relative", height: css(height), width: css(width), minHeight: css(minHeight), overflow: "hidden" }}
      >
        <img
          src={src}
          alt=""
          loading="lazy"
          onLoad={() => setFallBackImage(false)}
          onError={() => setFallBackImage(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "absolute", inset: 0 }}
        />
        {children && <Box sx={{ position: "relative", height: "100%" }}>{children}</Box>}
      </Box>
    );
  }

  return (
    <Box onClick={onClick} sx={{ "position": "relative", "width": css(width), "& > div": { top: 0, position: "absolute", zIndex: 1 } }}>
      <Icon
        path={icons.primary}
        color="primary"
        size={Number(iconSize)}
        sx={{ opacity: 0.8, display: "flex !important", position: "relative", mx: "auto !important" }}
      />
      {children}
    </Box>
  );
}

export default RecipeCardImage;
