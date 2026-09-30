import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useI18n } from "~/hooks/use-global-i18n";

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

export interface DropZoneProps {
  disabled?: boolean;
  /** Files were dropped (or a data: url was converted to one). */
  onDrop?: (files: File[]) => void;
  /** An http(s) image url was dropped (e.g. dragged out of another tab). */
  onDropUrl?: (url: string) => void;
  /** Something image-like was dropped that cannot be read (e.g. a blob: url). */
  onDropUnsupported?: () => void;
  children?: ReactNode;
}

/** Drop target for images; replaces @vueuse/core's useDropZone. */
export function DropZone({ onDrop, onDropUrl, onDropUnsupported, children }: DropZoneProps) {
  const i18n = useI18n();
  const el = useRef<HTMLDivElement>(null);
  const [isOverDropZone, setOver] = useState(false);
  const handlers = useRef({ onDrop, onDropUrl, onDropUnsupported });
  handlers.current = { onDrop, onDropUrl, onDropUnsupported };

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let counter = 0;

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      counter = 0;
      setOver(false);

      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length) {
        handlers.current.onDrop?.(files);
        return;
      }

      const source = imageSourceFrom(event.dataTransfer);
      if (!source) {
        return;
      }

      if (isHttpUrl(source)) {
        handlers.current.onDropUrl?.(source);
        return;
      }

      if (isImageDataUrl(source)) {
        const file = fileFromDataUrl(source);
        if (file) {
          handlers.current.onDrop?.([file]);
          return;
        }
      }

      // Usually a blob: url. Those resolve only inside the origin that created them, so neither
      // this page nor the server can read the bytes -- say so rather than doing nothing.
      handlers.current.onDropUnsupported?.();
    };
    const enter = (e: DragEvent) => {
      e.preventDefault();
      counter++;
      setOver(true);
    };
    const over = (e: DragEvent) => e.preventDefault();
    const leave = () => {
      counter = Math.max(0, counter - 1);
      if (counter === 0) setOver(false);
    };

    node.addEventListener("drop", handleDrop);
    node.addEventListener("dragenter", enter);
    node.addEventListener("dragover", over);
    node.addEventListener("dragleave", leave);
    return () => {
      node.removeEventListener("drop", handleDrop);
      node.removeEventListener("dragenter", enter);
      node.removeEventListener("dragover", over);
      node.removeEventListener("dragleave", leave);
    };
  }, []);

  return (
    <Box ref={el} sx={isOverDropZone ? { bgcolor: "#f0f0f0", position: "relative" } : { position: "relative" }}>
      {isOverDropZone && (
        <>
          <Box sx={{ position: "absolute", filter: "blur(2px)", inset: 0, bgcolor: "rgba(0, 0, 0, 0.309)" }} />
          <Box sx={{ zIndex: 10, position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <p style={{ textAlign: "center", color: "white", fontSize: "1.5rem", fontWeight: "bold" }}>
              {i18n.t("recipe.drop-image")}
            </p>
          </Box>
        </>
      )}
      {children}
    </Box>
  );
}

export default DropZone;
