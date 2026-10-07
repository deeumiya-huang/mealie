import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { ReadCookBook } from "@/lib/api/types/cookbook";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { CookbookPage } from "./CookbookPage";

const mocks = vi.hoisted(() => ({
  isOwnGroup: true,
  user: { id: "u1", groupSlug: "family", householdId: "h1" } as { id: string; groupSlug: string; householdId: string } | null,
  book: null as unknown,
  updateOne: vi.fn(),
  section: vi.fn(),
  publicGroupSlug: vi.fn(),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: mocks.user }),
}));

vi.mock("@/hooks/use-logged-in-state", () => ({
  useLoggedInState: () => ({ loggedIn: !!mocks.user, isOwnGroup: mocks.isOwnGroup }),
}));

vi.mock("@/hooks/recipes", () => ({
  useLazyRecipes: (slug: string | null) => {
    mocks.publicGroupSlug(slug);
    return { recipes: [], appendRecipes: vi.fn(), replaceRecipes: vi.fn() };
  },
}));

vi.mock("@/hooks/use-group-cookbooks", () => ({
  useCookbookData: (slug: string | null) => {
    mocks.publicGroupSlug(slug);
    return { data: mocks.book, pending: false, error: null, refresh: vi.fn() };
  },
}));

vi.mock("@/hooks/store/use-cookbook-store", () => ({
  useCookbookStore: () => ({ store: [], actions: { updateOne: mocks.updateOne } }),
}));

vi.mock("@/components/Domain/Recipe/RecipeCardSection", () => ({
  RecipeCardSection: (props: { query: { cookbook: string } }) => {
    mocks.section(props);
    return <div>{`recipes of ${props.query.cookbook}`}</div>;
  },
}));

vi.mock("./CookbookEditor", () => ({
  CookbookEditor: ({ value }: { value: ReadCookBook }) => <div>{`editing ${value.name}`}</div>,
}));

const { t } = stubI18n();

const book: ReadCookBook = {
  id: "b1",
  name: "Weeknights",
  description: "Fast dinners",
  slug: "weeknights",
  groupId: "g1",
  householdId: "h1",
  queryFilterString: "tags.id IN [\"t1\"]",
};

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/g/:groupSlug/cookbooks/:slug" element={<CookbookPage />} />
    </Routes>,
    { route: "/g/family/cookbooks/weeknights" },
  );
}

describe("CookbookPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.isOwnGroup = true;
    mocks.user = { id: "u1", groupSlug: "family", householdId: "h1" };
    mocks.book = null;
  });

  test("shows the cookbook name, description and its recipes", () => {
    mocks.book = book;
    renderPage();

    expect(screen.getByText("Weeknights")).toBeTruthy();
    expect(screen.getByText("Fast dinners")).toBeTruthy();
    expect(screen.getByText("recipes of weeknights")).toBeTruthy();
    expect(document.title).toBe(t("cookbook.cookbook"));
  });

  test("shows nothing until the cookbook has loaded", () => {
    renderPage();

    expect(screen.queryByText("recipes of weeknights")).toBeNull();
  });

  test("members of the household can edit the cookbook", async () => {
    const user = userEvent.setup();
    mocks.book = book;
    renderPage();

    await user.click(screen.getByRole("button", { name: t("general.edit") }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("editing Weeknights")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: t("general.save") })).toBeEnabled();
  });

  test("other households cannot edit the cookbook", () => {
    mocks.book = { ...book, householdId: "h2" };
    renderPage();

    expect(screen.queryByRole("button", { name: t("general.edit") })).toBeNull();
  });

  test("visitors of another group read through the public API and cannot edit", () => {
    mocks.isOwnGroup = false;
    mocks.user = null;
    mocks.book = book;
    renderPage();

    expect(mocks.publicGroupSlug).toHaveBeenCalledWith("family");
    expect(screen.getByText("Weeknights")).toBeTruthy();
    expect(screen.queryByRole("button", { name: t("general.edit") })).toBeNull();
  });
});
