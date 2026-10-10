/**
 * Tier 1 of the yardstick: one entry per selected page in the migration test scope.
 *
 * A route passes when, after loading its URL in a real browser:
 *   - it ends up at the expected URL (no bounce to /login, no unexpected redirect),
 *   - every `texts` entry is visible (en-US UI strings + seeded fixture data, so an empty shell or a
 *     placeholder page can't pass),
 *   - every `values` entry is the current value of some form field (edit pages load real data),
 *   - no uncaught page error or console error was raised and no API call answered 5xx,
 *   - nothing on the page reads like a stub ("TODO", "Not implemented", "Coming soon", ...).
 *
 * The expectations were taken from the Vue app (the reference). Dynamic segments use seeded ids/slugs.
 */
import { ADMIN, MEMBER, NAMES, type Fixtures } from "./fixtures";

export interface RouteCheck {
  /** Page file relative to frontend/app/pages/ — the unit counted in route pass totals. */
  file: string;
  path: (f: Fixtures) => string;
  /** Run without a session (public pages). Default: logged in as the seeded admin. */
  anonymous?: boolean;
  /** Where the browser must end up; default is `path` itself. Trailing slash is ignored. */
  finalPath?: (f: Fixtures) => string | RegExp;
  texts: (f: Fixtures) => string[];
  values?: (f: Fixtures) => string[];
}

export type RouteScope = "all" | "core" | "extended";

/** First day shown by the meal planner: the seeded date, formatted like the planner's day headers. */
function plannerDay(f: Fixtures): string {
  return new Date(`${f.mealplanDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const g = (f: Fixtures) => `/g/${f.groupSlug}`;

export const ROUTES: RouteCheck[] = [
  // ---------------------------------------------------------------- admin
  {
    // Parent route with no index child: only guards (auth + admin-only) and the app shell.
    file: "admin.vue",
    path: () => "/admin",
    finalPath: () => /^\/admin(\/.*)?$/,
    texts: () => [ADMIN.fullName, "Settings"],
  },
  {
    file: "admin/backups.vue",
    path: () => "/admin/backups",
    texts: () => ["Backups", "Create A Backup"],
  },
  {
    file: "admin/debug/openai.vue",
    path: () => "/admin/debug/openai",
    texts: () => ["Debug OpenAI Services"],
  },
  {
    file: "admin/debug/parser.vue",
    path: () => "/admin/debug/parser",
    texts: () => ["Ingredients Natural Language Processor", "Try an example"],
  },
  {
    file: "admin/maintenance/index.vue",
    path: () => "/admin/maintenance",
    texts: () => ["Site Maintenance", "Summary", "Actions"],
  },
  {
    file: "admin/manage/groups/[id].vue",
    path: f => `/admin/manage/groups/${f.secondGroupId}`,
    texts: () => ["Admin Group Management", "Group Preferences"],
    values: () => [NAMES.group],
  },
  {
    file: "admin/manage/groups/index.vue",
    path: () => "/admin/manage/groups",
    texts: () => ["Group Management", NAMES.group, "Home"],
  },
  {
    file: "admin/manage/households/[id].vue",
    path: f => `/admin/manage/households/${f.secondHouseholdId}`,
    texts: () => ["Admin Household Management", "Household Preferences"],
    values: () => [NAMES.household],
  },
  {
    file: "admin/manage/households/index.vue",
    path: () => "/admin/manage/households",
    texts: () => ["Household Management", NAMES.household, "Family"],
  },
  {
    file: "admin/manage/users/[id].vue",
    path: f => `/admin/manage/users/${f.memberId}`,
    texts: () => ["Admin User Management", "User Details", "Permissions"],
    values: () => [MEMBER.email, MEMBER.fullName],
  },
  {
    file: "admin/manage/users/create.vue",
    path: () => "/admin/manage/users/create",
    texts: () => ["Admin User Creation", "User Details", "Permissions"],
  },
  {
    file: "admin/manage/users/index.vue",
    path: () => "/admin/manage/users",
    texts: () => ["User Management", MEMBER.email, ADMIN.email],
  },
  {
    file: "admin/setup.vue",
    path: () => "/admin/setup",
    texts: () => ["Welcome to Mealie! Let's get started", "Account Details"],
  },
  {
    file: "admin/site-settings.vue",
    path: () => "/admin/site-settings",
    texts: () => ["Site Settings", "Configuration", "Site Statistics"],
  },

  // ---------------------------------------------------------------- public / auth
  {
    file: "forgot-password.vue",
    path: () => "/forgot-password",
    anonymous: true,
    texts: () => ["Forgot Password"],
  },
  {
    file: "login.vue",
    path: () => "/login",
    anonymous: true,
    texts: () => ["Sign in", "Email or Username", "Password", "Remember Me"],
  },
  {
    file: "register/index.vue",
    path: () => "/register",
    anonymous: true,
    texts: () => ["User Registration", "Join a Group", "Create a New Group"],
  },
  {
    file: "reset-password.vue",
    path: () => "/reset-password",
    anonymous: true,
    texts: () => ["Reset Password"],
  },
  {
    file: "g/[groupSlug]/shared/r/[id].vue",
    path: f => `${g(f)}/shared/r/${f.sharedRecipeToken}`,
    anonymous: true,
    texts: () => [NAMES.recipe, "Ingredients", NAMES.ingredient, NAMES.instruction],
  },

  // ---------------------------------------------------------------- recipes (group scoped)
  {
    file: "index.vue",
    path: () => "/",
    finalPath: f => g(f),
    texts: () => [NAMES.recipe, NAMES.recipe2],
  },
  {
    file: "g/[groupSlug]/index.vue",
    path: g,
    texts: () => [NAMES.recipe, NAMES.recipe2],
  },
  {
    file: "g/[groupSlug]/r/[slug]/index.vue",
    path: f => `${g(f)}/r/${f.recipeSlug}`,
    texts: () => [
      NAMES.recipe,
      "Ingredients",
      NAMES.ingredient,
      "Instructions",
      NAMES.instruction,
      NAMES.tool,
      NAMES.category,
      NAMES.tag,
    ],
  },
  {
    file: "g/[groupSlug]/cookbooks/index.vue",
    path: f => `${g(f)}/cookbooks`,
    texts: () => ["Cookbooks", NAMES.cookbook],
  },
  {
    file: "g/[groupSlug]/cookbooks/[slug].vue",
    path: f => `${g(f)}/cookbooks/${f.cookbookSlug}`,
    texts: () => [NAMES.cookbook, NAMES.recipe, NAMES.recipe2],
  },
  {
    // Parent of every create/* page: the shared "Recipe Creation" header.
    file: "g/[groupSlug]/r/create.vue",
    path: f => `${g(f)}/r/create/new`,
    texts: () => ["Recipe Creation"],
  },
  {
    // Index child redirects to the URL importer.
    file: "g/[groupSlug]/r/create/index.vue",
    path: f => `${g(f)}/r/create`,
    finalPath: f => `${g(f)}/r/create/url`,
    texts: () => ["Recipe Creation", "Scrape Recipe"],
  },
  {
    file: "g/[groupSlug]/r/create/ai.vue",
    path: f => `${g(f)}/r/create/ai`,
    texts: () => ["Recipe Creation", "Import with AI"],
  },
  {
    file: "g/[groupSlug]/r/create/bulk.vue",
    path: f => `${g(f)}/r/create/bulk`,
    texts: () => ["Recipe Creation", "Recipe Bulk Importer", "Bulk Imports"],
  },
  {
    file: "g/[groupSlug]/r/create/debug.vue",
    path: f => `${g(f)}/r/create/debug`,
    texts: () => ["Recipe Creation", "Recipe Debugger"],
  },
  {
    file: "g/[groupSlug]/r/create/html.vue",
    path: f => `${g(f)}/r/create/html`,
    texts: () => ["Recipe Creation", "Import from HTML or JSON"],
  },
  {
    // Legacy URL kept as a redirect to the AI importer.
    file: "g/[groupSlug]/r/create/image.vue",
    path: f => `${g(f)}/r/create/image`,
    finalPath: f => `${g(f)}/r/create/ai`,
    texts: () => ["Recipe Creation", "Import with AI"],
  },
  {
    file: "g/[groupSlug]/r/create/new.vue",
    path: f => `${g(f)}/r/create/new`,
    texts: () => ["Recipe Creation", "Create Recipe"],
  },
  {
    file: "g/[groupSlug]/r/create/url.vue",
    path: f => `${g(f)}/r/create/url`,
    texts: () => ["Recipe Creation", "Scrape Recipe"],
  },
  {
    file: "g/[groupSlug]/r/create/zip.vue",
    path: f => `${g(f)}/r/create/zip`,
    texts: () => ["Recipe Creation", "Import from Zip"],
  },
  {
    file: "g/[groupSlug]/recipes/categories/index.vue",
    path: f => `${g(f)}/recipes/categories`,
    texts: () => ["Categories", NAMES.category],
  },
  {
    file: "g/[groupSlug]/recipes/tags/index.vue",
    path: f => `${g(f)}/recipes/tags`,
    texts: () => ["Tags", NAMES.tag],
  },
  {
    file: "g/[groupSlug]/recipes/tools/index.vue",
    path: f => `${g(f)}/recipes/tools`,
    texts: () => ["Tools", NAMES.tool],
  },
  {
    file: "g/[groupSlug]/recipes/finder/index.vue",
    path: f => `${g(f)}/recipes/finder`,
    texts: () => ["Recipe Finder", "Selected Ingredients"],
  },
  {
    file: "g/[groupSlug]/recipes/timeline.vue",
    path: f => `${g(f)}/recipes/timeline`,
    texts: () => ["Global Timeline", "Recipe Created", NAMES.recipe, NAMES.recipe2],
  },

  // ---------------------------------------------------------------- group settings & data
  {
    file: "group/index.vue",
    path: () => "/group",
    texts: () => ["Group Settings", "Group Preferences"],
  },
  {
    file: "group/migrations.vue",
    path: () => "/group/migrations",
    texts: () => ["Recipe Data Migrations", "New Migration", "Upload File"],
  },
  {
    file: "group/reports/[id].vue",
    path: f => `/group/reports/${f.reportId}`,
    texts: () => ["Report", "Mealie_Alpha Migration"],
  },
  {
    // Parent of every data/* page: the data-set picker header.
    file: "group/data.vue",
    path: () => "/group/data/units",
    texts: () => ["Data Management", "Select which data set you want to make changes to."],
  },
  {
    // Index child redirects to foods.
    file: "group/data/index.vue",
    path: () => "/group/data",
    finalPath: () => "/group/data/foods",
    texts: () => ["Data Management", "Food Data", NAMES.food],
  },
  {
    file: "group/data/foods.vue",
    path: () => "/group/data/foods",
    texts: () => ["Food Data", NAMES.food],
  },
  {
    file: "group/data/units.vue",
    path: () => "/group/data/units",
    texts: () => ["Units", NAMES.unit],
  },
  {
    file: "group/data/labels.vue",
    path: () => "/group/data/labels",
    texts: () => ["Labels", NAMES.label],
  },
  {
    file: "group/data/categories.vue",
    path: () => "/group/data/categories",
    texts: () => ["Category Data", NAMES.category],
  },
  {
    file: "group/data/tags.vue",
    path: () => "/group/data/tags",
    texts: () => ["Tag Data", NAMES.tag],
  },
  {
    file: "group/data/tools.vue",
    path: () => "/group/data/tools",
    texts: () => ["Tool Data", NAMES.tool],
  },
  {
    file: "group/data/recipes.vue",
    path: () => "/group/data/recipes",
    texts: () => ["Recipe Data", "Data Exports", NAMES.recipe],
  },
  {
    file: "group/data/recipe-actions.vue",
    path: () => "/group/data/recipe-actions",
    texts: () => ["Recipe Actions Data", NAMES.recipeAction],
  },

  // ---------------------------------------------------------------- household
  {
    file: "household/index.vue",
    path: () => "/household",
    texts: () => ["Household Settings", "Household Preferences"],
  },
  {
    file: "household/members.vue",
    path: () => "/household/members",
    texts: () => ["Manage Members", MEMBER.fullName],
  },
  {
    file: "household/notifiers.vue",
    path: () => "/household/notifiers",
    texts: () => ["Event Notifiers", NAMES.notifier],
  },
  {
    file: "household/webhooks.vue",
    path: () => "/household/webhooks",
    texts: () => ["Webhooks", NAMES.webhook],
  },
  {
    file: "household/mealplan/settings.vue",
    path: () => "/household/mealplan/settings",
    texts: () => ["Meal Plan Rules", "New Rule", "Recipe Rules"],
  },
  {
    // Parent of view/edit: the week range header.
    file: "household/mealplan/planner.vue",
    path: () => "/household/mealplan/planner",
    finalPath: () => /^\/household\/mealplan\/planner(\/view)?$/,
    texts: f => [plannerDay(f)],
  },
  {
    file: "household/mealplan/planner/view.vue",
    path: () => "/household/mealplan/planner/view",
    texts: f => [plannerDay(f), NAMES.recipe, NAMES.mealplanNote],
  },
  {
    file: "household/mealplan/planner/edit.vue",
    path: () => "/household/mealplan/planner/edit",
    texts: f => [plannerDay(f), NAMES.recipe, NAMES.mealplanNote],
  },

  // ---------------------------------------------------------------- shopping lists
  {
    file: "shopping-lists/index.vue",
    path: () => "/shopping-lists",
    texts: () => [NAMES.shoppingList, NAMES.shoppingList2],
  },
  {
    file: "shopping-lists/[id].vue",
    path: f => `/shopping-lists/${f.shoppingListId}`,
    texts: () => [NAMES.shoppingList, ...NAMES.shoppingItems],
  },

  // ---------------------------------------------------------------- user
  {
    file: "user/profile/index.vue",
    path: () => "/user/profile",
    texts: () => [`Welcome, ${ADMIN.fullName}!`, "Account Summary"],
  },
  {
    file: "user/profile/edit.vue",
    path: () => "/user/profile/edit",
    texts: () => ["User Settings", "Personal Information"],
    values: () => [ADMIN.email, ADMIN.fullName],
  },
  {
    file: "user/profile/api-tokens.vue",
    path: () => "/user/profile/api-tokens",
    texts: () => ["API Tokens", "Create an API Token"],
  },
  {
    file: "user/[id]/favorites.vue",
    path: f => `/user/${f.adminId}/favorites`,
    texts: () => ["User Favorites", NAMES.recipe],
  },
];

const CORE_ROUTE_FILES = new Set([
  // Public/auth surfaces needed before any user flow can start.
  "login.vue",
  "forgot-password.vue",
  "reset-password.vue",
  "register/index.vue",

  // Recipe-management scope for the Vue-to-React migration.
  "index.vue",
  "g/[groupSlug]/index.vue",
  "g/[groupSlug]/r/[slug]/index.vue",
  "g/[groupSlug]/shared/r/[id].vue",
  "g/[groupSlug]/cookbooks/index.vue",
  "g/[groupSlug]/cookbooks/[slug].vue",
  "g/[groupSlug]/r/create.vue",
  "g/[groupSlug]/r/create/index.vue",
  "g/[groupSlug]/r/create/ai.vue",
  "g/[groupSlug]/r/create/bulk.vue",
  "g/[groupSlug]/r/create/debug.vue",
  "g/[groupSlug]/r/create/html.vue",
  "g/[groupSlug]/r/create/image.vue",
  "g/[groupSlug]/r/create/new.vue",
  "g/[groupSlug]/r/create/url.vue",
  "g/[groupSlug]/r/create/zip.vue",
  "g/[groupSlug]/recipes/categories/index.vue",
  "g/[groupSlug]/recipes/tags/index.vue",
  "g/[groupSlug]/recipes/tools/index.vue",
  "g/[groupSlug]/recipes/finder/index.vue",
  "g/[groupSlug]/recipes/timeline.vue",

  // Closely related user journeys used by the core flow tests.
  "household/mealplan/planner.vue",
  "household/mealplan/planner/view.vue",
  "household/mealplan/planner/edit.vue",
  "shopping-lists/index.vue",
  "shopping-lists/[id].vue",
  "user/profile/index.vue",
  "user/profile/edit.vue",
  "user/profile/api-tokens.vue",
  "user/[id]/favorites.vue",
]);

export const CORE_ROUTES = ROUTES.filter(route => CORE_ROUTE_FILES.has(route.file));
export const EXTENDED_ROUTES = ROUTES.filter(route => !CORE_ROUTE_FILES.has(route.file));

export const ROUTE_SETS: Record<RouteScope, RouteCheck[]> = {
  all: ROUTES,
  core: CORE_ROUTES,
  extended: EXTENDED_ROUTES,
};
