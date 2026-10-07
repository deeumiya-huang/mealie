import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { setNavigate } from "@/lib/navigation";
import { AppInfoProvider } from "@/providers/AppInfoProvider";
import { I18nProvider } from "@/providers/I18nProvider";
import { ThemeModeProvider } from "@/providers/ThemeModeProvider";
import { createRouter } from "@/routes";

// Providers wrap the router, outermost first (PROCESS.md §1.7; D52):
// ThemeModeProvider → I18nProvider → AppInfoProvider → RouterProvider. Theme and i18n do not need the app
// info, and this order lets AppInfoProvider show a themed, translated error when /api/app/about fails.
// main.tsx starts the three boot requests in parallel.
// Toasts are module-level stores (hooks/use-toast) rendered by TheSnackbar in the layouts.
export default function App() {
  const [router] = useState(createRouter);

  useEffect(() => {
    setNavigate((to, options) => router.navigate(to, options));
    return () => setNavigate(null);
  }, [router]);

  return (
    <ThemeModeProvider>
      <I18nProvider>
        <AppInfoProvider>
          <RouterProvider router={router} />
        </AppInfoProvider>
      </I18nProvider>
    </ThemeModeProvider>
  );
}
