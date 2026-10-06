import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import HouseholdIndexPage from "./index";

const mocks = vi.hoisted(() => ({
  preferences: { id: "p1", privateHousehold: false },
  refresh: vi.fn(),
  updatePreferences: vi.fn(),
  set: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

const { preferences } = mocks;

vi.mock("@/hooks/use-households", () => {
  const actions = { refresh: mocks.refresh, updatePreferences: mocks.updatePreferences, set: mocks.set };
  const state = { household: { id: "h1", name: "Home", preferences: mocks.preferences }, actions };
  return { useHouseholdSelf: () => state };
});

vi.mock("@/hooks/use-toast", () => ({
  alert: { success: mocks.success, error: mocks.error },
}));

vi.mock("@/components/Domain/Household/HouseholdPreferencesEditor", () => ({
  HouseholdPreferencesEditor: () => <div>preferences editor</div>,
}));

const { t } = stubI18n();

describe("household settings page", () => {
  beforeEach(() => {
    mocks.updatePreferences.mockResolvedValue(preferences);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("revalidates the household on entry and saves the preferences", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HouseholdIndexPage />);

    expect(screen.getByRole("heading", { name: t("profile.household-settings") })).toBeTruthy();
    expect(screen.getByText("preferences editor")).toBeTruthy();
    expect(mocks.refresh).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: t("general.update") }));

    await waitFor(() => expect(mocks.updatePreferences).toHaveBeenCalledWith(preferences));
    expect(mocks.success).toHaveBeenCalledWith(t("settings.settings-updated"));
  });

  test("reports a failed save", async () => {
    const user = userEvent.setup();
    mocks.updatePreferences.mockResolvedValue(undefined);
    renderWithProviders(<HouseholdIndexPage />);

    await user.click(screen.getByRole("button", { name: t("general.update") }));

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(t("settings.settings-update-failed")));
  });
});
