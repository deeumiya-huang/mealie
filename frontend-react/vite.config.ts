import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Locale messages are imported (never copied) from the Vue app and the backend seed data.
export const aliases = {
  "@": fromHere("./src"),
  "@locales": fromHere("../frontend/app/lang"),
  "@unit-locales": fromHere("../mealie/repos/seed/resources/units/locales"),
};

export default defineConfig({
  plugins: [react()],
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
});
