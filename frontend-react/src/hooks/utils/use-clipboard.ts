import { useCallback, useEffect, useRef, useState } from "react";

function legacyCopy(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "absolute";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

/**
 * Port of VueUse `useClipboard({ legacy: true })`: `copy(text)`, `copied` for `copiedDuring` ms,
 * `isSupported` (always true with the execCommand fallback, like `legacy: true`).
 */
export function useClipboard({ copiedDuring = 1500 }: { copiedDuring?: number } = {}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      }
      else {
        legacyCopy(text);
      }
    }
    catch {
      legacyCopy(text);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), copiedDuring);
  }, [copiedDuring]);

  return { copy, copied, isSupported: true };
}
