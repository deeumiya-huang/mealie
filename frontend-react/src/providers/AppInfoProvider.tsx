import { Suspense, use, type ReactNode } from "react";
import { loadAppInfo } from "./app-info";

// Usage: <AppInfoProvider>{app}</AppInfoProvider> — children render once /api/app/about has loaded,
// like the Nuxt plugin that blocks the app until it resolves. Read it with useAppInfo().

function AppInfoGate({ children }: { children: ReactNode }) {
  use(loadAppInfo());
  return children;
}

export function AppInfoProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppInfoGate>{children}</AppInfoGate>
    </Suspense>
  );
}
