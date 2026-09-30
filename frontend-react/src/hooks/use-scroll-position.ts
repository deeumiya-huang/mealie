import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router";

const scrollPositions = new Map<string, number>();
const pagePositions = new Map<string, number>();

/**
 * Remembers scroll position and loaded page count per path, so returning to an infinite-scroll list
 * restores where the user was. (The Vue version saved on router.beforeEach; here the last scroll
 * position seen while mounted is saved on unmount.)
 */
export function useScrollPosition() {
  const location = useLocation();
  const lastScrollTop = useRef(0);
  const observer = useRef<MutationObserver | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const path = location.pathname;
    const onScroll = () => {
      lastScrollTop.current = document.documentElement.scrollTop;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      scrollPositions.set(path, lastScrollTop.current);
      observer.current?.disconnect();
      if (timeout.current) clearTimeout(timeout.current);
      if (fallback.current) clearTimeout(fallback.current);
    };
  }, [location.pathname]);

  const savePosition = useCallback((path: string, page: number) => {
    scrollPositions.set(path, document.documentElement.scrollTop);
    pagePositions.set(path, page);
  }, []);

  const getSavedPage = useCallback((path: string): number | undefined => pagePositions.get(path), []);

  const restorePosition = useCallback((path: string) => {
    const savedPosition = scrollPositions.get(path);
    if (!savedPosition) return;

    observer.current?.disconnect();
    if (timeout.current) clearTimeout(timeout.current);
    if (fallback.current) clearTimeout(fallback.current);

    fallback.current = setTimeout(() => {
      if (timeout.current) clearTimeout(timeout.current);
      observer.current?.disconnect();
      document.documentElement.scrollTop = savedPosition;
    }, 500);

    observer.current = new MutationObserver(() => {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        if (fallback.current) clearTimeout(fallback.current);
        observer.current?.disconnect();
        document.documentElement.scrollTop = savedPosition;
      }, 100);
    });
    observer.current.observe(document.body, { childList: true, subtree: true });
  }, []);

  return { savePosition, getSavedPage, restorePosition };
}
