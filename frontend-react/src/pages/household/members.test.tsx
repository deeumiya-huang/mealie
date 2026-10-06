import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import HouseholdMembersPage from "./members";

const mocks = vi.hoisted(() => ({
  fetchMembers: vi.fn(),
  setMemberPermissions: vi.fn(),
}));

vi.mock("@/hooks/api", () => {
  const api = { households: mocks };
  return { useUserApi: () => api };
});

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "me" } }),
}));

vi.mock("@/components/Domain/User/UserAvatar", () => ({
  UserAvatar: () => null,
}));

const { t } = stubI18n();

function member(id: string, username: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    username,
    fullName: `${username} full`,
    admin: false,
    canInvite: false,
    canManage: false,
    canManageHousehold: false,
    canOrganize: false,
    ...extra,
  };
}

describe("household members page", () => {
  beforeEach(() => {
    mocks.fetchMembers.mockResolvedValue({
      data: { items: [member("me", "myself"), member("u2", "other")] },
    });
    mocks.setMemberPermissions.mockResolvedValue({ data: null });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("lists the members and links to the profile editor", async () => {
    renderWithProviders(<HouseholdMembersPage />);

    expect(screen.getByRole("heading", { name: t("group.manage-members") })).toBeTruthy();
    expect(await screen.findByRole("cell", { name: "other full" })).toBeTruthy();
    expect(screen.getByRole("link", { name: t("group.looking-to-update-your-profile") }).getAttribute("href")).toBe("/user/profile/edit");
  });

  test("changing a permission saves it, and the current user's boxes are disabled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HouseholdMembersPage />);

    await screen.findByRole("cell", { name: "other full" });
    const inviteBoxes = screen.getAllByRole("checkbox", { name: t("group.invite") });
    expect((inviteBoxes[0] as HTMLInputElement).disabled).toBe(true);

    await user.click(inviteBoxes[1] as HTMLInputElement);

    await waitFor(() => expect(mocks.setMemberPermissions).toHaveBeenCalledWith({
      userId: "u2",
      canInvite: true,
      canManageHousehold: false,
      canManage: false,
      canOrganize: false,
    }));
  });
});
