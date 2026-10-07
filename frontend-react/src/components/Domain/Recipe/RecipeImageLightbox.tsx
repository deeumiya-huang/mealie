// Usage: {open && <RecipeImageLightbox open={open} onOpenChange={setOpen} imageUrl={url} imageAlt={name} />} — a
// fullscreen image viewer: click the image to zoom ×2 (drag to pan while zoomed), click the backdrop or the close
// button to leave. (Vue `v-model` → `open` + `onOpenChange`.)
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type SyntheticEvent } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import Fade from "@mui/material/Fade";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface RecipeImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string;
  imageAlt?: string;
}

const ZOOM_SCALE = 2;

interface Size {
  w: number;
  h: number;
}

export function RecipeImageLightbox({ open, onOpenChange, imageUrl, imageAlt }: RecipeImageLightboxProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const scrimColor = isDark ? "rgba(0, 0, 0, 0.75)" : "rgba(255, 255, 255, 0.75)";

  const imageShadow = isDark
    ? "0 0 24px rgba(255, 255, 255, 0.45), 0 0 140px rgba(255, 255, 255, 0.45)"
    : "0 6px 16px rgba(0, 0, 0, 0.55), 0 18px 80px rgba(0, 0, 0, 0.7)";

  // The <img> box must be sized to the actual rendered pixels of the image (not the
  // frame's bounding box) so the box-shadow/glow hugs the photo's real edges rather
  // than the invisible letterboxed area object-fit:contain would otherwise leave.
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frameSize, setFrameSize] = useState<Size>({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState<Size>({ w: 0, h: 0 });

  function updateFrameSize() {
    if (frameRef.current) {
      setFrameSize({ w: frameRef.current.clientWidth, h: frameRef.current.clientHeight });
    }
  }

  function onImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    updateFrameSize();
  }

  useEffect(() => {
    function onResize() {
      if (frameRef.current) {
        setFrameSize({ w: frameRef.current.clientWidth, h: frameRef.current.clientHeight });
      }
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const renderedSize = !naturalSize.w || !naturalSize.h || !frameSize.w || !frameSize.h
    ? null
    : (() => {
        const scale = Math.min(frameSize.w / naturalSize.w, frameSize.h / naturalSize.h);
        return { width: naturalSize.w * scale, height: naturalSize.h * scale };
      })();

  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragMoved = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Keep the zoomed image overlapping its frame: at most half the overhang in each
  // direction, so it can never be dragged completely out of view.
  function applyPan(x: number, y: number) {
    const limitX = renderedSize
      ? Math.max(0, (renderedSize.width * ZOOM_SCALE - frameSize.w) / 2)
      : 0;
    const limitY = renderedSize
      ? Math.max(0, (renderedSize.height * ZOOM_SCALE - frameSize.h) / 2)
      : 0;

    setPan({
      x: Math.min(Math.max(x, -limitX), limitX),
      y: Math.min(Math.max(y, -limitY), limitY),
    });
  }

  function resetZoom() {
    setZoomed(false);
    setPan({ x: 0, y: 0 });
  }

  function close() {
    // Vue: watch(model, open => !open && resetZoom())
    resetZoom();
    onOpenChange(false);
  }

  function onBackgroundClick() {
    close();
  }

  function onImageClick(event: MouseEvent<HTMLImageElement>) {
    event.stopPropagation();
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }
    if (zoomed) {
      resetZoom();
    }
    else {
      setZoomed(true);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLImageElement>) {
    event.stopPropagation();
    if (!zoomed) {
      return;
    }
    setDragging(true);
    dragMoved.current = false;
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLImageElement>) {
    if (!dragging) {
      return;
    }
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragMoved.current = true;
    }
    applyPan(dragStart.current.panX + dx, dragStart.current.panY + dy);
  }

  function onPointerUp(event: PointerEvent<HTMLImageElement>) {
    event.stopPropagation();
    setDragging(false);
  }

  const imgStyle = {
    ...(renderedSize
      ? { width: `${renderedSize.width}px`, height: `${renderedSize.height}px` }
      : {}),
    boxShadow: imageShadow,
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomed ? ZOOM_SCALE : 1})`,
    transition: dragging ? "none" : "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: zoomed ? "zoom-out" : "zoom-in",
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullScreen
      slots={{ transition: Fade }}
      slotProps={{
        paper: { sx: { background: "transparent", boxShadow: "none" } },
        backdrop: { sx: { background: "transparent" } },
      }}
    >
      <Box
        className="lightbox-content"
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          height: "100vh",
          cursor: "zoom-out",
          transition: "background-color 0.2s ease",
          overflow: "hidden",
          backgroundColor: scrimColor,
        }}
        onClick={onBackgroundClick}
      >
        <Box
          ref={frameRef}
          className="lightbox-frame"
          sx={{ width: "90vw", height: "90vh", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {imageUrl && (
            <Box
              component="img"
              src={imageUrl}
              alt={imageAlt}
              className="lightbox-img"
              draggable={false}
              sx={{ maxWidth: "100%", maxHeight: "100%", display: "block", touchAction: "none", userSelect: "none" }}
              style={imgStyle}
              onLoad={onImageLoad}
              onClick={onImageClick}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          )}
        </Box>
        <IconButton
          className="lightbox-close"
          aria-label={t("general.close")}
          sx={{ position: "absolute", top: 12, right: 12 }}
          onClick={(event) => {
            event.stopPropagation();
            close();
          }}
        >
          <MdiIcon path={icons.close} />
        </IconButton>
      </Box>
    </Dialog>
  );
}
