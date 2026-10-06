import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { clearAsyncDataCache } from "@/hooks/utils";
import { renderWithProviders, stubI18n } from "@/test/utils";
import HouseholdWebhooksPage from "./webhooks";

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  createOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
  testOne: vi.fn(),
}));

vi.mock("@/hooks/api", () => {
  const api = { groupWebhooks: mocks };
  return { useUserApi: () => api };
});

const { t } = stubI18n();

const webhook = {
  id: "w1",
  groupId: "g1",
  householdId: "h1",
  enabled: true,
  name: "Nightly hook",
  url: "https://example.com/hook",
  scheduledTime: "12:00",
};

describe("household webhooks page", () => {
  beforeEach(() => {
    clearAsyncDataCache();
    mocks.getAll.mockResolvedValue({ data: { items: [webhook] } });
    mocks.createOne.mockResolvedValue({ data: { ...webhook, id: "w2" } });
    mocks.updateOne.mockResolvedValue({ data: webhook });
    mocks.deleteOne.mockResolvedValue({ data: webhook });
    mocks.testOne.mockResolvedValue({ data: null });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("lists the webhooks and creates a new one", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HouseholdWebhooksPage />);

    expect(screen.getByRole("heading", { name: t("settings.webhooks.webhooks") })).toBeTruthy();
    expect(await screen.findByText(/Nightly hook - /)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: t("general.create") }));

    await waitFor(() => expect(mocks.createOne).toHaveBeenCalledWith({
      enabled: true,
      name: "New Webhook",
      url: "",
      scheduledTime: "00:00",
    }));
    await waitFor(() => expect(mocks.getAll).toHaveBeenCalledTimes(2));
  });

  test("saves an edited webhook with its time converted to UTC", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HouseholdWebhooksPage />);

    await user.click(await screen.findByText(/Nightly hook - /));
    const name = await screen.findByRole("textbox", { name: t("settings.webhooks.webhook-name") });
    await user.clear(name);
    await user.type(name, "Renamed");
    await user.click(screen.getByRole("button", { name: t("general.save") }));

    await waitFor(() => expect(mocks.updateOne).toHaveBeenCalledTimes(1));
    const [id, payload] = mocks.updateOne.mock.calls[0] as [string, typeof webhook];
    expect(id).toBe("w1");
    expect(payload.name).toBe("Renamed");
    // local time -> UTC -> local round trip keeps the stored UTC time
    expect(payload.scheduledTime).toBe("12:00");
  });
});
