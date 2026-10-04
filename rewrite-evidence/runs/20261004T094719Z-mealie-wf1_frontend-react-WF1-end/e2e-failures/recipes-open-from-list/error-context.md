# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows/recipes.spec.ts >> recipes >> [flow] open a recipe from the recipe list
- Location: tests/flows/recipes.spec.ts:6:7

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'E2E Pancakes' }).first()

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
    - generic [ref=e122]:
      - generic [ref=e124]:
        - generic [ref=e127]:
          - textbox "Search..." [ref=e131]
          - group [aria-hidden]
        - generic [ref=e132]:
          - button "Categories" [ref=e135] [cursor=pointer]
          - button "Tags" [ref=e140] [cursor=pointer]
          - button "Tools" [ref=e145] [cursor=pointer]
          - button "Foods" [ref=e150] [cursor=pointer]
          - button "Households" [ref=e155] [cursor=pointer]
          - button [ref=e158] [cursor=pointer]
          - button [ref=e162] [cursor=pointer]
      - separator [ref=e165]
      - generic [ref=e168]:
        - generic [ref=e169]:
          - generic [ref=e172]: Recipes
          - button [ref=e173] [cursor=pointer]
          - button [ref=e177] [cursor=pointer]
        - generic [ref=e182]:
          - generic [ref=e185] [cursor=pointer]:
            - paragraph [ref=e189]: E2E Garden Salad
            - generic [ref=e190]:
              - button "E2E Quick" [ref=e193]
              - generic [ref=e195]:
                - button "Add to Favorites" [ref=e196]
                - generic [ref=e199]:
                  - generic [ref=e200]: ☆
                  - generic [ref=e201]: ☆
                  - generic [ref=e202]: ☆
                  - generic [ref=e203]: ☆
                  - generic [ref=e204]: ☆
                - button [ref=e206]
          - generic [ref=e211] [cursor=pointer]:
            - paragraph [ref=e215]: E2E Pancakes
            - generic [ref=e216]:
              - button "E2E Quick" [ref=e219]
              - generic [ref=e221]:
                - button "Remove from Favorites" [ref=e222]
                - generic [ref=e225]:
                  - generic [ref=e226]: ☆
                  - generic [ref=e227]: ☆
                  - generic [ref=e228]: ☆
                  - generic [ref=e229]: ☆
                  - generic [ref=e230]: ☆
                - button [ref=e232]
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
> 9  |     await page.getByRole("link", { name: NAMES.recipe }).first().click();
     |                                                                  ^ Error: locator.click: Test timeout of 45000ms exceeded.
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
  33 |     await expect(page.getByRole("link", { name })).toBeVisible();
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
