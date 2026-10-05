// Port of app/tests/setup.ts: jest-dom matchers and the app-wide i18n initialised synchronously with
// the en-US messages, so components and hooks using useI18n()/getGlobalI18n() translate in tests.
import "@testing-library/jest-dom/vitest";
import { addLocaleMessages, ensureI18n, i18n } from "@/i18n";
import { loadEnLocales } from "./utils";

ensureI18n();
addLocaleMessages("en-US", loadEnLocales());
void i18n.changeLanguage("en-US");
