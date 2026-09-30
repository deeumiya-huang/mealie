import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { useDark } from "~/theme/color-scheme";
import { Icon } from "~/components/global/Icon";

const ZOOM_SCALE = 2;

export interface RecipeImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string;
  imageAlt?: string;
}

/** Fullscreen image viewer: click to zoom 2x, drag to pan while zoomed, click outside to close. */
export function RecipeImageLightbox({ open, onOpenChange, imageUrl, imageAlt }: RecipeImageLightboxProps) {
  const i18n = useI18n();
  const [isDark] = useDark();
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragMoved = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const scrimColor = isDark ? "rgba(0, 0, 0, 0.75)" : "rgba(255, 255, 255, 0.75)";
  const imageShadow = isDark
    ? "0 0 24px rgba(255, 255, 255, 0.45), 0 0 140px rgba(255, 255, 255, 0.45)"
    : "0 6px 16px rgba(0, 0, 0, 0.55), 0 18px 80px rgba(0, 0, 0, 0.7)";

  function updateFrameSize() {
    if (frameRef.current) setFrameSize({ w: frameRef.current.clientWidth, h: frameRef.current.clientHeight });
  }

  useEffect(() => {
    window.addEventListener("resize", updateFrameSize);
    return () => window.removeEventListener("resize", updateFrameSize);
  }, []);

  useEffect(() => {
    if (!open) {
      setZoomed(false);
      setPan({ x: 0, y: 0 });
    }
  }, [open]);

  // The <img> box is sized to the rendered pixels of the image so the shadow hugs the photo.
  const renderedSize = naturalSize.w && naturalSize.h && frameSize.w && frameSize.h
    ? (() => {
        const scale = Math.min(frameSize.w / naturalSize.w, frameSize.h / naturalSize.h);
        return { width: naturalSize.w * scale, height: naturalSize.h * scale };
      })()
    : null;

  // Keep the zoomed image overlapping its frame: at most half the overhang in each direction.
  function applyPan(x: number, y: number) {
    const limitX = renderedSize ? Math.max(0, (renderedSize.width * ZOOM_SCALE - frameSize.w) / 2) : 0;
    const limitY = renderedSize ? Math.max(0, (renderedSize.height * ZOOM_SCALE - frameSize.h) / 2) : 0;
    setPan({ x: Math.min(Math.max(x, -limitX), limitX), y: Math.min(Math.max(y, -limitY), limitY) });
  }

  function onPointerDown(event: ReactPointerEvent<HTMLImageElement>) {
    event.stopPropagation();
    if (!zoomed) return;
    setDragging(true);
    dragMoved.current = false;
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLImageElement>) {
    if (!dragging) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
    applyPan(dragStart.current.panX + dx, dragStart.current.panY + dy);
  }

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} fullScreen slotProps={{ paper: { sx: { bgcolor: "transparent", boxShadow: "none" } }, backdrop: { sx: { bgcolor: "transparent" } } }}>
      <Box
        sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100vw", height: "100vh", cursor: "zoom-out", transition: "background-color 0.2s ease", overflow: "hidden", bgcolor: scrimColor }}
        onClick={() => onOpenChange(false)}
      >
        <Box ref={frameRef} sx={{ width: "90vw", height: "90vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={imageAlt}
              draggable={false}
              onLoad={(e) => {
                setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
                updateFrameSize();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (dragMoved.current) {
                  dragMoved.current = false;
                  return;
                }
                if (zoomed) {
                  setZoomed(false);
                  setPan({ x: 0, y: 0 });
                }
                else {
                  setZoomed(true);
                }
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => {
                e.stopPropagation();
                setDragging(false);
              }}
              onPointerCancel={() => setDragging(false)}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                display: "block",
                touchAction: "none",
                userSelect: "none",
                ...(renderedSize ? { width: renderedSize.width, height: renderedSize.height } : {}),
                boxShadow: imageShadow,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomed ? ZOOM_SCALE : 1})`,
                transition: dragging ? "none" : "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: zoomed ? "zoom-out" : "zoom-in",
              }}
            />
          )}
        </Box>
        <IconButton
          aria-label={i18n.t("general.close")}
          sx={{ position: "absolute", top: 12, right: 12 }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
          }}
        >
          <Icon path={icons.close} />
        </IconButton>
      </Box>
    </Dialog>
  );
}

export default RecipeImageLightbox;
