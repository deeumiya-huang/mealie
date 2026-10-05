import { Suspense, use, type ReactNode } from "react";
import { initI18n } from "@/i18n";

// Usage: <I18nProvider>{app}</I18nProvider> — children render once the en-US fallback and the detected
// locale (cookie `i18n_redirected` → browser language → en-US) are loaded, like @nuxtjs/i18n before the
// first page. Translate with useI18n() from "@/i18n".

function I18nGate({ children }: { children: ReactNode }) {
  use(initI18n());
  return children;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <I18nGate>{children}</I18nGate>
    </Suspense>
  );
}
