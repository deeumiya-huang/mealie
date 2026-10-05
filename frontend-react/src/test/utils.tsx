import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router";
import enUS from "@locales/messages/en-US.json";
import unitNames from "@unit-locales/en-US.json";
import { createDateFormat, createTranslate } from "@/i18n/compat";
import { getDateTimeFormats } from "@/i18n/locales";
import type { GlobalI18n } from "@/i18n";
import { buildTheme } from "@/providers/theme";

/** en-US messages merged like frontend/app/lang/locales/en-US.ts (unit names included). */
export function loadEnLocales(): Record<string, unknown> {
  return { ...enUS, "unit-names": unitNames };
}

function lookup(messages: Record<string, unknown>, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    node = typeof node === "object" && node !== null ? (node as Record<string, unknown>)[part] : undefined;
  }
  return typeof node === "string" ? node : undefined;
}

/** Port of app/tests/utils.ts `stubI18n()`: a standalone en-US translator with vue-i18n semantics. */
export function stubI18n(): GlobalI18n {
  const messages = loadEnLocales();
  const locales = () => ["en-US"];
  return {
    t: createTranslate((_locale, key) => lookup(messages, key), locales),
    d: createDateFormat(getDateTimeFormats, locales),
    locale: "en-US",
  };
}

interface ProviderOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial URL for the in-memory router (default "/"). */
  route?: string;
  dark?: boolean;
}

/**
 * Replaces `mount()` from @vue/test-utils for components: renders inside the MUI theme and a memory
 * router (the app-wide i18n is set up in setup.ts). Hooks are tested with `renderHook` directly
 * (the equivalent of `makeWrapper`).
 */
export function renderWithProviders(ui: ReactElement, { route = "/", dark = false, ...options }: ProviderOptions = {}) {
  const theme = buildTheme(dark);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </ThemeProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
