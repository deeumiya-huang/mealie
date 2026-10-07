import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
      // userEvent-driven page tests exceed the 5 s default under a parallel full run (D49).
      testTimeout: 15000,
    },
  }),
);
