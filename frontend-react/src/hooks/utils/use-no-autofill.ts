import { useCallback, useRef } from "react";

/**
 * Port of the `v-no-autofill` directive (plugins/no-autofill.client.ts): stops password managers
 * from autofilling every <input> inside the element, including ones rendered later (dialogs,
 * conditional blocks).
 *
 *   const noAutofill = useNoAutofill();
 *   <form ref={noAutofill}>…</form>
 */
function patchInput(input: HTMLInputElement) {
  input.setAttribute("autocomplete", "off");
  input.setAttribute("data-1p-ignore", "true");
  input.setAttribute("data-lpignore", "true");
  input.setAttribute("data-protonpass-ignore", "true");
  input.setAttribute("data-bwignore", "true");
  input.setAttribute("data-form-type", "other");
}

function patchAll(el: HTMLElement) {
  if (el.tagName === "INPUT") {
    patchInput(el as HTMLInputElement);
  }
  el.querySelectorAll<HTMLInputElement>("input").forEach(patchInput);
}

export function useNoAutofill<T extends HTMLElement = HTMLElement>() {
  const observer = useRef<MutationObserver | null>(null);

  return useCallback((el: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) {
      return;
    }

    patchAll(el);
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            patchAll(node as HTMLElement);
          }
        }
      }
    });
    mutationObserver.observe(el, { childList: true, subtree: true });
    observer.current = mutationObserver;
  }, []);
}
