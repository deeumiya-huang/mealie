/**
 * Replaces @vueuse/core's `useClipboard({ legacy: true })`: the async Clipboard API when available,
 * otherwise a hidden textarea + execCommand("copy").
 */
export function isClipboardSupported(): boolean {
  return typeof navigator !== "undefined" && (!!navigator.clipboard || typeof document.execCommand === "function");
}

function legacyCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "absolute";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  }
  catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/** Resolves true when the text reached the clipboard. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    }
    catch {
      return legacyCopy(text);
    }
  }
  return legacyCopy(text);
}
