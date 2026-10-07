import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { clearAsyncDataCache } from "@/hooks/utils";
import { renderWithProviders, stubI18n } from "@/test/utils";
import RecipeTimelinePage from "./timeline";

const mocks = vi.hoisted(() => ({
  getCurrentUserHousehold: vi.fn(),
  timeline: vi.fn(),
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({ households: { getCurrentUserHousehold: mocks.getCurrentUserHousehold } }),
}));

vi.mock("@/components/Domain/Recipe/RecipeTimeline", () => ({
  RecipeTimeline: (props: { queryFilter: string; open: boolean; showRecipeCards: boolean }) => {
    mocks.timeline(props);
    return <div>{`timeline ${props.queryFilter}`}</div>;
  },
}));

const { t } = stubI18n();

describe("recipe timeline page", () => {
  afterEach(() => {
    cleanup();
    clearAsyncDataCache();
    vi.clearAllMocks();
  });

  test("shows the group's global timeline", async () => {
    mocks.getCurrentUserHousehold.mockResolvedValue({ data: { groupId: "g1", group: "Family" } });
    renderWithProviders(<RecipeTimelinePage />);

    expect(await screen.findByRole("heading", { name: t("recipe.group-global-timeline", { groupName: "Family" }) })).toBeTruthy();
    expect(screen.getByText("timeline recipe.group_id=\"g1\"")).toBeTruthy();
    expect(mocks.timeline).toHaveBeenLastCalledWith(expect.objectContaining({ showRecipeCards: true, open: true }));
    expect(document.title).toBe(t("recipe.timeline"));
  });

  test("shows neither title nor timeline without a household", async () => {
    mocks.getCurrentUserHousehold.mockResolvedValue({ data: null });
    renderWithProviders(<RecipeTimelinePage />);

    await vi.waitFor(() => expect(mocks.getCurrentUserHousehold).toHaveBeenCalled());
    expect(screen.queryByRole("heading")).toBeNull();
    expect(mocks.timeline).not.toHaveBeenCalled();
  });
});
