import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { setNavigate } from "@/lib/navigation";
import { AppInfoProvider } from "@/providers/AppInfoProvider";
import { I18nProvider } from "@/providers/I18nProvider";
import { ThemeModeProvider } from "@/providers/ThemeModeProvider";
import { createRouter } from "@/routes";

// Providers wrap the router, outermost first (PROCESS.md §1.7):
// AppInfoProvider → ThemeModeProvider → I18nProvider → RouterProvider.
// Toasts are module-level stores (hooks/use-toast) rendered by TheSnackbar in the layouts.
export default function App() {
  const [router] = useState(createRouter);

  useEffect(() => {
    setNavigate((to, options) => router.navigate(to, options));
    return () => setNavigate(null);
  }, [router]);

  return (
    <AppInfoProvider>
      <ThemeModeProvider>
        <I18nProvider>
          <RouterProvider router={router} />
        </I18nProvider>
      </ThemeModeProvider>
    </AppInfoProvider>
  );
}
