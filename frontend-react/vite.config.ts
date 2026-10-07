import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Locale messages are imported (never copied) from the Vue app and the backend seed data.
export const aliases = {
  "@": fromHere("./src"),
  "@locales": fromHere("../frontend/app/lang"),
  "@unit-locales": fromHere("../mealie/repos/seed/resources/units/locales"),
};

// `SUB_PATH` (Nuxt `app.baseURL`): serve the app under a path prefix, e.g. "/mealie".
export function basePath(subPath: string | undefined) {
  const trimmed = (subPath || "").replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
}

export default defineConfig(({ mode }) => ({
  base: basePath(loadEnv(mode, process.cwd(), "SUB_PATH").SUB_PATH),
  plugins: [
    react(),
    // Port of the `pwa` block in frontend/nuxt.config.ts (@vite-pwa/nuxt); the manifest is served by
    // the backend (mealie/routes/spa/manifest.py). The service worker is registered in main.tsx.
    VitePWA({
      disable: Boolean(process.env.VITEST),
      registerType: "autoUpdate",
      injectRegister: false,
      devOptions: {
        enabled: false,
        suppressWarnings: true,
      },
      workbox: {
        navigateFallback: "/",
        navigateFallbackAllowlist: [/^(?!\/api|\/docs)/],
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
        globIgnores: ["404.html", "200.html", "index.html"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "safari-pinned-tab.svg"],
      manifest: false,
    }),
  ],
  envPrefix: ["VITE_", "THEME_", "SUB_PATH", "GLOBAL_MIDDLEWARE"],
  resolve: {
    alias: aliases,
  },
  server: {
    port: 3000,
    fs: {
      allow: [fromHere("."), aliases["@locales"], aliases["@unit-locales"]],
    },
    proxy: {
      "/api": process.env.API_URL || "http://localhost:9000",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // The backend (mealie/routes/spa) caches `_nuxt/*` as immutable: keep the same asset path.
    assetsDir: "_nuxt",
  },
}));
