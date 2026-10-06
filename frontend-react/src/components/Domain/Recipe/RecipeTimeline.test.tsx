import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AppInfo } from "@/lib/api/types/admin";
import type { RecipeTimelineEventOut } from "@/lib/api/types/recipe";
import { setAppInfo } from "@/providers/app-info";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeTimeline } from "./RecipeTimeline";

const mocks = vi.hoisted(() => ({
  api: {
    recipes: {
      getAllTimelineEvents: vi.fn(),
      updateTimelineEvent: vi.fn(),
      deleteTimelineEvent: vi.fn(),
      getAll: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => mocks.api,
  useStaticRoutes: () => ({ recipeTimelineEventSmallImage: () => "/img.webp" }),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", groupSlug: "family" } }),
}));

vi.mock("@/components/Domain/User/UserAvatar", () => ({
  UserAvatar: ({ userId }: { userId: string }) => <span data-testid="avatar">{userId}</span>,
}));

const { t } = stubI18n();

function event(id: string, subject: string, userId = "u1", eventType = "info"): RecipeTimelineEventOut {
  return {
    id,
    subject,
    userId,
    eventType,
    eventMessage: `message of ${subject}`,
    recipeId: "r1",
    groupId: "g1",
    householdId: "h1",
    timestamp: "2026-01-02T10:00:00",
    createdAt: "2026-01-02T10:00:00",
    updatedAt: "2026-01-02T10:00:00",
  } as RecipeTimelineEventOut;
}

describe("RecipeTimeline", () => {
  beforeEach(() => {
    setAppInfo({ allowedIframeHosts: [] } as unknown as AppInfo);
    localStorage.clear();
    for (const fn of Object.values(mocks.api.recipes)) fn.mockReset();
    mocks.api.recipes.getAllTimelineEvents.mockResolvedValue({
      data: { items: [event("e1", "First event"), event("e2", "Second event", "u2")] },
    });
    mocks.api.recipes.deleteTimelineEvent.mockResolvedValue({ response: { status: 200 } });
  });

  afterEach(() => {
    cleanup();
  });

  test("loads the events of the query filter and shows them", async () => {
    renderWithProviders(<RecipeTimeline queryFilter={"recipe.slug=\"pancakes\""} />);

    expect(await screen.findByText("First event")).toBeInTheDocument();
    expect(screen.getByText("Second event")).toBeInTheDocument();
    expect(screen.getByText("message of First event")).toBeInTheDocument();

    expect(mocks.api.recipes.getAllTimelineEvents).toHaveBeenCalledWith(1, 32, {
      orderBy: "timestamp",
      orderDirection: "asc",
      queryFilter: "(recipe.slug=\"pancakes\") AND eventType IN [\"info\", \"system\", \"comment\"]",
    });
  });

  test("shows a message when there are no events", async () => {
    mocks.api.recipes.getAllTimelineEvents.mockResolvedValue({ data: { items: [] } });
    renderWithProviders(<RecipeTimeline queryFilter="x" />);

    expect(await screen.findByText(t("recipe.timeline-no-events-found-try-adjusting-filters"))).toBeInTheDocument();
  });

  test("only the owner's own non-system events have the menu", async () => {
    renderWithProviders(<RecipeTimeline queryFilter="x" />);
    await screen.findByText("First event");

    // one menu button: the one of the event written by u1
    expect(screen.getAllByRole("button", { name: "" }).filter(button => button.getAttribute("aria-haspopup") === "menu")).toHaveLength(1);
  });

  test("a filter change reloads with the new event types and sort direction", async () => {
    renderWithProviders(<RecipeTimeline queryFilter="x" />);
    await screen.findByText("First event");

    await userEvent.click(screen.getByRole("button", { name: t("general.filter") }));
    const menu = await screen.findByRole("menu");
    await userEvent.click(within(menu).getByRole("menuitem", { name: t("general.system") }));

    await waitFor(() => expect(mocks.api.recipes.getAllTimelineEvents).toHaveBeenCalledTimes(2));
    expect(mocks.api.recipes.getAllTimelineEvents.mock.calls[1]?.[2]).toMatchObject({
      queryFilter: "(x) AND eventType IN [\"info\", \"comment\"]",
    });

    await userEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: t("general.sort-descending") }));
    await waitFor(() => expect(mocks.api.recipes.getAllTimelineEvents).toHaveBeenCalledTimes(3));
    expect(mocks.api.recipes.getAllTimelineEvents.mock.calls[2]?.[2]).toMatchObject({ orderDirection: "desc" });
  });

  test("deleting an event asks for confirmation and removes it", async () => {
    renderWithProviders(<RecipeTimeline queryFilter="x" />);
    await screen.findByText("First event");

    await userEvent.click(screen.getAllByRole("button").filter(button => button.getAttribute("aria-haspopup") === "menu" && button.textContent === "")[0] as HTMLElement);
    await userEvent.click(await screen.findByRole("menuitem", { name: t("general.delete") }));
    await userEvent.click(await screen.findByRole("button", { name: t("general.confirm") }));

    await waitFor(() => expect(mocks.api.recipes.deleteTimelineEvent).toHaveBeenCalledWith("e1"));
    await waitFor(() => expect(screen.queryByText("First event")).not.toBeInTheDocument());
    expect(screen.getByText("Second event")).toBeInTheDocument();
  });
});
