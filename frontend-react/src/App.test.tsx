import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import App from "@/App";
import { AUTH_TOKEN, SUB_PATH, themes } from "@/config";

describe("App scaffold", () => {
  test("renders the router without errors", () => {
    const { container } = render(<App />);
    expect(container).toBeInstanceOf(HTMLDivElement);
  });

  test("config keeps the Nuxt runtime defaults", () => {
    expect(AUTH_TOKEN).toBe("mealie.access_token");
    expect(SUB_PATH).toBe("");
    expect(themes.light.primary).toBe("#E58325");
    expect(themes.dark.background).toBe("#1E1E1E");
  });
});
