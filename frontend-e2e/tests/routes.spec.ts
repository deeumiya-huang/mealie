/**
 * Tier 1: selected pages render real content without errors.
 * The test title starts with the page file so measure.sh can report route pass totals.
 */
import { expect, test } from "@playwright/test";
import { loadFixtures } from "../lib/fixtures";
import { expectFieldValue, monitorPage, normalizedPath } from "../lib/page-health";
import { CORE_ROUTES, EXTENDED_ROUTES, type RouteScope, ROUTES, ROUTE_SETS } from "../lib/routes";

type RouteCheckMode = "smoke" | "strict";

const routeScope = (process.env.E2E_ROUTE_SCOPE ?? "all") as RouteScope;
const selectedRoutes = ROUTE_SETS[routeScope];
const routeCheck = (process.env.E2E_ROUTE_CHECK ?? "strict") as RouteCheckMode;

if (!selectedRoutes) {
  throw new Error(`Unknown E2E_ROUTE_SCOPE "${routeScope}". Use all, core, or extended.`);
}
if (!["smoke", "strict"].includes(routeCheck)) {
  throw new Error(`Unknown E2E_ROUTE_CHECK "${routeCheck}". Use smoke or strict.`);
}

test("route table has unique entries", () => {
  expect(ROUTES.length).toBeGreaterThan(0);
  expect(new Set(ROUTES.map(r => r.file)).size).toBe(ROUTES.length);
  expect(CORE_ROUTES.length).toBeGreaterThan(0);
  expect(EXTENDED_ROUTES.length).toBeGreaterThan(0);
  expect(CORE_ROUTES.length + EXTENDED_ROUTES.length).toBe(ROUTES.length);
});

for (const route of selectedRoutes) {
  test.describe(route.anonymous ? "anonymous" : "admin", () => {
    if (route.anonymous) {
      test.use({ storageState: { cookies: [], origins: [] } });
    }

    test(`[route] ${route.file}`, async ({ page }) => {
      const f = loadFixtures();
      const health = monitorPage(page);

      await page.goto(route.path(f));

      if (routeCheck === "strict") {
        for (const text of route.texts(f)) {
          await expect(page.getByText(text, { exact: false }).filter({ visible: true }).first(), `visible text "${text}"`).toBeVisible();
        }
        for (const value of route.values?.(f) ?? []) {
          await expectFieldValue(page, value);
        }
      }
      else {
        await expect(page.locator("body")).toBeVisible();
        await expect.poll(() => page.locator("body").innerText()).not.toBe("");
      }

      const expected = route.finalPath?.(f) ?? route.path(f);
      if (expected instanceof RegExp) {
        expect(normalizedPath(page)).toMatch(expected);
      }
      else {
        expect(normalizedPath(page)).toBe(expected);
      }

      await health.assertHealthy();
    });
  });
}
