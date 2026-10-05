import { render, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import App from "@/App";
import { AUTH_TOKEN, SUB_PATH, themes } from "@/config";
import { authStore } from "@/hooks/use-auth-backend";
import type { AppInfo } from "@/lib/api/types/admin";
import { setAppInfo } from "@/providers/app-info";

describe("App scaffold", () => {
  test("renders the router without errors", async () => {
    setAppInfo({ production: false } as AppInfo);
    const { container } = render(<App />);
    expect(container).toBeInstanceOf(HTMLDivElement);
    // the root loader initialises auth; without a token cookie the session is anonymous
    await waitFor(() => expect(authStore.get().status).toBe("unauthenticated"));
  });

  test("config keeps the Nuxt runtime defaults", () => {
    expect(AUTH_TOKEN).toBe("mealie.access_token");
    expect(SUB_PATH).toBe("");
    expect(themes.light.primary).toBe("#E58325");
    expect(themes.dark.background).toBe("#1E1E1E");
  });
});
