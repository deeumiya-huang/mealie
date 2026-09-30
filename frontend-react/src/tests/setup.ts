import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
// en-US messages (and unit names) are bundled into the i18n instance at import time.
import "~/i18n";

afterEach(() => {
  cleanup();
});
