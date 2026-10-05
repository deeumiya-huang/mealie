// Usage: <DropZone onDrop={files => …} onDropUrl={url => …} onDropUnsupported={() => …}>…content…</DropZone>
// Drop target for images: dropped files go to `onDrop`; an image dragged out of another tab (which carries a URL,
// not a file) goes to `onDropUrl` (http/https) or becomes a file for `onDrop` (base64 data: URLs); anything image-like
// that cannot be used (blob: URLs, …) calls `onDropUnsupported`. A drop with no image-like data does nothing.
import { useEffect, useRef, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { useI18n } from "@/i18n";

interface DropZoneProps {
  /** Accepted for parity with the Vue prop (unused there as well). */
  disabled?: boolean;
  onDrop?: (files: File[]) => void;
  onDropUrl?: (url: string) => void;
  onDropUnsupported?: () => void;
  children?: ReactNode;
}

/**
 * Pulls the src out of the first <img> in a drag payload.
 *
 * Deliberately not a general HTML parser: the input is markup the browser serialized for this
 * drag, and a miss simply falls through to text/uri-list. The leading \s is what keeps it from
 * matching `data-src` and similar attributes.
 */
const IMG_SRC = /<img\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/i;

function isHttpUrl(value: string) {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  }
  catch {
    return false;
  }
}

function isImageDataUrl(value: string) {
  return /^data:image\//i.test(value);
}

/**
 * Turns a base64 data: url into a file, so it can go through the ordinary upload path -- the
 * bytes are already here, and no server can fetch a data: url on our behalf.
 *
 * Only base64 payloads are handled; percent-encoded image data urls are vanishingly rare.
 */
function fileFromDataUrl(value: string) {
  const match = /^data:(image\/[\w.+-]+);base64,(.*)$/i.exec(value);
  if (!match) {
    return null;
  }

  const [, type, base64] = match;

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // "image/svg+xml" would give "svg+xml"; the server rejects that, but the extension it
    // reads off the name should still look like an extension.
    const extension = type.slice("image/".length).replace(/\+.*$/, "");
    return new File([bytes], `image.${extension}`, { type });
  }
  catch {
    return null;
  }
}

/**
 * An image dragged out of another browser tab carries a URL rather than a file, so there is
 * nothing to upload directly. Find the best candidate so the caller can act on it.
 */
function imageSourceFrom(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) {
    return null;
  }

  // text/uri-list describes whatever was dragged, which for an image inside a link (Google
  // Images, product grids) is the link rather than the picture -- so the markup's <img> wins.
  const candidates = [
    dataTransfer.getData("text/html").match(IMG_SRC)?.[1],
    // The list may hold several URLs, and lines beginning with "#" are comments.
    ...dataTransfer.getData("text/uri-list").split("\n"),
  ]
    .map(value => value?.trim())
    .filter((value): value is string => !!value && !value.startsWith("#"))
    // Attribute values arrive HTML-escaped, and a thumbnail URL's query string is full of `&`.
    .map(value => value.replace(/&amp;/g, "&"));

  const usable = candidates.find(value => isHttpUrl(value) || isImageDataUrl(value));

  // Falling back to the first candidate lets the caller tell "nothing was dropped" apart from
  // "something was dropped that we cannot use".
  return usable ?? candidates[0] ?? null;
}

export function DropZone({ onDrop, onDropUrl, onDropUnsupported, children }: DropZoneProps) {
  const { t } = useI18n();
  const el = useRef<HTMLDivElement | null>(null);
  const [isOverDropZone, setIsOverDropZone] = useState(false);

  const handlers = useRef({ onDrop, onDropUrl, onDropUnsupported });
  useEffect(() => {
    handlers.current = { onDrop, onDropUrl, onDropUnsupported };
  });

  useEffect(() => {
    const target = el.current;
    if (!target) return;

    // Port of VueUse `useDropZone`: a counter keeps nested enter/leave pairs from flickering `isOverDropZone`.
    let counter = 0;

    function handleDrop(files: File[] | null, event: DragEvent) {
      const { onDrop: emitDrop, onDropUrl: emitDropUrl, onDropUnsupported: emitUnsupported } = handlers.current;

      if (files?.length) {
        emitDrop?.(files);
        return;
      }

      const source = imageSourceFrom(event.dataTransfer);
      if (!source) {
        return;
      }

      if (isHttpUrl(source)) {
        emitDropUrl?.(source);
        return;
      }

      if (isImageDataUrl(source)) {
        const file = fileFromDataUrl(source);
        if (file) {
          emitDrop?.([file]);
          return;
        }
      }

      // Usually a blob: url. Those resolve only inside the origin that created them, so neither
      // this page nor the server can read the bytes -- say so rather than doing nothing.
      emitUnsupported?.();
    }

    function handleEvent(event: DragEvent, kind: "enter" | "over" | "leave" | "drop") {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }

      switch (kind) {
        case "enter":
          counter += 1;
          setIsOverDropZone(true);
          break;
        case "over":
          break;
        case "leave":
          counter -= 1;
          if (counter === 0) setIsOverDropZone(false);
          break;
        case "drop": {
          counter = 0;
          setIsOverDropZone(false);
          const dropped = Array.from(event.dataTransfer?.files ?? []);
          handleDrop(dropped.length === 0 ? null : dropped, event);
          break;
        }
      }
    }

    const onEnter = (event: DragEvent) => handleEvent(event, "enter");
    const onOver = (event: DragEvent) => handleEvent(event, "over");
    const onLeave = (event: DragEvent) => handleEvent(event, "leave");
    const onDropEvent = (event: DragEvent) => handleEvent(event, "drop");

    target.addEventListener("dragenter", onEnter);
    target.addEventListener("dragover", onOver);
    target.addEventListener("dragleave", onLeave);
    target.addEventListener("drop", onDropEvent);

    return () => {
      target.removeEventListener("dragenter", onEnter);
      target.removeEventListener("dragover", onOver);
      target.removeEventListener("dragleave", onLeave);
      target.removeEventListener("drop", onDropEvent);
    };
  }, []);

  return (
    <div ref={el} style={isOverDropZone ? { backgroundColor: "#f0f0f0" } : undefined}>
      {isOverDropZone && (
        <Box sx={{ position: "absolute", filter: "blur(2px)", top: 0, left: 0, right: 0, bottom: 0, bgcolor: "rgba(0, 0, 0, 0.309)" }} />
      )}
      {isOverDropZone && (
        <Box sx={{ zIndex: 10, position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <p style={{ textAlign: "center", color: "white", fontSize: "1.5rem", fontWeight: "bold" }}>
            {t("recipe.drop-image")}
          </p>
        </Box>
      )}
      {children}
    </div>
  );
}
