import type { ReactNode } from "react";
import { render, renderHook } from "@testing-library/react";
import type { RenderHookOptions } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router";
import { getGlobalI18n } from "~/hooks/use-global-i18n";
import type { I18nComposer } from "~/hooks/use-global-i18n";
import { createMealieTheme } from "~/theme/theme";
import { isRef } from "~/lib/observable";
import type { ReadonlyRef } from "~/lib/observable";

/** en-US i18n composer (vue-i18n's `createI18n(...).global` in the Vue tests). */
export function stubI18n(): I18nComposer {
  return getGlobalI18n();
}

const theme = createMealieTheme("light", undefined, "ltr");

export function Providers({ children, initialEntries = ["/"] }: { children: ReactNode; initialEntries?: string[] }) {
  return (
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </ThemeProvider>
  );
}

export function renderWithProviders(ui: ReactNode, options?: { initialEntries?: string[] }) {
  return render(<Providers initialEntries={options?.initialEntries}>{ui}</Providers>);
}

/** Mounts a hook inside the app providers (`makeWrapper` in the Vue tests). */
export function renderHookWithProviders<R, P>(hook: (props: P) => R, options?: RenderHookOptions<P>) {
  return renderHook(hook, { wrapper: ({ children }) => <Providers>{children}</Providers>, ...options });
}

type UnwrapRefs<T> = { [K in keyof T]: T[K] extends ReadonlyRef<infer V> ? V : T[K] };

/**
 * Runs a controller's setup function. The Vue tests mounted a throwaway component so composables
 * had a setup context and returned its `vm`, which unwraps top-level refs; the React controllers
 * are plain functions, so this calls `setup` and unwraps the returned refs the same way.
 */
export function makeWrapper<T extends object>(setup: () => T): UnwrapRefs<T> {
  const state = setup();
  return new Proxy(state, {
    get(obj, key) {
      const val: unknown = Reflect.get(obj, key);
      return isRef(val) ? val.value : val;
    },
    set(obj, key, next) {
      const val: unknown = Reflect.get(obj, key);
      if (isRef(val)) val.value = next;
      else Reflect.set(obj, key, next);
      return true;
    },
  }) as UnwrapRefs<T>;
}
