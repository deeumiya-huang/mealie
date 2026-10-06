import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import UserProfilePage from "./index";

const mocks = vi.hoisted(() => ({
  statistics: vi.fn(),
  user: {
    id: "u1",
    fullName: "Member One",
    advanced: false,
    canInvite: false,
    canManage: false,
    canManageHousehold: false,
    canOrganize: false,
    groupSlug: "home",
    cacheKey: "k",
  },
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({
    households: { statistics: mocks.statistics },
    utils: { download: vi.fn() },
  }),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: mocks.user }),
}));

vi.mock("@/hooks/store", () => ({
  useUserStore: () => ({ store: [] }),
}));

vi.mock("@/providers/app-info", () => ({
  useAppInfo: () => ({ allowPasswordLogin: true }),
}));

const { t } = stubI18n();

describe("user profile page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("welcomes the user and links to the settings and the household statistics", async () => {
    mocks.statistics.mockResolvedValue({
      data: { totalRecipes: 12, totalUsers: 3, totalCategories: 4, totalTags: 5, totalTools: 6 },
    });
    renderWithProviders(<UserProfilePage />);

    expect(screen.getByRole("heading", { name: t("profile.welcome-user", ["Member One"]) })).toBeTruthy();
    expect(screen.getByRole("link", { name: t("profile.manage-user-profile") }).getAttribute("href")).toBe("/user/profile/edit");
    expect(screen.getByRole("link", { name: t("profile.manage-cookbooks") }).getAttribute("href")).toBe("/g/home/cookbooks");

    // a member who cannot manage sees every statistic but the user count
    await waitFor(() => expect(screen.getByText(t("general.recipes"))).toBeTruthy());
    expect(screen.queryByText(t("user.users"))).toBeNull();
    expect(screen.getByText("12")).toBeTruthy();

    // advanced-only and permission-gated cards stay hidden
    expect(screen.queryByRole("link", { name: t("profile.manage-your-api-tokens") })).toBeNull();
    expect(screen.queryByRole("link", { name: t("profile.group-settings") })).toBeNull();
    expect(screen.queryByRole("button", { name: t("profile.get-invite-link") })).toBeNull();
  });
});
