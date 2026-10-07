import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { icons } from "@/lib/icons";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeOrganizerPage, type GenericItem } from "./RecipeOrganizerPage";

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", groupSlug: "family" } }),
}));

vi.mock("./RecipeOrganizerDialog", () => ({
  RecipeOrganizerDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog">create organizer</div> : null),
}));

const { t } = stubI18n();

const items: GenericItem[] = [
  { id: "1", name: "Soup", slug: "soup" },
  { id: "2", name: "apple", slug: "apple" },
  { id: "3", name: "Salad", slug: "salad" },
];

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(props: Partial<Parameters<typeof RecipeOrganizerPage<GenericItem>>[0]> = {}, route = "/g/family/recipes/categories") {
  return renderWithProviders(
    <>
      <Routes>
        <Route
          path="/g/:groupSlug/recipes/categories"
          element={(
            <RecipeOrganizerPage
              items={items}
              icon={icons.categories}
              itemType="categories"
              title="Categories"
              {...props}
            />
          )}
        />
      </Routes>
      <LocationDisplay />
    </>,
    { route },
  );
}

describe("RecipeOrganizerPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("groups the items under their first letter and links to the filtered explorer", () => {
    renderPage();

    expect(screen.getByText("Categories")).toBeTruthy();
    // sorted by name; the letters are the section titles
    const links = screen.getAllByRole("link");
    expect(links.map(link => link.textContent)).toEqual(["apple", "Salad", "Soup"]);
    expect(links[0].getAttribute("href")).toBe("/g/family?categories=2");
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("S")).toBeTruthy();
  });

  test("searching narrows the list and is kept in the q parameter", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText(t("search.search-placeholder")), "sal");

    await waitFor(() => expect(screen.getAllByRole("link").map(link => link.textContent)).toEqual(["Salad"]));
    expect(screen.getByTestId("location").textContent).toBe("/g/family/recipes/categories?q=sal");
  });

  test("deleting an item asks for confirmation", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderPage({ onDelete });

    const card = screen.getByRole("link", { name: /Salad/ });
    await user.click(within(card).getByRole("button"));
    await user.click(await screen.findByRole("menuitem", { name: t("general.delete") }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(t("general.confirm-delete-generic-with-name", { name: t("category.category") }))).toBeTruthy();
    // the menu click must not follow the card's link
    expect(screen.getByTestId("location").textContent).toBe("/g/family/recipes/categories");
    await user.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    expect(onDelete).toHaveBeenCalledWith("3");
  });

  test("renaming an item reports the edited copy", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderPage({ onUpdate });

    const card = screen.getByRole("link", { name: /Soup/ });
    await user.click(within(card).getByRole("button"));
    await user.click(await screen.findByRole("menuitem", { name: t("general.edit") }));

    const dialog = await screen.findByRole("dialog");
    const name = within(dialog).getByLabelText(t("general.name"));
    await user.clear(name);
    await user.type(name, "Stew");
    await user.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    expect(onUpdate).toHaveBeenCalledWith({ id: "1", name: "Stew", slug: "soup" });
    expect(items[0].name).toBe("Soup");
  });

  test("tools can be marked as on hand", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderWithProviders(
      <Routes>
        <Route
          path="/g/:groupSlug/recipes/tools"
          element={(
            <RecipeOrganizerPage
              items={[{ id: "9", name: "Whisk", slug: "whisk", onHand: false }]}
              icon={icons.potSteam}
              itemType="tools"
              onUpdate={onUpdate}
            />
          )}
        />
      </Routes>,
      { route: "/g/family/recipes/tools" },
    );

    await user.click(within(screen.getByRole("link", { name: /Whisk/ })).getByRole("button"));
    await user.click(await screen.findByRole("menuitem", { name: t("general.edit") }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("checkbox", { name: t("tool.on-hand") }));
    await user.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    expect(onUpdate).toHaveBeenCalledWith({ id: "9", name: "Whisk", slug: "whisk", onHand: true });
  });

  test("the create button opens the organizer dialog", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: t("general.create") }));

    expect(await screen.findByText("create organizer")).toBeTruthy();
  });
});
