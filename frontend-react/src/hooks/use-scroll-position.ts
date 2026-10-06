import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router";

const scrollPositions = new Map<string, number>();
const pagePositions = new Map<string, number>();

export function useScrollPosition() {
  const { pathname } = useLocation();

  const observer = useRef<MutationObserver | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savePosition = useCallback((path: string, page: number) => {
    scrollPositions.set(path, document.documentElement.scrollTop);
    pagePositions.set(path, page);
  }, []);

  const getSavedPage = useCallback((path: string): number | undefined => {
    return pagePositions.get(path);
  }, []);

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

    observer.current.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }, []);

  // Vue: `router.beforeEach((to, from) => scrollPositions.set(from.path, scrollTop))`. The router
  // hook sees the position just before leaving; here the position of the current path is kept up to
  // date while it is shown, which is the same value at the moment of navigation.
  useEffect(() => {
    const remember = () => {
      scrollPositions.set(pathname, document.documentElement.scrollTop);
    };
    window.addEventListener("scroll", remember, { passive: true });
    return () => {
      window.removeEventListener("scroll", remember);
    };
  }, [pathname]);

  useEffect(() => {
    const currentObserver = observer;
    const currentTimeout = timeout;
    const currentFallback = fallback;
    return () => {
      currentObserver.current?.disconnect();
      if (currentTimeout.current) clearTimeout(currentTimeout.current);
      if (currentFallback.current) clearTimeout(currentFallback.current);
    };
  }, []);

  return {
    savePosition,
    getSavedPage,
    restorePosition,
  };
}
