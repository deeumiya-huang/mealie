# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows/shopping.spec.ts >> shopping lists >> [flow] add an item and check it off
- Location: tests/flows/shopping.spec.ts:19:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.check: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByText('E2E Hammer mutn8ehp9i', { exact: true }).visible().first().locator('xpath=ancestor::*[.//input[@type=\'checkbox\'] or .//*[@role=\'checkbox\']][1]').getByRole('checkbox').first()
    - locator resolved to <input type="checkbox" data-indeterminate="false" class="PrivateSwitchBase-input mui-j8yymo"/>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action
    - click action done
    - waiting for scheduled navigations to finish
    - navigations have finished

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - button [ref=e6] [cursor=pointer]
      - link [ref=e9] [cursor=pointer]:
        - /url: /g/home
      - generic [ref=e12]: Mealie
      - generic [ref=e16]:
        - textbox "Press '/'" [ref=e20]
        - group [aria-hidden]
      - button [ref=e21] [cursor=pointer]
  - generic [ref=e26]:
    - generic [ref=e28]:
      - link "E2E Admin E2E Admin Favorite Recipes" [ref=e29] [cursor=pointer]:
        - /url: /user/profile
        - generic [ref=e30]:
          - generic "E2E Admin" [ref=e31]:
            - img "8bad0988-6188-4bed-bf4e-4315d292d156" [ref=e32]
          - generic [ref=e33]:
            - generic [ref=e34]: E2E Admin
            - link [ref=e35]:
              - /url: /user/8bad0988-6188-4bed-bf4e-4315d292d156/favorites
      - separator [ref=e39]
      - button [ref=e40] [cursor=pointer]
      - list [ref=e44]:
        - link "Recipes" [ref=e46] [cursor=pointer]:
          - /url: /g/home
        - link "Recipe Finder" [ref=e53] [cursor=pointer]:
          - /url: /g/home/recipes/finder
        - link "Meal Planner" [ref=e60] [cursor=pointer]:
          - /url: /household/mealplan/planner/view
        - link "Shopping Lists" [ref=e67] [cursor=pointer]:
          - /url: /shopping-lists
        - link "Timeline" [ref=e74] [cursor=pointer]:
          - /url: /g/home/recipes/timeline
        - link "Cookbooks" [ref=e81] [cursor=pointer]:
          - /url: /g/home/cookbooks
        - button "Organizers" [ref=e88] [cursor=pointer]
      - separator [ref=e96]
      - list [ref=e97]:
        - link "E2E Cookbook" [ref=e99] [cursor=pointer]:
          - /url: /g/home/cookbooks/e2e-cookbook
    - list [ref=e105]:
      - button "Announcements" [ref=e106] [cursor=pointer]:
        - generic [aria-hidden] [ref=e111]: "1"
      - button "Settings" [ref=e114] [cursor=pointer]
  - main [ref=e120]:
    - generic [ref=e121]:
      - generic [ref=e122]:
        - generic [ref=e123]:
          - generic [ref=e124]:
            - link [ref=e126] [cursor=pointer]:
              - /url: /shopping-lists?disableRedirect=true
            - heading "E2E Flow Checklist mutn8ehpjr" [level=2] [ref=e130]
            - generic [ref=e131]:
              - button [ref=e132] [cursor=pointer]
              - generic "Check All Items" [ref=e135]:
                - button "Check All Items" [ref=e136] [cursor=pointer]
              - button [ref=e139] [cursor=pointer]
          - heading [level=2]
          - heading [level=3]
        - separator [ref=e142]
      - generic [ref=e143]:
        - generic [ref=e145]:
          - generic [ref=e146]:
            - generic [ref=e149]:
              - generic [ref=e150]: Food
              - generic [ref=e151]:
                - combobox "Food" [ref=e155]
                - button "Open" [ref=e157] [cursor=pointer]
                - group [aria-hidden]:
                  - generic: Food
            - generic [ref=e160]:
              - generic [ref=e161]:
                - generic [ref=e162]: Qty
                - generic [ref=e163]:
                  - spinbutton "Qty" [ref=e164]: "0"
                  - group [aria-hidden]:
                    - generic: Qty
              - generic [ref=e167]:
                - generic [ref=e168]: Unit
                - generic [ref=e169]:
                  - combobox "Unit" [ref=e173]
                  - button "Open" [ref=e175] [cursor=pointer]
                  - group [aria-hidden]:
                    - generic: Unit
            - generic [ref=e178]:
              - generic: Note
              - generic [ref=e179]:
                - textbox "Note" [ref=e180]
                - group [aria-hidden]:
                  - generic: Note
            - generic [ref=e184]:
              - generic [ref=e185]: Label
              - generic [ref=e186]:
                - combobox "Label" [ref=e190]
                - button "Open" [ref=e192] [cursor=pointer]
                - group [aria-hidden]:
                  - generic: Label
          - generic [ref=e196]:
            - generic "Cancel" [ref=e197]:
              - button "Cancel" [ref=e198] [cursor=pointer]
            - generic "Save" [ref=e201]:
              - button "Save" [ref=e202] [cursor=pointer]
        - heading [level=3] [ref=e206]:
          - button "One item checked Uncheck All Items Delete Checked" [ref=e207] [cursor=pointer]:
            - generic [ref=e208]:
              - generic [ref=e209]: One item checked
              - generic [ref=e211]:
                - generic "Uncheck All Items" [ref=e212]:
                  - button "Uncheck All Items" [ref=e213]
                - generic "Delete Checked" [ref=e216]:
                  - button "Delete Checked" [ref=e217]
      - generic [ref=e222] [cursor=pointer]:
        - switch "Keep Screen Awake" [checked] [ref=e225]
        - generic [ref=e228]: Keep Screen Awake
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { NAMES } from "../../lib/fixtures";
  3  | import { checkboxRowOf, openDialog, SUBMIT, uniqueName, visibleText } from "../../lib/ui";
  4  |
  5  | test.describe("shopping lists", () => {
  6  |   test("[flow] create a shopping list", async ({ page }) => {
  7  |     const name = uniqueName("E2E Flow List");
  8  |     await page.goto("/shopping-lists");
  9  |     await expect(visibleText(page, NAMES.shoppingList)).toBeVisible();
  10 |     await page.getByRole("main").getByRole("button", { name: "Create", exact: true }).click();
  11 |     const dialog = openDialog(page);
  12 |     await dialog.getByRole("textbox", { name: "New List" }).fill(name);
  13 |     await dialog.getByRole("button", { name: SUBMIT }).click();
  14 |     await expect(page.getByRole("link", { name })).toBeVisible();
  15 |     await page.reload();
  16 |     await expect(page.getByRole("link", { name })).toBeVisible();
  17 |   });
  18 |
  19 |   test("[flow] add an item and check it off", async ({ page }) => {
  20 |     test.setTimeout(90_000);
  21 |     const item = uniqueName("E2E Hammer");
  22 |     // A list of its own, so "One item checked" holds however often the flow runs on one database.
  23 |     const listName = uniqueName("E2E Flow Checklist");
  24 |     await page.goto("/shopping-lists?disableRedirect=true");
  25 |     await page.getByRole("main").getByRole("button", { name: "Create", exact: true }).click();
  26 |     const dialog = openDialog(page);
  27 |     await dialog.getByRole("textbox", { name: "New List" }).fill(listName);
  28 |     await dialog.getByRole("button", { name: SUBMIT }).click();
  29 |     await page.getByRole("link", { name: listName }).click();
  30 |     await expect(page.getByRole("heading", { name: listName })).toBeVisible();
  31 |
  32 |     await page.waitForLoadState("networkidle");
  33 |     const created = page.waitForResponse(r => r.url().includes("/api/households/shopping/items")
  34 |       && r.request().method() === "POST" && r.ok());
  35 |     // The Vue reference polls the list every 5 s and queues new items locally before sending them;
  36 |     // now and then a poll lands mid-add and the typed item is lost. A user would simply add it
  37 |     // again, so the flow does the same (bounded), instead of failing on the reference app.
  38 |     await expect(async () => {
  39 |       const note = page.getByRole("main").getByRole("textbox", { name: "Note" });
  40 |       if (!(await note.isVisible())) {
  41 |         await page.getByRole("combobox", { name: "Add item" }).click({ force: true });
  42 |       }
  43 |       await note.fill(item);
  44 |       await expect(note).toHaveValue(item);
  45 |       await note.press("Enter");
  46 |       await expect(checkboxRowOf(page, item)).toBeVisible({ timeout: 7_000 });
  47 |     }).toPass({ timeout: 30_000 });
  48 |     await created;
  49 |     const row = checkboxRowOf(page, item);
  50 |
  51 |     // Checking is saved in the background; wait for the backend to accept it before reloading.
  52 |     const saved = page.waitForResponse(r => r.url().includes("/api/households/shopping/items")
  53 |       && ["PUT", "PATCH"].includes(r.request().method()) && r.ok());
> 54 |     await row.getByRole("checkbox").first().check();
     |                                             ^ Error: locator.check: Test timeout of 90000ms exceeded.
  55 |     await expect(visibleText(page, "One item checked")).toBeVisible();
  56 |     await saved;
  57 |
  58 |     await page.reload();
  59 |     await expect(visibleText(page, "One item checked")).toBeVisible();
  60 |   });
  61 | });
  62 |
```
