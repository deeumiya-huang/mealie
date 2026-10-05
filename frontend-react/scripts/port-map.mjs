// Shared mapping for port-status.mjs and test-parity.mjs: Vue file (relative to ../frontend/app)
// → React counterpart (relative to src/), plus the domain that owns each Vue file.
// Mirrors PROCESS.md §1.2 (layout), §1.7 (domains), §1.9 (tests) and the P4 ownership table.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const reactRoot = fileURLToPath(new URL("..", import.meta.url));
export const reactSrc = join(reactRoot, "src");
export const vueApp = join(reactRoot, "../frontend/app");

// Files that do not follow the mirrored-path rule. `null` = intentionally not ported (with reason).
export const EXCEPTIONS = {
  "layouts/default.vue": "layouts/DefaultLayout.tsx",
  "layouts/admin.vue": "layouts/AdminLayout.tsx",
  "layouts/basic.vue": "layouts/BasicLayout.tsx",
  "layouts/blank.vue": "layouts/BlankLayout.tsx",
  "layouts/error.vue": "layouts/ErrorPage.tsx",
  "middleware/admin-only.ts": "routes/guards.ts",
  "middleware/advanced-only.ts": "routes/guards.ts",
  "middleware/auth.ts": "routes/guards.ts",
  "middleware/can-manage-household-only.ts": "routes/guards.ts",
  "middleware/can-manage-only.ts": "routes/guards.ts",
  "middleware/can-organize-only.ts": "routes/guards.ts",
  "middleware/group-only.ts": "routes/guards.ts",
  "middleware/pwa-share-target-redirect.global.ts": "routes/guards.ts",
  "plugins/app-info.client.ts": "providers/AppInfoProvider.tsx",
  "plugins/axios.ts": "lib/http.ts",
  "plugins/dark-mode.client.ts": "providers/ThemeModeProvider.tsx",
  "plugins/theme.ts": "providers/theme.ts",
  "plugins/globals.ts": "lib/icons/index.ts",
  "plugins/init-auth.client.ts": "routes/index.tsx",
  "plugins/no-autofill.client.ts": "App.tsx",
  "i18n.config.ts": "i18n/index.ts",
  "composables/use-global-i18n.ts": "i18n/index.ts",
  "tests/setup.ts": "test/setup.ts",
  "tests/utils.ts": "test/utils.tsx",
  "types/components.d.ts": null, // Vue global-component typings; React imports components explicitly.
  "types/ts-shim.d.ts": null, // `*.vue` module shim.
};

// Test files whose mirrored path differs (§1.9).
export const TEST_EXCEPTIONS = {
  "plugins/__tests__/axios.test.ts": "lib/__tests__/http.test.ts",
  "middleware/__tests__/auth.test.ts": "routes/__tests__/guards.test.ts",
};

// Domain ownership (globs relative to frontend/app; `!` excludes). First match wins, in this order.
// Anything unmatched belongs to "shared" (foundation steps P3-03..P3-10).
const C = "components/Domain";
export const DOMAINS = {
  "auth": [
    "pages/index.vue", "pages/login.vue", "pages/register/**", "pages/forgot-password.vue",
    "pages/reset-password.vue", `${C}/User/{UserRegistrationForm,UserPasswordStrength}.vue`,
    "composables/use-users/user-registration-form.ts", "composables/use-default-activity.ts",
  ],
  "layout": [
    "layouts/**", "middleware/**", "plugins/**", "components/Layout/**", `${C}/Announcement/**`,
    "composables/use-announcements.ts",
  ],
  "global": ["components/global/**"],
  "lib": ["lib/**"],
  "shopping": [
    "pages/shopping-lists/**",
    `${C}/ShoppingList/{MultiPurposeLabelSection,ShoppingListAddItemForm,ShoppingListItem,ShoppingListItemDetails,ShoppingListItemEditor}.vue`,
    `${C}/Recipe/RecipeList.vue`,
    "!composables/shopping-list-page/use-add-to-shopping-list-dialog.ts",
    "composables/shopping-list-page/**",
  ],
  "admin": [
    "pages/admin.vue", "pages/admin/**", `${C}/Admin/**`, "composables/use-setup/**", "composables/use-user.ts",
  ],
  "household": [
    "pages/household/**",
    `${C}/Household/{GroupMealPlanEntryDialog,GroupMealPlanRuleForm,GroupWebhookEditor}.vue`,
    `${C}/Mealplan/{MealPlanDay,MealPlanDayHeader,MealPlanLayout,MealPlanNoteMenu}.vue`,
    `${C}/Recipe/RecipeSelector.vue`, "composables/use-group-webhooks.ts", "composables/use-mealplan-rules.ts",
  ],
  "group": [
    "pages/group/**", `${C}/Group/{GroupDataPage,GroupExportData}.vue`,
    `${C}/Recipe/{RecipeDataAliasManagerDialog,RecipeDataSubstitutionManagerDialog,RecipeDataTable}.vue`,
    `${C}/ShoppingList/MultiPurposeLabel.vue`,
  ],
  "explore": [
    "pages/g/[groupSlug]/index.vue", "pages/g/[groupSlug]/cookbooks/**", "pages/g/[groupSlug]/recipes/**",
    `${C}/Cookbook/**`, `${C}/Recipe/RecipeExplorerPage/**`, `${C}/Recipe/{RecipeOrganizerPage,RecipeSuggestion}.vue`,
    "composables/use-group-cookbooks.ts", "composables/use-recipe-explorer-search.ts",
  ],
  "recipe-create": [
    "pages/g/[groupSlug]/r/create.vue", "pages/g/[groupSlug]/r/create/**", `${C}/Recipe/RecipeImportImages.vue`,
    "composables/use-new-recipe-options.ts",
  ],
  "recipe-page": [
    "pages/g/[groupSlug]/r/[slug]/**", "pages/g/[groupSlug]/shared/**", `${C}/Recipe/RecipePage/**`,
    `${C}/Recipe/{RecipeActionMenu,RecipeAssets,RecipeImageLightbox,RecipeImageUploadBtn,RecipeIngredientEditor,RecipeIngredientEditorLayout,RecipeIngredientHtml,RecipeIngredients,RecipeLastMade,RecipeNotes,RecipeNutrition,RecipePrintContainer,RecipeRating,RecipeScaleEditButton,RecipeSettingsMenu,RecipeTimelineBadge,RecipeUnitSystemButton,RecipeYield}.vue`,
    "composables/recipe-page/{use-cook-mode-query,use-extract-ingredient-references}.ts",
    "composables/recipes/use-parse-ingredients-dialog.ts",
  ],
  "user": ["pages/user/**", `${C}/User/UserProfileLinkCard.vue`],
};
export const DOMAIN_NAMES = [...Object.keys(DOMAINS), "shared"];

function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      re += glob[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += glob[i + 2] === "/" ? 2 : 1;
    }
    else if (c === "*") re += "[^/]*";
    else if (c === "{") {
      const end = glob.indexOf("}", i);
      re += `(?:${glob.slice(i + 1, end).split(",").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`;
      i = end;
    }
    else re += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

const compiled = Object.entries(DOMAINS).map(([name, globs]) => [
  name,
  globs.map(g => ({ exclude: g.startsWith("!"), re: globToRegExp(g.replace(/^!/, "")) })),
]);

export function domainOf(vueRel) {
  for (const [name, rules] of compiled) {
    for (const { exclude, re } of rules) {
      if (re.test(vueRel)) {
        if (exclude) break;
        return name;
      }
    }
  }
  return "shared";
}

export function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export const isTest = rel => /\.(test|spec)\.tsx?$/.test(rel);

// Vue source files that need a React counterpart (tests are handled by test-parity).
export function vueSources() {
  return walk(vueApp)
    .map(f => relative(vueApp, f))
    .filter(rel => !rel.startsWith("lang/") && !rel.startsWith("assets/"))
    .filter(rel => /\.(vue|ts|tsx)$/.test(rel) && !isTest(rel))
    .sort();
}

export function vueTests() {
  return walk(vueApp).map(f => relative(vueApp, f)).filter(isTest).sort();
}

function mirror(rel) {
  return rel
    .replace(/^composables\//, "hooks/")
    .replace(/\.vue$/, ".tsx");
}

// Expected React path (relative to src/), or null when intentionally not ported.
export function reactPathFor(vueRel) {
  if (vueRel in EXCEPTIONS) return EXCEPTIONS[vueRel];
  if (vueRel in TEST_EXCEPTIONS) return TEST_EXCEPTIONS[vueRel];
  return mirror(vueRel);
}

// The existing React file for a Vue file (accepting .ts ↔ .tsx), or null.
export function findReact(vueRel) {
  const target = reactPathFor(vueRel);
  if (target === null) return null;
  const candidates = [target, target.replace(/\.tsx$/, ".ts"), target.replace(/\.ts$/, ".tsx")];
  return candidates.find(c => existsSync(join(reactSrc, c))) ?? null;
}
