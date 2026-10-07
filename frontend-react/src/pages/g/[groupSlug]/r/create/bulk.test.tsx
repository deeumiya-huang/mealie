import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderRoutes } from "@/components/Domain/Recipe/RecipeCreate/test-utils";
import { stubI18n } from "@/test/utils";
import RecipeCreateBulkPage from "./bulk";

const mocks = vi.hoisted(() => ({
  createManyByUrl: vi.fn(),
  getAll: vi.fn(),
  deleteOne: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/hooks/api", () => {
  const api = {
    recipes: { createManyByUrl: mocks.createManyByUrl },
    groupReports: { getAll: mocks.getAll, deleteOne: mocks.deleteOne },
  };
  return { useUserApi: () => api };
});

vi.mock("@/hooks/use-toast", () => ({
  alert: { success: mocks.success, error: mocks.error },
}));

// The organizer selectors are backed by the shared stores; the stand-in only shows which one is rendered.
vi.mock("@/components/Domain/Recipe/RecipeOrganizerSelector", () => ({
  RecipeOrganizerSelector: ({ selectorType }: { selectorType: string }) => <div data-testid="organizer-selector">{selectorType}</div>,
}));

const { t } = stubI18n();

const routes = [{ path: "/g/:groupSlug/r/create/bulk", element: <RecipeCreateBulkPage /> }];

const report = {
  id: "r1",
  category: "bulk_import",
  name: "Bulk import of 2 recipes",
  status: "success",
  timestamp: "2024-01-01T12:00:00",
};

describe("recipe bulk importer page", () => {
  beforeEach(() => {
    mocks.getAll.mockResolvedValue({ data: [report] });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("lists the bulk import reports", async () => {
    renderRoutes(routes, "/g/home/r/create/bulk");

    expect(screen.getByText(t("recipe.recipe-bulk-importer"))).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: report.name })).toBeInTheDocument();
    expect(mocks.getAll).toHaveBeenCalledWith("bulk_import");
  });

  test("starts the bulk import with the entered URLs and then locks the create button", async () => {
    mocks.createManyByUrl.mockResolvedValue({ response: { status: 202 } });
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/bulk");

    await user.type(screen.getByRole("textbox", { name: t("new-recipe.recipe-url") }), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: t("general.new") }));
    const fields = screen.getAllByRole("textbox", { name: t("new-recipe.recipe-url") });
    expect(fields).toHaveLength(2);
    await user.type(fields[1], "https://example.com/b");

    const create = screen.getByRole("button", { name: t("general.create") });
    await user.click(create);

    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith(t("recipe.bulk-import-process-has-started")));
    expect(mocks.createManyByUrl).toHaveBeenCalledWith({
      imports: [
        { url: "https://example.com/a", categories: [], tags: [] },
        { url: "https://example.com/b", categories: [], tags: [] },
      ],
    });
    expect(create).toBeDisabled();
    expect(mocks.getAll).toHaveBeenCalledTimes(2);
  });

  test("reports a failed bulk import and keeps the create button enabled", async () => {
    mocks.createManyByUrl.mockResolvedValue({ response: { status: 500 } });
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/bulk");

    await user.click(screen.getByRole("button", { name: t("general.create") }));

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(t("recipe.bulk-import-process-has-failed")));
    expect(screen.getByRole("button", { name: t("general.create") })).toBeEnabled();
  });

  test("removes a URL row and clears all rows", async () => {
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/bulk");

    await user.click(screen.getByRole("button", { name: t("general.new") }));
    expect(screen.getAllByRole("textbox", { name: t("new-recipe.recipe-url") })).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: t("general.delete") })[0]);
    expect(screen.getAllByRole("textbox", { name: t("new-recipe.recipe-url") })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: t("general.clear") }));
    expect(screen.queryByRole("textbox", { name: t("new-recipe.recipe-url") })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("general.create") })).toBeDisabled();
  });

  test("shows the category and tag selectors per URL when asked to", async () => {
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/bulk");

    expect(screen.queryByTestId("organizer-selector")).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: t("recipe.set-categories-and-tags") }));

    const selectors = screen.getAllByTestId("organizer-selector");
    expect(selectors.map(selector => selector.textContent)).toEqual(["categories", "tags"]);
  });

  test("fills the rows from the bulk add dialog", async () => {
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/bulk");

    await user.click(screen.getByRole("button", { name: t("new-recipe.bulk-add") }));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByPlaceholderText(t("new-recipe.paste-in-your-recipe-data-each-line-will-be-treated-as-an-item-in-a-list")),
      "https://example.com/x{Enter}https://example.com/y",
    );
    await user.click(within(dialog).getByRole("button", { name: t("general.add") }));

    await waitFor(() => expect(screen.getAllByRole("textbox", { name: t("new-recipe.recipe-url") })).toHaveLength(2));
    const fields = screen.getAllByRole("textbox", { name: t("new-recipe.recipe-url") });
    expect(fields[0]).toHaveValue("https://example.com/x");
    expect(fields[1]).toHaveValue("https://example.com/y");
  });

  test("deletes a report and reloads the list, or tells the user it failed", async () => {
    mocks.deleteOne.mockResolvedValueOnce({ response: { status: 200 } }).mockResolvedValueOnce({ response: { status: 500 } });
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/bulk");

    await screen.findByRole("cell", { name: report.name });
    const row = screen.getByRole("row", { name: new RegExp(report.name) });

    await user.click(within(row).getByRole("button"));
    await waitFor(() => expect(mocks.deleteOne).toHaveBeenCalledWith("r1"));
    await waitFor(() => expect(mocks.getAll).toHaveBeenCalledTimes(2));

    await user.click(within(screen.getByRole("row", { name: new RegExp(report.name) })).getByRole("button"));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(t("recipe.report-deletion-failed")));
  });
});
