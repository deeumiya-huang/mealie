import { Component, Suspense, use, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { loadAppInfo } from "./app-info";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

// Usage: <AppInfoProvider>{app}</AppInfoProvider> — children render once /api/app/about has loaded,
// like the Nuxt plugin that blocks the app until it resolves. Read it with useAppInfo().
// If the request fails, an error view replaces the app (Nuxt showed its fatal error page); reloading retries.

function AppInfoGate({ children }: { children: ReactNode }) {
  use(loadAppInfo());
  return children;
}

function AppInfoError({ error }: { error: unknown }) {
  const { t } = useI18n();
  return (
    <Box role="alert" sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 10, px: 2 }}>
      <MdiIcon path={icons.alertCircle} sx={{ fontSize: 64 }} color="error" />
      <Typography component="h1" variant="h5">{t("page.an-error-occurred")}</Typography>
      {error instanceof Error ? <Typography color="text.secondary">{error.message}</Typography> : null}
    </Box>
  );
}

class AppInfoErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: undefined as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error: error ?? new Error(String(error)) };
  }

  render() {
    return this.state.error === undefined ? this.props.children : <AppInfoError error={this.state.error} />;
  }
}

export function AppInfoProvider({ children }: { children: ReactNode }) {
  return (
    <AppInfoErrorBoundary>
      <Suspense fallback={null}>
        <AppInfoGate>{children}</AppInfoGate>
      </Suspense>
    </AppInfoErrorBoundary>
  );
}
