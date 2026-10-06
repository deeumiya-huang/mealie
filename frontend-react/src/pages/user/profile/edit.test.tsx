import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import UserProfileEditPage from "./edit";

const mocks = vi.hoisted(() => ({
  updateOne: vi.fn(),
  changePassword: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

const sessionUser = {
  id: "u1",
  username: "member",
  fullName: "Member One",
  email: "member@example.com",
  admin: false,
  group: "home",
  household: "family",
  advanced: false,
  showAnnouncements: true,
  canInvite: false,
  canManage: false,
  canManageHousehold: false,
  canOrganize: false,
  groupSlug: "home",
};

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({
    users: { updateOne: mocks.updateOne, changePassword: mocks.changePassword },
    utils: { download: vi.fn(), upload: vi.fn() },
    upload: { file: vi.fn() },
  }),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({
    user: sessionUser,
    getSession: mocks.getSession,
    signOut: mocks.signOut,
  }),
}));

vi.mock("@/hooks/store", () => ({
  useUserStore: () => ({ store: [] }),
}));

vi.mock("@/providers/app-info", () => ({
  useAppInfo: () => ({ allowPasswordLogin: true }),
}));

const { t } = stubI18n();

describe("user profile edit page", () => {
  beforeEach(() => {
    mocks.updateOne.mockResolvedValue({ response: { status: 200 } });
    mocks.changePassword.mockResolvedValue({ response: { status: 200 } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("shows the personal information of the user", () => {
    renderWithProviders(<UserProfileEditPage />);

    expect(screen.getByRole("heading", { name: t("profile.user-settings") })).toBeTruthy();
    expect((screen.getByRole("textbox", { name: t("user.full-name") }) as HTMLInputElement).value).toBe("Member One");
    expect((screen.getByRole("textbox", { name: t("user.email") }) as HTMLInputElement).value).toBe("member@example.com");
  });

  test("updates the full name and reloads the session", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserProfileEditPage />);

    const fullName = screen.getByRole("textbox", { name: t("user.full-name") });
    await user.clear(fullName);
    await user.type(fullName, "Renamed");
    await user.click(screen.getByRole("button", { name: t("general.update") }));

    await waitFor(() => expect(mocks.updateOne).toHaveBeenCalledTimes(1));
    const [id, payload] = mocks.updateOne.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe("u1");
    expect(payload.fullName).toBe("Renamed");
    expect(payload.email).toBe("member@example.com");
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());
  });

  test("changes the password and ends the session", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserProfileEditPage />);

    await user.click(screen.getByRole("button", { name: t("settings.change-password") }));
    await user.type(screen.getByLabelText(t("user.current-password")), "old-password");
    await user.type(screen.getByLabelText(t("user.new-password")), "new-password-1");
    await user.type(screen.getByLabelText(t("user.confirm-password")), "new-password-1");
    await user.click(screen.getByRole("button", { name: t("general.update") }));

    await waitFor(() => expect(mocks.changePassword).toHaveBeenCalledWith({
      currentPassword: "old-password",
      newPassword: "new-password-1",
    }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
  });
});
