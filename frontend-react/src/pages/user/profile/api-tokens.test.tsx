import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import UserApiTokensPage from "./api-tokens";

const mocks = vi.hoisted(() => ({
  createAPIToken: vi.fn(),
  deleteAPIToken: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({
    users: { createAPIToken: mocks.createAPIToken, deleteAPIToken: mocks.deleteAPIToken },
    utils: { download: vi.fn() },
  }),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({
    user: {
      id: "u1",
      advanced: true,
      tokens: [{ id: 7, name: "existing token", createdAt: "2024-05-01T10:00:00" }],
    },
    getSession: mocks.getSession,
  }),
}));

const { t } = stubI18n();

describe("user api tokens page", () => {
  beforeEach(() => {
    mocks.createAPIToken.mockResolvedValue({ data: { id: 8, name: "ci", token: "secret-token-value" } });
    mocks.deleteAPIToken.mockResolvedValue({ data: { message: "deleted" } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("lists the active tokens and the token count", () => {
    renderWithProviders(<UserApiTokensPage />);

    expect(screen.getByRole("heading", { name: t("settings.token.api-tokens") })).toBeTruthy();
    expect(screen.getByText(t("settings.token.you-have-token-count", 1))).toBeTruthy();
    expect(screen.getByText("existing token")).toBeTruthy();
  });

  test("creates a token and shows it once", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserApiTokensPage />);

    const generate = screen.getByRole("button", { name: t("settings.token.generate") });
    expect((generate as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByRole("textbox", { name: t("settings.token.token-name") }), "ci");
    await user.click(generate);

    expect(mocks.createAPIToken).toHaveBeenCalledWith({ name: "ci" });
    const tokenField = await screen.findByRole("textbox", { name: t("settings.token.api-token") });
    expect((tokenField as HTMLTextAreaElement).value).toBe("secret-token-value");

    await user.click(screen.getByRole("button", { name: t("general.close") }));
    expect(screen.queryByRole("textbox", { name: t("settings.token.api-token") })).toBeNull();
    expect(mocks.getSession).toHaveBeenCalled();
  });

  test("deletes a token and reloads the session", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserApiTokensPage />);

    await user.click(screen.getByRole("button", { name: t("general.delete") }));

    await waitFor(() => expect(mocks.deleteAPIToken).toHaveBeenCalledWith(7));
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());
  });
});
