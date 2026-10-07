import { act, screen } from "@testing-library/react";
import axios from "axios";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AppInfoProvider } from "./AppInfoProvider";
import { renderWithProviders } from "@/test/utils";

describe("AppInfoProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("shows an error instead of a blank page when /api/app/about fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const get = vi.spyOn(axios, "get").mockRejectedValueOnce(new Error("Network Error"));
    const { setAppInfo } = await import("./app-info");
    setAppInfo(null);

    await act(async () => {
      renderWithProviders(<AppInfoProvider><p>app</p></AppInfoProvider>);
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Network Error");
    expect(screen.queryByText("app")).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
  });
});
