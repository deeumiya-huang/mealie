import { useEffect, useMemo, useState } from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import * as dateLocales from "date-fns/locale";
import type { Locale } from "date-fns";
import { I18nextProvider } from "react-i18next";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { currentLocale, i18n, localeDirection } from "~/i18n";
import { setNavigator } from "~/lib/navigation";
import { useStore } from "~/lib/store";
import { colorSchemeStore } from "~/theme/color-scheme";
import { createMealieTheme } from "~/theme/theme";
import type { ThemeConfig } from "~/theme/theme";
import { useHouseholdSelf } from "~/hooks/use-households";
import { globalStyles } from "./global-styles";
import { buildRoutes } from "./routes";

const ltrCache = createCache({ key: "mui" });
const rtlCache = createCache({ key: "muirtl", stylisPlugins: [prefixer, rtlPlugin] });

function dateFnsLocale(code: string): Locale {
  const all = dateLocales as unknown as Record<string, Locale>;
  const [lang, region] = code.split("-");
  return all[`${lang}${region}`] ?? all[lang ?? ""] ?? dateLocales.enUS;
}

function useLocaleCode(): string {
  const [code, setCode] = useState(currentLocale());
  useEffect(() => {
    const update = () => setCode(currentLocale());
    i18n.on("languageChanged", update);
    return () => i18n.off("languageChanged", update);
  }, []);
  return code;
}

function DatePickerProvider({ localeCode, children }: { localeCode: string; children: React.ReactNode }) {
  // Vuetify's date picker took the household's first day of week.
  const { household } = useHouseholdSelf();
  const firstDay = household?.preferences?.firstDayOfWeek ?? 0;
  const locale = useMemo<Locale>(() => {
    const base = dateFnsLocale(localeCode);
    return { ...base, options: { ...base.options, weekStartsOn: firstDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 } };
  }, [localeCode, firstDay]);
  return <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>{children}</LocalizationProvider>;
}

export function App({ themeConfig }: { themeConfig: ThemeConfig | undefined }) {
  const mode = useStore(colorSchemeStore);
  const localeCode = useLocaleCode();
  const direction = localeDirection(localeCode);
  const theme = useMemo(() => createMealieTheme(mode, themeConfig, direction, localeCode), [mode, themeConfig, direction, localeCode]);

  const router = useMemo(() => {
    const r = createBrowserRouter(buildRoutes(), { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" });
    setNavigator((to, options) => r.navigate(to, options));
    return r;
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <CacheProvider value={direction === "rtl" ? rtlCache : ltrCache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles styles={globalStyles} />
          <DatePickerProvider localeCode={localeCode}>
            <RouterProvider router={router} />
          </DatePickerProvider>
        </ThemeProvider>
      </CacheProvider>
    </I18nextProvider>
  );
}

export default App;
