# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows/recipes.spec.ts >> recipes >> [flow] create a recipe by name
- Location: tests/flows/recipes.spec.ts:24:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: 'E2E Flow Soup mutn7ne1tb' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('link', { name: 'E2E Flow Soup mutn7ne1tb' }) with timeout 10000ms
  - waiting for getByRole('link', { name: 'E2E Flow Soup mutn7ne1tb' })

```

```yaml
- banner:
  - button
  - link:
    - /url: /g/home
  - text: Mealie
  - textbox "Press '/'"
  - button "Logout"
- link "E2E Admin E2E Admin Favorite Recipes":
  - /url: /user/profile
  - img "8bad0988-6188-4bed-bf4e-4315d292d156"
  - text: E2E Admin
  - link "Favorite Recipes":
    - /url: /user/8bad0988-6188-4bed-bf4e-4315d292d156/favorites
- separator
- button "Create"
- list:
  - link "Recipes":
    - /url: /g/home
  - link "Recipe Finder":
    - /url: /g/home/recipes/finder
  - link "Meal Planner":
    - /url: /household/mealplan/planner/view
  - link "Shopping Lists":
    - /url: /shopping-lists
  - link "Timeline":
    - /url: /g/home/recipes/timeline
  - link "Cookbooks":
    - /url: /g/home/cookbooks
  - button "Organizers"
- separator
- list:
  - link "E2E Cookbook":
    - /url: /g/home/cookbooks/e2e-cookbook
- list:
  - button "Announcements"
  - button "Settings"
- main:
  - textbox "Search..."
  - button "Categories"
  - button "Tags"
  - button "Tools"
  - button "Foods"
  - button "Households"
  - button "Created"
  - button
  - separator
  - text: Recipes
  - button "Random"
  - button
  - paragraph: E2E Flow Soup mutn7ne1tb
  - button "Add to Favorites"
  - text: ☆ ☆ ☆ ☆ ☆
  - button
  - paragraph: E2E Garden Salad
  - button "E2E Quick"
  - button "Add to Favorites"
  - text: ☆ ☆ ☆ ☆ ☆
  - button
  - paragraph: E2E Pancakes
  - button "E2E Quick"
  - button "Remove from Favorites"
  - text: ☆ ☆ ☆ ☆ ☆
  - button
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { loadFixtures, NAMES } from "../../lib/fixtures";
  3  | import { uniqueName, visibleText } from "../../lib/ui";
  4  |
  5  | test.describe("recipes", () => {
  6  |   test("[flow] open a recipe from the recipe list", async ({ page }) => {
  7  |     const f = loadFixtures();
  8  |     await page.goto(`/g/${f.groupSlug}`);
  9  |     await page.getByRole("link", { name: NAMES.recipe }).first().click();
  10 |     await expect(page).toHaveURL(new RegExp(`/g/${f.groupSlug}/r/${f.recipeSlug}/?$`));
  11 |     await expect(visibleText(page, NAMES.ingredient)).toBeVisible();
  12 |     await expect(visibleText(page, NAMES.instruction)).toBeVisible();
  13 |   });
  14 |
  15 |   test("[flow] search narrows the recipe list", async ({ page }) => {
  16 |     const f = loadFixtures();
  17 |     await page.goto(`/g/${f.groupSlug}`);
  18 |     await expect(page.getByRole("link", { name: NAMES.recipe })).toBeVisible();
  19 |     await page.getByRole("textbox", { name: "Search..." }).fill("Garden Salad");
  20 |     await expect(page.getByRole("link", { name: NAMES.recipe2 })).toBeVisible();
  21 |     await expect(page.getByRole("link", { name: NAMES.recipe })).toHaveCount(0);
  22 |   });
  23 |
  24 |   test("[flow] create a recipe by name", async ({ page }) => {
  25 |     const f = loadFixtures();
  26 |     const name = uniqueName("E2E Flow Soup");
  27 |     await page.goto(`/g/${f.groupSlug}/r/create/new`);
  28 |     await page.getByRole("textbox", { name: "Recipe Name" }).fill(name);
  29 |     await page.getByRole("main").getByRole("button", { name: "Create", exact: true }).click();
  30 |     await expect(page).toHaveURL(new RegExp(`/g/${f.groupSlug}/r/e2e-flow-soup-[a-z0-9-]+`));
  31 |
  32 |     await page.goto(`/g/${f.groupSlug}`);
> 33 |     await expect(page.getByRole("link", { name })).toBeVisible();
     |                                                    ^ Error: expect(locator).toBeVisible() failed
  34 |   });
  35 |
  36 |   test("[flow] comment on a recipe and see it after reload", async ({ page }) => {
  37 |     const f = loadFixtures();
  38 |     const comment = uniqueName("E2E comment");
  39 |     await page.goto(`/g/${f.groupSlug}/r/${f.recipe2Slug}`);
  40 |     await page.getByRole("textbox", { name: "Join the Conversation" }).fill(comment);
  41 |     await page.getByRole("button", { name: "Submit" }).click();
  42 |     await expect(visibleText(page, comment)).toBeVisible();
  43 |     await page.reload();
  44 |     await expect(visibleText(page, comment)).toBeVisible();
  45 |   });
  46 | });
  47 |
```
