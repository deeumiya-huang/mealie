import { act, cleanup, render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, test } from "vitest";
import { getStorageStore } from "@/hooks/utils/use-storage";
import { useNewRecipeOptions, type UseNewRecipeOptionsProps } from "./use-new-recipe-options";

const defaults = {
  importKeywordsAsTags: false,
  importCategories: false,
  stayInEditMode: false,
  parseRecipe: true,
  translateRecipe: false,
  createNewOrganizers: false,
};
const preferences = getStorageStore("local", "recipe-create-preferences", defaults, { mergeDefaults: true });

type Options = ReturnType<typeof useNewRecipeOptions>;

function setup(props?: UseNewRecipeOptionsProps) {
  const captured: { current: Options | null } = { current: null };
  function Host() {
    captured.current = useNewRecipeOptions(props);
    return null;
  }
  const router = createMemoryRouter([{ path: "*", element: <Host /> }], { initialEntries: ["/g/home/r/create/url?recipe_import_url=x"] });
  render(<RouterProvider router={router} />);
  return { router, options: () => captured.current as Options };
}

describe("useNewRecipeOptions", () => {
  afterEach(() => {
    cleanup();
    preferences.set(defaults);
  });

  test("reads and writes the stored create preferences", () => {
    const { options } = setup();
    expect(options().parseRecipe).toBe(true);
    expect(options().stayInEditMode).toBe(false);

    act(() => options().setStayInEditMode(true));
    act(() => options().setParseRecipe(false));

    expect(options().stayInEditMode).toBe(true);
    expect(options().parseRecipe).toBe(false);
    expect(preferences.get()).toMatchObject({ stayInEditMode: true, parseRecipe: false });
  });

  test("a disabled option reads false and ignores writes", () => {
    const { options } = setup({ enableParseRecipe: false, enableTranslateRecipe: false });

    expect(options().parseRecipe).toBe(false);
    expect(options().translateRecipe).toBe(false);
    expect(options().createNewOrganizers).toBe(false);

    act(() => options().setTranslateRecipe(true));
    act(() => options().setParseRecipe(false));

    expect(preferences.get()).toMatchObject({ translateRecipe: false, parseRecipe: true });
  });

  test("navigateToRecipe replaces the create page, then opens the recipe with the chosen flags", async () => {
    const { options, router } = setup();
    act(() => options().setStayInEditMode(true));

    await act(async () => {
      await options().navigateToRecipe("pie", "home", "/g/home/r/create/url");
    });

    expect(router.state.location.pathname).toBe("/g/home/r/pie");
    expect(router.state.location.search).toBe("?edit=true&parse=true");

    await act(async () => {
      await router.navigate(-1);
    });
    await waitFor(() => expect(router.state.location.pathname).toBe("/g/home/r/create/url"));
    expect(router.state.location.search).toBe("");
  });

  test("navigateToRecipe leaves out the query when no flag is set", async () => {
    const { options, router } = setup({ enableStayInEditMode: false, enableParseRecipe: false });

    await act(async () => {
      await options().navigateToRecipe("pie", "home", "/g/home/r/create/ai");
    });

    expect(router.state.location.pathname).toBe("/g/home/r/pie");
    expect(router.state.location.search).toBe("");
  });
});
