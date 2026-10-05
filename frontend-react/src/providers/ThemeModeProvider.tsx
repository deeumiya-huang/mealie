import { Suspense, use, useMemo, type ReactNode } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useColorMode } from "./color-mode";
import { buildTheme, fetchTheme } from "./theme";

// Usage: <ThemeModeProvider>{app}</ThemeModeProvider> — MUI theme with the server's colours
// (plugins/theme.ts) in light or dark mode (plugins/dark-mode.client.ts). Toggle with useColorMode().

function ThemedApp({ children }: { children: ReactNode }) {
  const config = use(fetchTheme());
  const { isDark } = useColorMode();
  const theme = useMemo(() => buildTheme(isDark, config), [isDark, config]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ThemedApp>{children}</ThemedApp>
    </Suspense>
  );
}
