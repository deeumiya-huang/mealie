import { useEffect } from "react";

/** Sets the document title (Nuxt `useSeoMeta({ title })`). */
export function useSeoMeta({ title }: { title?: string | null }) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);
}
