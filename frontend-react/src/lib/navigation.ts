/**
 * Navigation from outside React components (auth module, interceptors) — the port of calling
 * `useRouter().push()` in a composable. App registers the data router's `navigate` on startup;
 * before that (or in plain scripts) it falls back to a full page load.
 */
export interface NavigateOptions {
  replace?: boolean;
}

type NavigateFn = (to: string, options?: NavigateOptions) => void | Promise<void>;

let navigateImpl: NavigateFn | null = null;

export function setNavigate(fn: NavigateFn | null) {
  navigateImpl = fn;
}

export async function navigateTo(to: string, options?: NavigateOptions) {
  if (navigateImpl) {
    await navigateImpl(to, options);
  }
  else if (options?.replace) {
    window.location.replace(to);
  }
  else {
    window.location.assign(to);
  }
}
