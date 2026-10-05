import { useEffect } from "react";

const DEFAULT_TITLE = "Mealie";

/**
 * Port of `useSeoMeta({ title })` / `useHead({ title })`: sets `document.title` while mounted.
 * The Vue app has no title template, so the title is used as is; without one it falls back to the
 * `nuxt.config` head title "Mealie".
 */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    const previous = document.title;
    document.title = title || DEFAULT_TITLE;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
