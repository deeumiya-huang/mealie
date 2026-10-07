import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders, stubI18n } from "@/test/utils";
import RecipeToolsPage from "./index";

const mocks = vi.hoisted(() => ({
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { id: "u1", groupSlug: "family", householdSlug: "home" } }),
}));

vi.mock("@/hooks/store", () => ({
  useToolStore: () => ({
    store: [
      { id: "1", name: "Whisk", slug: "whisk", householdsWithTool: ["home"] },
      { id: "2", name: "Grater", slug: "grater", householdsWithTool: [] },
    ],
    actions: { updateOne: mocks.updateOne, deleteOne: mocks.deleteOne },
  }),
}));

vi.mock("@/components/Domain/Recipe/RecipeOrganizerDialog", () => ({
  RecipeOrganizerDialog: () => null,
}));

const { t } = stubI18n();

async function openEdit(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(within(screen.getByRole("link", { name: new RegExp(name) })).getByRole("button"));
  await user.click(await screen.findByRole("menuitem", { name: t("general.edit") }));
  return await screen.findByRole("dialog");
}

describe("recipe tools page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("lists the tools under the page title", () => {
    renderWithProviders(<RecipeToolsPage />);

    expect(screen.getByText(t("tool.tools"))).toBeTruthy();
    expect(screen.getAllByRole("link").map(link => link.textContent)).toEqual(["Grater", "Whisk"]);
    expect(document.title).toBe(t("tool.tools"));
  });

  test("a tool the household has is shown as on hand and can be taken off the list", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipeToolsPage />);

    const dialog = await openEdit(user, "Whisk");
    const onHand = within(dialog).getByRole("checkbox", { name: t("tool.on-hand") });
    expect(onHand).toBeChecked();
    await user.click(onHand);
    await user.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    await waitFor(() => expect(mocks.updateOne).toHaveBeenCalled());
    expect(mocks.updateOne.mock.calls[0][0]).toMatchObject({ id: "1", householdsWithTool: [], onHand: false });
  });

  test("marking a tool as on hand adds the user's household", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipeToolsPage />);

    const dialog = await openEdit(user, "Grater");
    await user.click(within(dialog).getByRole("checkbox", { name: t("tool.on-hand") }));
    await user.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    await waitFor(() => expect(mocks.updateOne).toHaveBeenCalled());
    expect(mocks.updateOne.mock.calls[0][0]).toMatchObject({ id: "2", householdsWithTool: ["home"], onHand: true });
  });

  test("deleting a tool passes its id to the store", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipeToolsPage />);

    await user.click(within(screen.getByRole("link", { name: /Grater/ })).getByRole("button"));
    await user.click(await screen.findByRole("menuitem", { name: t("general.delete") }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: t("general.confirm") }));

    await waitFor(() => expect(mocks.deleteOne).toHaveBeenCalledWith("2"));
  });
});
