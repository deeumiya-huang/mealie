/** Leading-edge throttle: at most one call per `ms` (vueuse useThrottleFn default behaviour). */
export function throttle<A extends unknown[]>(fn: (...args: A) => unknown, ms: number): (...args: A) => void {
  let last = 0;
  let trailing: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      last = now;
      void fn(...args);
    }
    else if (!trailing) {
      trailing = setTimeout(() => {
        trailing = null;
        last = Date.now();
        void fn(...args);
      }, remaining);
    }
  };
}

export function debounce<A extends unknown[]>(fn: (...args: A) => unknown, ms: number): ((...args: A) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void fn(...args);
    }, ms);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}
