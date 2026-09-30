import { useEffect, useRef } from "react";

/** Calls `onIntersect` whenever the sentinel scrolls into view (Vuetify's v-intersect). */
export function Intersect({ onIntersect, rootMargin = "0px" }: { onIntersect: () => void; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onIntersect);
  callback.current = onIntersect;

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) callback.current();
    }, { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return <div ref={ref} style={{ height: 1 }} />;
}

export default Intersect;
