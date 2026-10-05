/**
 * Port of composables/use-clear-composable-caches.ts. In Vue this imported every composable that
 * keeps module-level state and called its reset; here each such module registers its reset when it
 * is first imported (a module that was never imported holds no state), which keeps this file free
 * of a dependency on every feature module.
 *
 *   registerCacheReset(resetGroupSelf);     // at module scope in hooks/use-groups.ts
 */
const resets = new Set<() => void>();

export function registerCacheReset(reset: () => void) {
  resets.add(reset);
}

export function clearComposableCaches() {
  resets.forEach(reset => reset());
}
