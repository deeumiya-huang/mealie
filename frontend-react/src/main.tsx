import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "@/App";
import { initI18n } from "@/i18n";
import { loadAppInfo } from "@/providers/app-info";
import { fetchTheme } from "@/providers/theme";

// PWA client, as configured for @vite-pwa/nuxt in frontend/nuxt.config.ts: register the service worker
// right away (autoUpdate), check for a new version every 120 s, and keep the browser's install prompt
// for the app instead of showing it (`installPrompt: true`).
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => {
        if (navigator.onLine) void registration.update();
      }, 120 * 1000);
    }
  },
});
window.addEventListener("beforeinstallprompt", event => event.preventDefault());

// Start the boot requests together; the providers suspend on the same cached promises
// (a failed app info request is shown by AppInfoProvider).
void fetchTheme();
void initI18n();
loadAppInfo().catch(() => undefined);

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element in index.html");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
