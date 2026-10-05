import { useCallback, useEffect, useRef, useState } from "react";

/** Port of VueUse `refDebounced` / `watchDebounced` source: the value, settled for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Port of VueUse `useDebounceFn`: a stable function that runs `fn` once calls stop for `delay` ms. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number, maxWait?: number) {
  const fnRef = useRef(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstCall = useRef<number | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return useCallback((...args: A) => {
    const now = Date.now();
    firstCall.current ??= now;
    if (timer.current) clearTimeout(timer.current);

    const run = () => {
      timer.current = null;
      firstCall.current = null;
      fnRef.current(...args);
    };

    if (maxWait !== undefined && now - firstCall.current >= maxWait) {
      run();
      return;
    }
    timer.current = setTimeout(run, delay);
  }, [delay, maxWait]);
}

/** Port of VueUse `useThrottleFn` (leading + trailing call). */
export function useThrottledCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  const fnRef = useRef(fn);
  const last = useRef(0);
  const trailing = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => () => {
    if (trailing.current) clearTimeout(trailing.current);
  }, []);

  return useCallback((...args: A) => {
    const elapsed = Date.now() - last.current;
    if (trailing.current) clearTimeout(trailing.current);
    if (elapsed >= delay) {
      last.current = Date.now();
      fnRef.current(...args);
    }
    else {
      trailing.current = setTimeout(() => {
        last.current = Date.now();
        trailing.current = null;
        fnRef.current(...args);
      }, delay - elapsed);
    }
  }, [delay]);
}
