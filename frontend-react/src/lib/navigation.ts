/**
 * Programmatic navigation for code that runs outside React components (auth backend, stores).
 * The router registers itself at startup; until then navigation falls back to a full page load.
 */
type Navigate = (to: string, options?: { replace?: boolean }) => void | Promise<void>;

let navigator: Navigate = (to) => {
  window.location.href = to;
};

export function setNavigator(fn: Navigate): void {
  navigator = fn;
}

export async function navigate(to: string, options?: { replace?: boolean }): Promise<void> {
  await navigator(to, options);
}
