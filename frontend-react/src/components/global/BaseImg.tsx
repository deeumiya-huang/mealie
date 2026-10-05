// Usage: <BaseImg src={url} alt={name} aspectRatio={16 / 9} cover height={200} fallback={<MdiIcon …/>} onError={…} />
// Replacement for <v-img>: an <img> filling a box (object-fit cover/contain), optional aspect ratio and
// size limits; on a load error shows `fallback` (Vue `#error` slot) instead. `children` overlay the image.
import { useState, type ReactNode, type SyntheticEvent } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import { cssSize } from "./colors";

type Size = number | string;

interface BaseImgProps {
  src?: string | null;
  alt?: string;
  cover?: boolean;
  aspectRatio?: number | string;
  width?: Size;
  height?: Size;
  maxWidth?: Size;
  maxHeight?: Size;
  minHeight?: Size;
  fallback?: ReactNode;
  children?: ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
  onClick?: () => void;
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: SyntheticEvent<HTMLImageElement>) => void;
}

export function BaseImg({
  src, alt = "", cover = false, aspectRatio, width, height, maxWidth, maxHeight, minHeight,
  fallback, children, className, sx, onClick, onLoad, onError,
}: BaseImgProps) {
  // remember which src failed, so a new src is tried again
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !!src && failedSrc === src;

  return (
    <Box
      className={className}
      onClick={onClick}
      sx={[
        {
          position: "relative",
          overflow: "hidden",
          width: cssSize(width),
          height: cssSize(height),
          maxWidth: cssSize(maxWidth) ?? "100%",
          maxHeight: cssSize(maxHeight),
          minHeight: cssSize(minHeight),
          aspectRatio: aspectRatio === undefined ? undefined : String(aspectRatio),
          cursor: onClick ? "pointer" : undefined,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {src && !failed
        ? (
            <Box
              component="img"
              src={src}
              alt={alt}
              onLoad={onLoad}
              onError={(event: SyntheticEvent<HTMLImageElement>) => {
                setFailedSrc(src);
                onError?.(event);
              }}
              sx={{
                display: "block",
                width: "100%",
                height: height !== undefined || aspectRatio !== undefined ? "100%" : "auto",
                maxHeight: cssSize(maxHeight),
                objectFit: cover ? "cover" : "contain",
              }}
            />
          )
        : fallback}
      {children && <Box sx={{ position: "absolute", inset: 0 }}>{children}</Box>}
    </Box>
  );
}
