import { matchRoutes, type RouteObject } from "react-router";
import { describe, expect, test } from "vitest";
import { recipeCreateRoutes } from "../recipe-create";
import { recipePageRoutes } from "../recipe-page";

// The layout routes are pathless, so matching the domain arrays under one root is what the app router does.
const routes: RouteObject[] = [
  {
    path: "/",
    children: [
      { id: "layout-default", children: [...(recipePageRoutes.default ?? []), ...(recipeCreateRoutes.default ?? [])] },
      { id: "layout-basic", children: [...(recipePageRoutes.basic ?? [])] },
      { path: "*" },
    ],
  },
];

function matchedPath(url: string) {
  const matches = matchRoutes(routes, url) ?? [];
  return matches.map(match => match.route.path).filter(Boolean).join(" > ");
}

function matchedLayout(url: string) {
  return (matchRoutes(routes, url) ?? []).find(match => match.route.id?.startsWith("layout-"))?.route.id;
}

describe("recipe-page routes", () => {
  test("a recipe slug renders the recipe page in the default layout", () => {
    expect(matchedPath("/g/home/r/tomato-soup")).toBe("/ > g/:groupSlug/r/:slug");
    expect(matchedLayout("/g/home/r/tomato-soup")).toBe("layout-default");
  });

  test("the create pages are not shadowed by the recipe slug route", () => {
    expect(matchedPath("/g/home/r/create")).toBe("/ > g/:groupSlug/r/create");
    expect(matchedPath("/g/home/r/create/url")).toBe("/ > g/:groupSlug/r/create > url");
    expect(matchedPath("/g/home/r/create/new")).toBe("/ > g/:groupSlug/r/create > new");
  });

  test("a shared recipe renders in the basic layout", () => {
    expect(matchedPath("/g/home/shared/r/0123-abcd")).toBe("/ > g/:groupSlug/shared/r/:id");
    expect(matchedLayout("/g/home/shared/r/0123-abcd")).toBe("layout-basic");
  });

  test("deeper paths under a recipe are not the recipe page", () => {
    expect(matchedPath("/g/home/r/tomato-soup/extra")).toBe("/ > *");
  });
});
