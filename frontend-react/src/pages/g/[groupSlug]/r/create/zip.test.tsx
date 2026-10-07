import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { recipePageRoute, renderRoutes } from "@/components/Domain/Recipe/RecipeCreate/test-utils";
import { stubI18n } from "@/test/utils";
import RecipeCreateZipPage from "./zip";

const mocks = vi.hoisted(() => ({
  file: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/hooks/api", () => {
  const api = { upload: { file: mocks.file } };
  return { useUserApi: () => api };
});

vi.mock("@/hooks/use-mealie-auth", () => ({
  useMealieAuth: () => ({ user: { groupSlug: "home" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  alert: { error: mocks.error },
}));

const { t } = stubI18n();

const routes = [
  { path: "/g/:groupSlug/r/create/zip", element: <RecipeCreateZipPage /> },
  recipePageRoute,
];

function zipInput() {
  return screen.getByTestId("zip-file-input") as HTMLInputElement;
}

describe("import recipe from zip page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("uploads the chosen zip and opens the new recipe", async () => {
    mocks.file.mockResolvedValue({ status: 201, data: "imported" });
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/zip");

    expect(screen.getByText(t("recipe.import-from-zip"))).toBeInTheDocument();
    expect(screen.getByText(t("recipe.zip-files-must-have-been-exported-from-mealie"))).toBeInTheDocument();
    const create = screen.getByRole("button", { name: t("general.create") });
    expect(create).toBeDisabled();

    await user.upload(zipInput(), new File(["zip"], "pie.zip", { type: "application/zip" }));
    expect(screen.getByRole("textbox", { name: ".zip" })).toHaveValue("pie.zip");
    expect(create).toBeEnabled();
    await user.click(create);

    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/imported"));
    const [url, formData] = mocks.file.mock.calls[0] as [string, FormData];
    expect(url).toBe("/api/recipes/create/zip");
    expect((formData.get("archive") as File).name).toBe("pie.zip");
  });

  test("the clear button removes the chosen file", async () => {
    const user = userEvent.setup();
    renderRoutes(routes, "/g/home/r/create/zip");

    await user.upload(zipInput(), new File(["zip"], "pie.zip", { type: "application/zip" }));
    await user.click(screen.getByRole("button", { name: t("general.clear") }));

    expect(screen.getByRole("textbox", { name: ".zip" })).toHaveValue("");
    expect(screen.getByRole("button", { name: t("general.create") })).toBeDisabled();
  });

  test("shows an error message and stays on the page when the upload fails", async () => {
    mocks.file.mockResolvedValue({ status: 500, data: null });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/g/home/r/create/zip");

    await user.upload(zipInput(), new File(["zip"], "pie.zip", { type: "application/zip" }));
    await user.click(screen.getByRole("button", { name: t("general.create") }));

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(t("events.something-went-wrong")));
    expect(router.state.location.pathname).toBe("/g/home/r/create/zip");
    consoleError.mockRestore();
  });
});
