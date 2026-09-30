import { copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(root, "..");

/** Shared with the Vue app: generated API types, locale messages, static assets. */
const sharedTypesDir = path.resolve(repoRoot, "frontend/app/lib/api/types");
const GENERATED_TYPES = "admin|analytics|cookbook|events|group|household|labels|meal-plan|openai|recipe|reports|response|static|user";
const sharedLangDir = path.resolve(repoRoot, "frontend/app/lang");
const sharedPublicDir = path.resolve(repoRoot, "frontend/public");
const availableLocalesFile = path.resolve(repoRoot, "frontend/app/composables/use-locales/available-locales.ts");
const unitLocalesDir = path.resolve(repoRoot, "mealie/repos/seed/resources/units/locales");

const apiUrl = process.env.API_URL || "http://localhost:9000";

/**
 * `nuxt generate --spa` emitted index.html plus 200.html and 404.html copies of the shell.
 * The backend's SPAStaticFiles relies on 404.html (StaticFiles(html=True) serves it for unknown paths),
 * so emit the same trio.
 */
function spaFallbackPages(): Plugin {
  let outDir = "dist";
  return {
    name: "mealie-spa-fallback-pages",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const index = path.join(outDir, "index.html");
      copyFileSync(index, path.join(outDir, "200.html"));
      copyFileSync(index, path.join(outDir, "404.html"));
    },
  };
}

/**
 * frontend/app/composables/use-locales/available-locales.ts is generated plain data (no TS syntax).
 * Vite's TS transform would look up frontend/tsconfig.json, which extends Nuxt's generated
 * .nuxt/tsconfig.json and fails when the Vue app hasn't been installed. Serve it as a JS module instead.
 */
function sharedLocalesModule(): Plugin {
  const virtualId = "\0mealie-available-locales.js";
  return {
    name: "mealie-shared-locales",
    enforce: "pre",
    resolveId(id) {
      return id === "@mealie-locales" ? virtualId : null;
    },
    load(id) {
      if (id !== virtualId) return null;
      this.addWatchFile(availableLocalesFile);
      return readFileSync(availableLocalesFile, "utf-8");
    },
  };
}

export default defineConfig({
  base: process.env.SUB_PATH || "/",
  publicDir: sharedPublicDir,
  plugins: [
    sharedLocalesModule(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: false, // served by the backend, see mealie/routes/spa/manifest.py
      includeAssets: ["favicon.ico", "icons/apple-touch-icon.png", "icons/safari-pinned-tab.svg"],
      workbox: {
        navigateFallback: "/",
        navigateFallbackAllowlist: [/^(?!\/api|\/docs)/],
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
        globIgnores: ["404.html", "200.html", "index.html"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
    spaFallbackPages(),
  ],
  resolve: {
    alias: [
      // Must come before the generic "~" alias: generated types resolve into the Vue app's folder.
      { find: new RegExp(`^~/lib/api/types/(${GENERATED_TYPES})$`), replacement: `${sharedTypesDir}/$1.ts` },
      { find: /^@mealie-lang(?=\/|$)/, replacement: sharedLangDir },
      { find: /^@mealie-unit-locales(?=\/|$)/, replacement: unitLocalesDir },
      { find: /^[~@]\//, replacement: `${path.resolve(root, "src")}/` },
    ],
  },
  server: {
    port: 3000,
    fs: {
      allow: [root, sharedTypesDir, sharedLangDir, sharedPublicDir, unitLocalesDir, availableLocalesFile],
    },
    proxy: {
      "/api": { target: apiUrl, changeOrigin: true },
      "/docs": { target: apiUrl, changeOrigin: true },
      "/openapi.json": { target: apiUrl, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    // The backend marks `_nuxt/*` as immutable (mealie/routes/spa/__init__.py). Emitting hashed assets
    // under the same prefix keeps that long-lived caching without touching the backend.
    assetsDir: "_nuxt",
    chunkSizeWarningLimit: 2000,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    maxWorkers: 4,
    css: false,
  },
});
