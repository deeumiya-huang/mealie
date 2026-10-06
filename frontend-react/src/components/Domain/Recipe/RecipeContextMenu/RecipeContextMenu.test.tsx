import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeContextMenu } from "./RecipeContextMenu";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  api: {
    recipes: { deleteOne: vi.fn(), getOne: vi.fn() },
    households: { getOne: vi.fn() },
  },
  download: vi.fn(),
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => mocks.api,
}));

vi.mock("@/hooks/api/use-downloader", () => ({
  useDownloader: () => mocks.download,
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", admin: false, groupSlug: "family", householdSlug: "home" } }),
}));

vi.mock("@/hooks/use-logged-in-state", () => ({
  useLoggedInState: () => ({ loggedIn: true, isOwnGroup: true }),
}));

vi.mock("@/hooks/use-groups", () => ({
  useGroupSelf: () => ({ group: null, actions: { refresh: vi.fn(), get: vi.fn() } }),
}));

vi.mock("@/hooks/use-households", () => ({
  useHouseholdSelf: () => ({ household: null }),
}));

vi.mock("@/hooks/use-group-recipe-actions", () => ({
  useGroupRecipeActions: () => ({
    recipeActions: [{ id: "a1", title: "Send to Tandoor", actionType: "link", url: "https://example.test" }],
    execute: vi.fn(),
  }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

// the menu content is loaded lazily on the first open
vi.setConfig({ testTimeout: 20000 });

const { t } = stubI18n();

const recipe = { id: "r1", slug: "pancakes", name: "Pancakes", userId: "u1", groupId: "g1", householdId: "h1" };

function renderMenu(props: Partial<Parameters<typeof RecipeContextMenu>[0]> = {}) {
  return renderWithProviders(
    <RecipeContextMenu slug="pancakes" name="Pancakes" recipeId="r1" recipe={recipe} {...props} />,
  );
}

async function openMenu() {
  await userEvent.click(screen.getByRole("button", { name: "" }));
  return await screen.findByRole("menu", {}, { timeout: 10000 });
}

describe("RecipeContextMenu", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.api.recipes.deleteOne.mockReset();
    mocks.api.recipes.deleteOne.mockResolvedValue({ data: { slug: "pancakes" } });
    mocks.api.households.getOne.mockReset();
    mocks.api.households.getOne.mockResolvedValue({ data: null });
  });

  afterEach(() => {
    cleanup();
  });

  test("lists the default items and the group's recipe actions", async () => {
    renderMenu();
    const menu = await openMenu();

    for (const title of ["general.edit", "general.delete", "general.download", "recipe.add-to-plan", "recipe.add-to-list", "general.print", "general.print-preferences", "general.share"]) {
      expect(within(menu).getByRole("menuitem", { name: t(title) })).toBeInTheDocument();
    }
    expect(within(menu).queryByRole("menuitem", { name: t("general.duplicate") })).not.toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Send to Tandoor" })).toBeInTheDocument();
  });

  test("useItems limits the items", async () => {
    renderMenu({ useItems: { download: true, share: true } as never });
    const menu = await openMenu();

    expect(within(menu).getAllByRole("menuitem").map(item => item.textContent)).toEqual([
      t("general.download"),
      t("general.share"),
    ]);
  });

  test("edit navigates to the recipe in edit mode", async () => {
    renderMenu();
    const menu = await openMenu();

    await userEvent.click(within(menu).getByRole("menuitem", { name: t("general.edit") }));

    expect(mocks.navigate).toHaveBeenCalledWith("/g/family/r/pancakes?edit=true");
  });

  test("print and custom items are reported to the parent", async () => {
    const onPrint = vi.fn();
    const onEvent = vi.fn();
    renderMenu({
      onPrint,
      onEvent,
      leadingItems: [{ title: "Custom", icon: "M0 0", event: "custom", isPublic: true }],
    });
    const menu = await openMenu();

    await userEvent.click(within(menu).getByRole("menuitem", { name: t("general.print") }));
    expect(onPrint).toHaveBeenCalledTimes(1);

    const reopened = await openMenu();
    await userEvent.click(within(reopened).getByRole("menuitem", { name: "Custom" }));
    expect(onEvent).toHaveBeenCalledWith("custom");
  });

  test("delete asks for confirmation, deletes the recipe and reports it", async () => {
    const onDeleted = vi.fn();
    renderMenu({ onDeleted });
    const menu = await openMenu();

    await userEvent.click(within(menu).getByRole("menuitem", { name: t("general.delete") }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(t("recipe.delete-confirmation"))).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    await waitFor(() => expect(mocks.api.recipes.deleteOne).toHaveBeenCalledWith("pancakes"));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith("pancakes"));
    expect(mocks.navigate).toHaveBeenCalledWith("/g/family");
  });
});
