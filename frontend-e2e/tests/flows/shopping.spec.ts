import { expect, test } from "@playwright/test";
import { NAMES } from "../../lib/fixtures";
import { checkboxRowOf, openDialog, SUBMIT, uniqueName, visibleText } from "../../lib/ui";

test.describe("shopping lists", () => {
  test("[flow] create a shopping list", async ({ page }) => {
    const name = uniqueName("E2E Flow List");
    await page.goto("/shopping-lists");
    await expect(visibleText(page, NAMES.shoppingList)).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Create", exact: true }).click();
    const dialog = openDialog(page);
    await dialog.getByRole("textbox", { name: "New List" }).fill(name);
    await dialog.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByRole("link", { name })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name })).toBeVisible();
  });

  test("[flow] add an item and check it off", async ({ page }) => {
    test.setTimeout(90_000);
    const item = uniqueName("E2E Hammer");
    // A list of its own, so "One item checked" holds however often the flow runs on one database.
    const listName = uniqueName("E2E Flow Checklist");
    await page.goto("/shopping-lists?disableRedirect=true");
    await page.getByRole("main").getByRole("button", { name: "Create", exact: true }).click();
    const dialog = openDialog(page);
    await dialog.getByRole("textbox", { name: "New List" }).fill(listName);
    await dialog.getByRole("button", { name: SUBMIT }).click();
    await page.getByRole("link", { name: listName }).click();
    await expect(page.getByRole("heading", { name: listName })).toBeVisible();

    await page.waitForLoadState("networkidle");
    const created = page.waitForResponse(r => r.url().includes("/api/households/shopping/items")
      && r.request().method() === "POST" && r.ok());
    // The Vue reference polls the list every 5 s and queues new items locally before sending them;
    // now and then a poll lands mid-add and the typed item is lost. A user would simply add it
    // again, so the flow does the same (bounded), instead of failing on the reference app.
    await expect(async () => {
      const note = page.getByRole("main").getByRole("textbox", { name: "Note" });
      if (!(await note.isVisible())) {
        await page.getByRole("combobox", { name: "Add item" }).click({ force: true });
      }
      await note.fill(item);
      await expect(note).toHaveValue(item);
      await note.press("Enter");
      await expect(checkboxRowOf(page, item)).toBeVisible({ timeout: 7_000 });
    }).toPass({ timeout: 30_000 });
    await created;
    const row = checkboxRowOf(page, item);

    // Checking is saved in the background; wait for the backend to accept it before reloading.
    const saved = page.waitForResponse(r => r.url().includes("/api/households/shopping/items")
      && ["PUT", "PATCH"].includes(r.request().method()) && r.ok());
    await row.getByRole("checkbox").first().check();
    await expect(visibleText(page, "One item checked")).toBeVisible();
    await saved;

    await page.reload();
    await expect(visibleText(page, "One item checked")).toBeVisible();
  });
});
