import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import HouseholdNotifiersPage from "./notifiers";

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  createOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
  test: vi.fn(),
}));

vi.mock("@/hooks/api", () => {
  const api = { groupEventNotifier: mocks };
  return { useUserApi: () => api };
});

const { t } = stubI18n();

const notifier = {
  id: "n1",
  name: "Discord",
  enabled: true,
  groupId: "g1",
  householdId: "h1",
  options: { recipeCreated: true, recipeUpdated: false },
};

describe("household notifiers page", () => {
  beforeEach(() => {
    mocks.getAll.mockResolvedValue({ data: { items: [notifier] } });
    mocks.createOne.mockResolvedValue({ data: notifier });
    mocks.updateOne.mockResolvedValue({ data: notifier });
    mocks.deleteOne.mockResolvedValue({ data: notifier });
    mocks.test.mockResolvedValue({ data: null });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("lists the notifiers and creates a new one from the dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HouseholdNotifiersPage />);

    expect(screen.getByRole("heading", { name: t("events.event-notifiers") })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Discord" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: t("general.create") }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: t("general.name") }), "Matrix room");
    await user.type(within(dialog).getByRole("textbox", { name: t("events.apprise-url") }), "matrix://room");
    await user.click(within(dialog).getByRole("button", { name: t("general.create") }));

    await waitFor(() => expect(mocks.createOne).toHaveBeenCalledWith({
      name: "Matrix room",
      enabled: true,
      appriseUrl: "matrix://room",
    }));
    await waitFor(() => expect(mocks.getAll).toHaveBeenCalledTimes(2));
  });

  test("edits, saves, tests and deletes a notifier", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HouseholdNotifiersPage />);

    await user.click(await screen.findByRole("button", { name: "Discord" }));
    const updateCheckbox = screen.getAllByRole("checkbox", { name: t("general.update") })[0] as HTMLInputElement;
    expect(updateCheckbox.checked).toBe(false);
    await user.click(updateCheckbox);
    await user.click(screen.getByRole("button", { name: t("general.save") }));

    await waitFor(() => expect(mocks.updateOne).toHaveBeenCalledTimes(1));
    const [id, payload] = mocks.updateOne.mock.calls[0] as [string, typeof notifier];
    expect(id).toBe("n1");
    expect(payload.options.recipeUpdated).toBe(true);

    await user.click(screen.getByRole("button", { name: t("general.test") }));
    await waitFor(() => expect(mocks.test).toHaveBeenCalledWith("n1"));

    await user.click(screen.getByRole("button", { name: t("general.delete") }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: t("general.confirm") }));
    await waitFor(() => expect(mocks.deleteOne).toHaveBeenCalledWith("n1"));
  });
});
