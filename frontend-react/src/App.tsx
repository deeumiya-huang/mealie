import { useState } from "react";
import { RouterProvider } from "react-router";
import { createRouter } from "@/routes";

// Providers wrap the router, outermost first (PROCESS.md §1.7):
// AppInfoProvider → ThemeModeProvider → I18nProvider → ToastProvider → RouterProvider.
export default function App() {
  const [router] = useState(createRouter);
  return <RouterProvider router={router} />;
}
