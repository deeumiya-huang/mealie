# WF2 — Mealie frontend: Nuxt/Vue/Vuetify → React (orchestrated, phased)

This file is the single source of truth for the WF2 run. A fresh session with no memory of earlier
sessions must be able to execute the next step from this file alone. **§9 Status** is the only
section that changes routinely. §8 Decision log only gets new entries appended.

Branch: `rewrite/wf2-orchestrated`. Base commit (yardstick present, no WF2 work): `cb8bb5dcf`.

---

## 0. Goal (fixed, identical to the comparison baseline — never change it)

- Current app: `frontend/` (Nuxt 4, `ssr:false`, Vue 3 `<script setup>`, Vuetify 4, `@nuxtjs/i18n`,
  Nuxt auto-imports). Backend: FastAPI in `mealie/`.
- `frontend/app/lib/api/` (API clients + generated types) has no Vue dependency: reuse it.
- New app in `frontend-react/`: Vite + React 19 + TypeScript (strict; no `any` unless unavoidable and
  commented) + React Router (SPA) + MUI + react-i18next.
- Same URL routes as `frontend/app/pages/`, same backend API, same UI strings (load the existing
  `frontend/app/lang/messages/*.json`; never edit any locale file).
- Composables → hooks, Vuetify → MUI, middleware → route guards, plugins → providers.
- Build output: a static SPA the backend serves like the current `nuxt generate` output.
- Port the existing Vitest tests. Never delete a test or weaken an assertion to make it pass; if one
  cannot be ported, mark it skipped with a reason.
- Never modify `frontend/`, `mealie/`, `frontend-e2e/`, `rewrite-evidence/measure.sh`. Never push,
  open PRs, or publish anything.
- **Done** = in `frontend-react/`: `pnpm install`, `tsc --noEmit`, lint, `vitest run`, `build` all
  succeed; every page in `frontend/app/pages/` has a real (non-placeholder) React implementation;
  `./rewrite-evidence/measure.sh --app frontend-react --label WF2-final` passes all routes (66) and
  flows (15); `frontend-react/MIGRATION_REPORT.md` lists what was converted, what was not, known gaps,
  and the final output of each command above.

Acceptance tools (read-only): `frontend-e2e/` (Playwright: 66 routes + 15 flows) and
`rewrite-evidence/measure.sh`. See `rewrite-evidence/README.md` and `frontend-e2e/README.md`.

Environment: WSL2, 3.8 GiB RAM, Node 24, pnpm 11.23. Claude Pro plan; a PreToolUse hook
(`~/.claude/hooks/usage_guard.py`) blocks every tool call except `git status|add|commit|diff|log|stash`
and `usage_log.py` once 5-hour or weekly usage reaches 70 %.

---

## 1. Conventions and rules

### 1.1 Rules every agent follows (main session, porters, reviewers)

1. **Forbidden paths.** Never edit, create or delete anything under `frontend/`, `mealie/`,
   `frontend-e2e/`, or `rewrite-evidence/measure.sh`. Reading them is fine. `measure.sh` itself may
   append to `rewrite-evidence/metrics.csv` and `rewrite-evidence/runs/` (that is expected; commit it).
   Check: `git diff --quiet cb8bb5dcf HEAD -- frontend mealie frontend-e2e rewrite-evidence/measure.sh && git status --porcelain -- frontend mealie frontend-e2e rewrite-evidence/measure.sh | wc -l` → no diff, `0`.
2. **No outward actions.** No `git push`, no PRs, no publishing, no Artifacts, no external services.
3. **Same strings.** Every user-visible string comes from the i18n keys the Vue file uses
   (`t("same.key")`). Never hard-code English. Never edit `frontend/app/lang/**`.
4. **Same routes, same accessible contract.** The E2E suite selects only by role, accessible name,
   visible text and tooltip. So: every form field has a label equal to the Vue label; icon-only buttons
   get an MUI `Tooltip` with the Vue tooltip text (MUI copies it into `aria-label`), or an `aria-label`
   with the same text; tables are real `<table>` (MUI `Table`, not DataGrid — DataGrid cells are
   `gridcell`, not `cell`); navigation uses real links (`<a href>` via React Router `Link`); page titles
   are headings; checkboxes are real inputs; selects/autocompletes expose `role="combobox"` with the
   field label as accessible name and `role="option"` items.
5. **Port, don't stub.** Implement the whole Vue page/component behaviour, not just what the E2E route
   asserts. No placeholder pages. Never write `TODO`, `FIXME`, `XXX`, `HACK`, "not implemented",
   "coming soon", "placeholder page/component", "lorem ipsum", "under construction" anywhere in
   `frontend-react/src` (measure.sh counts them, the E2E health check fails on them). Record a real gap
   as a `GAP-<n>` entry in §9 "Known gaps" instead (and in the code, at most a neutral comment
   `// see GAP-<n> in PROCESS.md`).
6. **TypeScript strict.** No `any`. If truly unavoidable: `// any: <reason>` on the same or previous
   line. Prefer `unknown` + narrowing. No `@ts-ignore`; `@ts-expect-error` only with a reason.
7. **Tests.** Every Vue test file gets a React counterpart at the mirrored path (§1.9). Same `describe`
   / `test` titles, same number of tests, every assertion kept (adapted to React APIs, never loosened:
   no `toBeTruthy()` where Vue had `toBe(x)`, no removed `expect`). A test that cannot be ported becomes
   `test.skip("<same title>", ...)` with `// skip: <reason>` and an entry in §9 "Skipped tests".
   Never delete a test.
8. **Resource limits.** `vitest` always with `--maxWorkers=4` (main) or `--maxWorkers=2` (porters).
   At most 2 heavy jobs (build, vitest, tsc-full, E2E, measure.sh) at once on the machine. While two
   porters run, the main session runs no heavy job. Before a heavy job:
   `pgrep -fa "vitest|playwright|vite build|tsc|uvicorn" | grep -v pgrep` and wait/kill stale ones
   from earlier sessions. Never run two `pnpm install` at once.
9. **pnpm.** Always `pnpm install --frozen-lockfile` (add `--prefer-offline` in worktrees). Only the
   main session adds/changes dependencies (porters ask via their report). Never run `pnpm exec` before
   an install after a lockfile change (pnpm 11 auto-installs and can hang — see BASELINE.md).
10. **Commits.** Prefix `[WF2-<step-id>] ` (e.g. `[WF2-P3-04] Add vue-i18n compatible i18next setup`).
    Body: what and why, short. End with the attribution line
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (porters: their own model name).
    Usage-cap commits: `WIP: usage cap [WF2-<step-id>] <where it stopped>`.
11. **Decide, don't wait.** Outside review gates, never wait for the human. When unsure: pick the option
    closest to the Vue behaviour, append a decision to §8 with the reason, continue.
12. **Don't teach to the test.** Porters may read `frontend-e2e/lib/routes.ts` and `tests/flows/*` to
    learn the expected texts, but the Vue source is the spec. Never special-case E2E data.

### 1.2 Target stack and layout (`frontend-react/`)

Vite + React 19 + TypeScript strict, React Router (data router, `createBrowserRouter`), MUI (latest
stable major; `@mui/material`, `@emotion/*`, `@mui/x-date-pickers` with date-fns adapter, `@mui/lab`
for Timeline only), i18next + react-i18next, axios, date-fns, @mdi/js, dompurify, marked, fuse.js,
sse.js (same libs as Vue where framework-free). Tests: vitest + jsdom + @testing-library/react +
@testing-library/user-event. Lint: ESLint flat config, typescript-eslint, react-hooks, react-refresh,
@stylistic (2 spaces, double quotes, semicolons, trailing commas multiline — same style as `frontend/`).

```
frontend-react/
  CLAUDE.md               agent guide for this app (P2)
  MIGRATION_REPORT.md     final report (P5-04)
  index.html              head meta + dark-mode pre-paint script (same as nuxt.config head)
  vite.config.ts          aliases, build.outDir=dist, build.assetsDir="_nuxt" (backend caches _nuxt/* forever)
  vitest.config.ts        jsdom, setupFiles src/test/setup.ts, aliases
  tsconfig.json           ONE config, no "references" (measure.sh then runs `tsc --noEmit`)
  eslint.config.mjs
  public/                 copied from frontend/public (static assets only)
  scripts/
    sync-api.mjs          copies frontend/app/lib/api → src/lib/api (rewrites `~/` → `@/`)
    port-status.mjs       Vue file → React counterpart table; --domain <d>; exit 1 if any missing
    test-parity.mjs       per Vue test file: React file exists, test count equal, expect count ≥
  src/
    main.tsx  App.tsx     providers + RouterProvider
    config.ts             runtime constants (AUTH_TOKEN="mealie.access_token", theme defaults, SUB_PATH)
    lib/api/**            copy of frontend/app/lib/api (types/ never hand-edited; re-sync with script)
    lib/{validators,sanitize,recipe,icons}/**   ported 1:1 (framework-free)
    lib/http.ts           axios instance + interceptors (port of plugins/axios.ts)
    lib/store.ts          createStore/useStore (useSyncExternalStore) for module-level shared state
    i18n/                 i18next init, vue-i18n compat (plurals, {named}, {0}), useI18n(), locales loader
    providers/            AppInfoProvider, ThemeModeProvider, I18nProvider, ToastProvider …
    hooks/**              ports of composables/** (same sub-paths and file names)
    hooks/utils/**        replacements for VueUse/Vuetify helpers (useLocalStorage, useDisplay, …)
    components/**         ports of components/** (same sub-paths, .vue → .tsx, same component names)
    layouts/              DefaultLayout(default), AdminLayout(admin), BasicLayout, BlankLayout, ErrorPage
    pages/**              ports of pages/** (same paths incl. [param] names, .vue → .tsx)
    routes/
      index.tsx           composes domain route files under layout routes; root loader inits auth
      guards.ts           ports of middleware/*.ts as loader helpers
      auth.tsx admin.tsx group.tsx household.tsx shopping.tsx user.tsx
      explore.tsx recipe-page.tsx recipe-create.tsx   (one file per domain, §1.7)
    test/setup.ts test/utils.tsx    (ports of app/tests/*)
```

Locales are imported, not copied: alias `@locales` → `../frontend/app/lang` (messages/*.json,
dateTimeFormats/*.json) and `@unit-locales` → `../mealie/repos/seed/resources/units/locales`.
JSON only, so no bare-module resolution leaks into `frontend/node_modules`.

### 1.3 Vue reactivity / composition API → React

| Vue | React |
|---|---|
| `ref(x)` used in render | `useState(x)` |
| `ref(x)` not used in render (timers, handles, flags) | `useRef(x)` |
| `reactive({...})` | `useState` object with immutable updates, or `useReducer` for many fields |
| `computed(() => …)` | derive during render; `useMemo` only if expensive or identity is a dependency |
| writable `computed({get,set})` | value + setter function |
| `watch(src, cb)` | prefer doing the work in the event handler that changes `src`; else `useEffect(cb, [src])`, skip first run with a ref when Vue had no `immediate` |
| `watch(..., {immediate:true})` / `watchEffect` | `useEffect` with full deps |
| `watchDebounced` / `useDebounceFn` | `useDebouncedValue` / `useDebouncedCallback` in `hooks/utils` |
| `onMounted` / `onUnmounted` | `useEffect(() => { …; return cleanup }, [])` |
| `nextTick` | effect, or state-update callback; `flushSync` only if unavoidable |
| `defineProps<T>()` | `interface XxxProps` + function parameter destructuring with defaults |
| `defineModel()` / `v-model` | controlled `value` + `onChange(value)`; `v-model:foo` → `foo` + `onFooChange` |
| `emit("save", x)` | `onSave?: (x) => void` prop |
| default slot / named slots / scoped slots | `children` / `ReactNode` props (`actions`, `title`) / render props (`renderItem`) |
| `provide` / `inject` | React context (`createContext` + provider + `useXxx()` that throws outside provider) |
| template ref | `useRef` / `forwardRef` (React 19: `ref` prop) |
| `v-if` / `v-show` | conditional render / `hidden` or `sx={{display}}` |
| `v-for` | `.map` with a stable `key` (id/slug; index only for static lists) |
| `v-html` | only via `SafeMarkdown` / sanitized components (`dangerouslySetInnerHTML` with DOMPurify output) |
| module-scope `ref` shared between components (stores, caches) | `createStore` + `useStore(store, selector)` from `lib/store.ts` |
| `useAsyncData(key, fn)` | `useAsyncData(key, fn, deps)` in `hooks/utils` (module cache by key, `clearAsyncDataCache()` on logout = `clearNuxtData`) |
| VueUse `useLocalStorage`/`useStorage`, `useOnline`, `useIdle`, `useIntervalFn`, `useClipboard`, `useWakeLock` | small hooks in `hooks/utils` with the same storage keys and semantics |

Composable → hook naming: same file name under `src/hooks/`, same exported name (`useUserApi`,
`useMealieAuth`, `useShoppingListPage`…). Functions in composables that do not call React hooks
stay plain functions (do not prefix them `use…` if they are not hooks; keep the old name exported as
an alias only when tests import it).

### 1.4 Nuxt auto-imports and Nuxt APIs → explicit imports

Nothing is global in React: every identifier is imported explicitly; alias `@/` = `src/`.

| Nuxt / auto-import | React |
|---|---|
| `ref, computed, watch, onMounted…` (auto) | React hooks, §1.3 |
| `useNuxtApp().$axios` | `http` from `@/lib/http` (hooks: `useUserApi()`, `usePublicApi()`, `useAdminApi()` in `@/hooks/api`) |
| `useNuxtApp().$appInfo` | `useAppInfo()` (`AppInfoProvider`, fetched from `/api/app/about` before first render) |
| `useNuxtApp().$globals.icons` | `import { icons } from "@/lib/icons"` |
| `useRuntimeConfig()` | `@/config` constants |
| `useCookie`, `readTokenCookie` | `@/hooks/use-token-cookie` (document.cookie; same cookie name `mealie.access_token`) |
| `useRoute()` | `useParams()`, `useLocation()`, `useSearchParams()` |
| `useRouter().push/replace`, `navigateTo` (components) | `useNavigate()` |
| `navigateTo` (middleware) | `throw redirect(...)` in a loader guard |
| `definePageMeta({ layout, middleware })` | route object in `src/routes/<domain>.tsx` (layout group + `loader: guard(...)`) |
| `<NuxtPage />` in parent pages | `<Outlet />` |
| `<NuxtLink to>` / `:to` on v-btn | `<Link to>` / `<Button component={Link} to>` |
| `useSeoMeta` / `useHead({ title })` | `usePageTitle(title)` in `hooks/utils` (same title format as Vue) |
| `useI18n()`, `useGlobalI18n()`, `$t`, `$d` | `useI18n()` from `@/i18n` → `{ t, d, locale, setLocale }` |
| `useDisplay()` (Vuetify) | `useDisplay()` in `hooks/utils` (same names: `xs`, `smAndDown`, `mdAndUp`…, MUI breakpoints set to Vuetify's 0/600/960/1280/1920) |
| `useTheme()` (Vuetify) | MUI `useTheme()` + `useColorMode()` (dark mode key `vueuse-color-scheme`, same as Vue) |
| `clearNuxtData()` | `clearAsyncDataCache()` |
| `<ClientOnly>` | render directly (SPA) |

### 1.5 Vuetify → MUI

Shared wrappers live in `components/global/` and keep the Vue component names (BaseButton, BaseDialog…).
Icons: `<MdiIcon path={icons.foo} />` (MUI `SvgIcon` wrapper; `@mdi/js` paths from `lib/icons`).

| Vuetify | MUI / replacement |
|---|---|
| `v-app`, `v-main` | layout `Box` (in layouts) |
| `v-app-bar`, `v-toolbar`, `v-toolbar-title` | `AppBar`, `Toolbar`, `Typography` |
| `v-navigation-drawer` | `Drawer` (permanent ≥ lg, temporary below — same as Vue) |
| `v-footer` | `Box component="footer"` |
| `v-container` / `v-row` / `v-col` | `Container` / `Grid container` / `Grid size={{ xs, sm, md }}` |
| `v-spacer` | `<Box sx={{ flexGrow: 1 }} />` |
| `v-sheet`, `v-card`, `v-card-title/subtitle/text/actions` | `Paper`, `Card`, `CardHeader`/`Typography`, `CardContent`, `CardActions` |
| `v-divider` | `Divider` |
| `v-btn` (text / outlined / elevated / icon) | `Button variant="text"/"outlined"/"contained"`, `IconButton` (+ `Tooltip`) |
| `v-btn-toggle` | `ToggleButtonGroup` |
| `v-icon` | `MdiIcon` |
| `v-text-field` | `TextField` (label → `label`, `prepend-inner-icon` → `InputAdornment`, `clearable` → end adornment button, `hide-details` → no `helperText`) |
| `v-textarea` | `TextField multiline` |
| `v-number-input` | `BaseNumberInput` (TextField type=number + steppers) |
| `v-select` | `TextField select` / `Select` with `InputLabel` (`labelId`), items mapped from `item-title`/`item-value` |
| `v-autocomplete` | `Autocomplete` + `TextField label` |
| `v-combobox` | `Autocomplete freeSolo` |
| `v-checkbox`, `v-checkbox-btn` | `FormControlLabel` + `Checkbox`, bare `Checkbox` |
| `v-switch` | `FormControlLabel` + `Switch` |
| `v-radio-group`, `v-radio` | `RadioGroup`, `FormControlLabel` + `Radio` |
| `v-form` + `:rules` | `<form>` + `useFormValidation` (rule arrays from `lib/validators`, same messages) |
| `v-file-input` | `AppButtonUpload` / hidden `<input type="file">` |
| `v-list`, `v-list-item`, `-title`, `-subtitle`, `-action`, `-icon` | `List`, `ListItem`/`ListItemButton`, `ListItemText primary/secondary`, `ListItemSecondaryAction`, `ListItemIcon` |
| `v-list-group` | `ListItemButton` + `Collapse` |
| `v-list-item-group`, `v-item-group` | controlled selection state on `List` |
| `v-menu` | `Menu` / `Popover` (closes on scroll like Vuetify `scrollStrategy: close`) |
| `v-tooltip` | `Tooltip` |
| `v-dialog` | `Dialog` (via `BaseDialog`) |
| `v-bottom-sheet` | `Drawer anchor="bottom"` |
| `v-snackbar` | `Snackbar` + `Alert` (`TheSnackbar`) |
| `v-alert`, `v-banner` | `Alert` |
| `v-chip` | `Chip` |
| `v-avatar` | `Avatar` |
| `v-badge` | `Badge` |
| `v-img` | `BaseImg` (img with cover/contain, aspect ratio, fallback slot) |
| `v-responsive` | `Box sx={{ aspectRatio }}` |
| `v-data-table` | `BaseDataTable` (MUI `Table` + `TableSortLabel` + `TablePagination`, search, selection) |
| `v-virtual-scroll` | `@tanstack/react-virtual` (or plain list when ≤ 200 items — decide per use, log it) |
| `v-expansion-panels/-panel/-title/-text` | `Accordion`, `AccordionSummary`, `AccordionDetails` |
| `v-stepper*` | `Stepper`, `Step`, `StepLabel` + own window/actions |
| `v-timeline`, `v-timeline-item` | `@mui/lab` `Timeline*` |
| `v-rating` | `Rating` |
| `v-progress-linear`, `v-progress-circular` | `LinearProgress`, `CircularProgress` |
| `v-skeleton-loader` | `Skeleton` |
| `v-date-picker` | `@mui/x-date-pickers` `DateCalendar` / `DatePicker` (AdapterDateFns) |
| `v-color-picker` | `InputColor` (native `<input type="color">` + hex TextField) |
| `v-treeview` | nested `List` + `Collapse` |
| `v-fab` | `Fab` |
| `v-empty-state` | small `EmptyState` component (icon + headline + text) |
| `v-lazy` | render directly (or IntersectionObserver hook if a list is large) |
| `v-hover` | CSS `:hover` / `onMouseEnter` state |
| `v-*-transition`, `v-expand-transition` | `Fade`, `Slide`, `Collapse`, `Grow` |
| Vuetify theme colors `primary accent secondary success info warning error` | MUI palette `primary secondary info success warning error` + custom `accent` (module augmentation), same hex defaults as `nuxt.config.ts` |

### 1.6 i18n (react-i18next, vue-i18n compatible)

- Messages: `@locales/messages/<code>.json` + `unit-names` from `@unit-locales/<code>.json`, merged
  exactly like `frontend/app/lang/locales/<code>.ts`. Lazy-loaded per locale (`import.meta.glob`).
  The 42 locale codes, `dir` (ar-SA, he-IL rtl) and names come from `nuxt.config.ts` /
  `composables/use-locales/available-locales.ts`.
- Compat layer `src/i18n/compat.ts`: interpolation `{name}` (prefix `{`, suffix `}`), list
  interpolation `{0}` (array → index keys), vue-i18n pipe plurals (`a | b | c`: count 0→a, 1→b, else c;
  `a | b`: count 1→a, else b), `escapeValue: false` (React escapes). `t(key, named?, count?)` and
  `t(key, count)` behave like vue-i18n `t`. `d(date, format)` uses `@locales/dateTimeFormats/<code>.json`
  via `Intl.DateTimeFormat`. Fallback locale `en-US`; missing key renders the key (vue-i18n behaviour).
- Locale selection: same as Nuxt i18n (`no_prefix`, cookie `i18n_redirected`, browser language,
  fallback `en-US`); `<html lang dir>` updated on change.
- Unit tests: `src/test/setup.ts` initialises en-US synchronously (like `app/tests/setup.ts`).

### 1.7 Routing, layouts and guards

- One routes file per domain exporting `{ default?, admin?, basic?, blank? }: Record<Layout, RouteObject[]>`;
  `routes/index.tsx` puts each array under its layout route. A route is added **only when its page is
  ported** (unported URLs fall to the 404 page — never a placeholder page).
- Domains and their pages (66 total):

| Domain (routes file) | Pages (paths relative to `pages/`) | # |
|---|---|---|
| auth | `index`, `login`, `register/index`, `forgot-password`, `reset-password` | 5 |
| admin | `admin` (parent, no index), `admin/backups`, `admin/debug/openai`, `admin/debug/parser`, `admin/maintenance/index`, `admin/manage/groups/index`, `admin/manage/groups/[id]`, `admin/manage/households/index`, `admin/manage/households/[id]`, `admin/manage/users/index`, `admin/manage/users/[id]`, `admin/manage/users/create`, `admin/setup`, `admin/site-settings` | 14 |
| group | `group/index`, `group/migrations`, `group/reports/[id]`, `group/data` (parent), `group/data/{index,foods,units,labels,categories,tags,tools,recipes,recipe-actions}` | 13 |
| household | `household/index`, `household/members`, `household/notifiers`, `household/webhooks`, `household/mealplan/settings`, `household/mealplan/planner` (parent), `household/mealplan/planner/{edit,view}` | 8 |
| shopping | `shopping-lists/index`, `shopping-lists/[id]` | 2 |
| user | `user/profile/index`, `user/profile/edit`, `user/profile/api-tokens`, `user/[id]/favorites` | 4 |
| explore | `g/[groupSlug]/index`, `g/[groupSlug]/cookbooks/index`, `g/[groupSlug]/cookbooks/[slug]`, `g/[groupSlug]/recipes/{categories,tags,tools,finder}/index`, `g/[groupSlug]/recipes/timeline` | 8 |
| recipe-page | `g/[groupSlug]/r/[slug]/index`, `g/[groupSlug]/shared/r/[id]` | 2 |
| recipe-create | `g/[groupSlug]/r/create` (parent), `g/[groupSlug]/r/create/{index,ai,bulk,debug,html,image,new,url,zip}` | 10 |

- Layout per page = Vue `definePageMeta.layout` (none → `default`). Nested Nuxt parents
  (`admin.vue`, `group/data.vue`, `household/mealplan/planner.vue`, `g/[groupSlug]/r/create.vue`) become
  parent routes rendering `<Outlet />`; Nuxt index redirects (`create/index` → `url`, `create/image` →
  `ai`, `group/data/index` → `foods`, planner → `view`) become `<Navigate replace>`/loader redirects
  with the same final URL.
- Middleware → `routes/guards.ts` loader helpers, composed per route like the Vue `middleware` arrays
  (parent guards apply to children, as in Nuxt): `requireAuth` (→ `/login?redirect=<fullPath>`),
  `groupOnly`, `adminOnly`, `advancedOnly`, `canManageOnly`, `canManageHouseholdOnly`,
  `canOrganizeOnly`; the global `pwa-share-target-redirect` is a root-route loader. The root loader
  awaits auth init (`initTokenRefresh` + `getSession`, like `plugins/init-auth.client.ts`) so guards see
  the real session. (Decision D4: `adminOnly` redirects on a hard load too.)
- Plugins → providers in `App.tsx`, outermost first: `AppInfoProvider` (awaits `/api/app/about`) →
  `ThemeModeProvider` (MUI theme + dark mode) → `I18nProvider` → `ToastProvider` → `RouterProvider`.
  `no-autofill.client.ts` → effect in `App`; `globals.ts` → plain import of `icons`.

### 1.8 Shared state, API and auth

- `lib/http.ts` ports `plugins/axios.ts` exactly (Bearer from cookie, `X-Mealie-Embedded`, 401 →
  single shared refresh → replay once → logout redirect, `suppressAlert`, toast on `message`).
- Auth: `hooks/use-auth-backend.ts` keeps the Vue module-level state in a `createStore`; same token
  cookie, same refresh scheduling (`use-token-cookie.ts` is framework-free and copied with its test).
  `useMealieAuth()` returns `{ user, loggedIn, token, signIn, signOut, getSession, oauthSignIn }`.
- Stores (`composables/store/*`, `partials/use-store-factory`, `use-actions-factory`) → module-level
  stores + hooks with the same names; `clearAllStores()` on logout.
- `frontend/app/lib/api` is **copied** to `src/lib/api` by `scripts/sync-api.mjs` (Decision D1).
  `src/lib/api/types/**` is generated upstream: never hand-edit; re-run the sync script instead.

### 1.9 Tests mapping

- Vue test path → React test path: replace `frontend/app/` by `frontend-react/src/`, `composables/` by
  `hooks/`, `plugins/__tests__/axios.test.ts` → `lib/__tests__/http.test.ts`,
  `middleware/__tests__/auth.test.ts` → `routes/__tests__/guards.test.ts`; extension `.test.ts` → `.test.ts(x)`.
  (`scripts/test-parity.mjs` holds this mapping and the exceptions.)
- Composable tests → `renderHook` / `act` from `@testing-library/react`; values read from
  `result.current`; refs passed in by Vue tests become hook props (`rerender(newProps)`).
- Component tests (`mount`) → `render` + `screen` queries + `user-event`.
- `makeWrapper`, `stubI18n` → `src/test/utils.tsx` equivalents.
- Vue baseline: 48 test files, 517 tests, 817 `expect(`. Target: 48 mirrored files, ≥ 517 tests
  (new tests for the compat layer etc. are welcome), 0 failed, skipped only with recorded reasons.

### 1.10 Standard check commands (run from `frontend-react/`)

```bash
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit                         # 0 errors
pnpm exec eslint .                             # 0 errors (warnings allowed but listed in the report)
pnpm exec vitest run --maxWorkers=4            # 0 failed
pnpm build                                     # creates dist/index.html
node scripts/port-status.mjs [--domain <d>]    # 0 missing for the domains done so far
node scripts/test-parity.mjs                   # 0 missing / 0 count drops for ported files
# E2E subset (main session only; build first):
cd ../frontend-e2e && E2E_STATIC_DIR=../frontend-react/dist pnpm exec playwright test --project=routes -g "<route regex>"
cd ../frontend-e2e && E2E_STATIC_DIR=../frontend-react/dist pnpm exec playwright test --project=flows -g "<flow regex>"
```

`CHECKS` below = the first six lines (install … test-parity). `FORBIDDEN` = rule 1.1.1 check.

---

## 2. Executors and parallelism

- **main** — the main Claude Code session (Opus). Writes foundations/exemplars, merges, verifies, runs
  builds, E2E and measure.sh, keeps PROCESS.md current.
- **porter** — `.claude/agents/porter.md` (model sonnet, effort high, worktree isolation, background;
  P4-07 is spawned with the Agent `model: "opus"` override, D41). Ports one
  slice of files in its own worktree branch, runs only `tsc --noEmit` + `eslint` on its files +
  `vitest` for its test files (`--maxWorkers=2`), commits, reports.
- **reviewer** — `.claude/agents/reviewer.md` (read-only tools: Read, Grep, Glob; fresh context; model
  opus). Reviews code it did not write; returns findings; never edits.
- At most **2 subagents running at once**. A parallel group (PG) is the set of steps spawned together.

## 3. Phases and steps

Columns: **Exec** executor · **PG** parallel group (– = alone) · **Ends** whether the session ends
after this step (handoff, §5.3). Usage-log label is always `WF2-<step-id>-done` (logged after the
step's commit) unless stated. Commit prefix is always `[WF2-<step-id>] `. Every step's done criteria
include `FORBIDDEN` and a clean `git status` after the commit.

### P1 — Plan (done in session 1)

| ID | Goal | Exec | Done | Ends |
|---|---|---|---|---|
| P1 | Analyse codebase, propose this file | main | human approves at **G1**; log `WF2-P1-plan-approved` | no |

### P2 — Bootstrap the agent context (session 1)

| ID | Goal | Inputs | Exec | PG | Done criteria | Ends |
|---|---|---|---|---|---|---|
| P2 | Commit PROCESS.md; add "How to continue WF2" to root `CLAUDE.md` (symlink → `AGENTS.md`); write `frontend-react/CLAUDE.md`; `.claude/agents/porter.md`, `.claude/agents/reviewer.md`; hooks `.claude/hooks/wf2_post_edit.py`, `.claude/hooks/wf2_stop_gate.py`, `.claude/hooks/wf2_guard_paths.py`, registered in `.claude/settings.json`; `.gitignore` += `.claude/worktrees/`, `.claude/.wf2-*` | this file, `~/.claude/hooks/usage_guard.py` | main | – | `python3 -m py_compile .claude/hooks/wf2_*.py`; `python3 -m json.tool .claude/settings.json`; hook dry runs: `echo '{"tool_name":"Write","tool_input":{"file_path":"'$PWD'/frontend/x"}}' \| python3 .claude/hooks/wf2_guard_paths.py` denies; stop gate with no `frontend-react/package.json` allows; commit `[WF2-P2] …`; log `WF2-P2-context-ready` | **yes** |

Hooks (exact behaviour):
- `wf2_guard_paths.py` — PreToolUse on `Edit|Write|MultiEdit|NotebookEdit`: deny if the target path,
  in any checkout or worktree, is under `<checkout>/frontend/`, `<checkout>/mealie/`,
  `<checkout>/frontend-e2e/` or is `<checkout>/rewrite-evidence/measure.sh` (checkout = nearest parent
  containing `.git`). Also mirrored as `permissions.deny` `Edit(...)` rules for the main checkout.
- `wf2_post_edit.py` — PostToolUse on `Edit|Write|MultiEdit`: if the file is `*.ts|*.tsx` inside a
  `frontend-react/` directory (any checkout/worktree) whose `node_modules` exists: run
  `eslint --cache <file>` and incremental `tsc --noEmit --incremental --tsBuildInfoFile node_modules/.cache/tsc/tsbuildinfo`
  under a machine-wide `flock /tmp/wf2-tsc.lock` (wait ≤ 60 s, else skip with a note — keeps RAM
  bounded when porters run). Report (exit 2, stderr) only errors in the edited file + the count of
  other errors; silent on success. Timeout 180 s.
- `wf2_stop_gate.py` — Stop: **allow** when (a) usage ≥ 70 % (same snapshot logic as `usage_guard.py`),
  or (b) `frontend-react/package.json` or its `node_modules` is missing, or (c) §9 says
  `state: blocked` and the tree is clean. Otherwise run `tsc --noEmit` (incremental) and
  `eslint . --cache --quiet` in `frontend-react/`, and `git status --porcelain` (ignoring
  `rewrite-evidence/runs/`). All green and clean → allow and reset the block counter. Else **block**
  with the first 20 error lines and: "Fix these, or — if this is a planned boundary/cap — commit
  (WIP if needed), update §9, then stop." Planned session-boundary stops pass naturally because a step
  ends only after its checks pass and its commit. Loop protection: counter in `.claude/.wf2-stop-blocks`;
  after 3 consecutive blocks allow with a `systemMessage` warning.

### P3 — Sequential foundation

| ID | Goal | Inputs (Vue) | Exec | PG | Done criteria (in addition to FORBIDDEN, commit, log) | Ends |
|---|---|---|---|---|---|---|
| P3-01 | One-time env setup for E2E (`uv sync --frozen`, `(cd frontend-e2e && pnpm install --frozen-lockfile)`; chromium already in `~/.cache/ms-playwright`). Scaffold `frontend-react/` per §1.2 (deps, configs, `public/` copy, `index.html`, `App.tsx` with providers skeleton, one smoke test), scripts `sync-api.mjs`, `port-status.mjs` (mapping §1.2/§1.9, exceptions list, `--domain`), `test-parity.mjs`; `.gitignore` (`dist`, `node_modules`, `coverage`, `.eslintcache`) | `frontend/package.json`, `nuxt.config.ts`, `frontend/public`, `eslint.config.mjs` | main | – | `CHECKS` green; `ls dist/index.html dist/_nuxt`; `tsconfig.json` has no `references`; record chosen package versions in §8 | no |
| P3-02 | Copy `lib/api` (sync script); port `lib/validators`, `lib/sanitize`, `lib/recipe`, `lib/icons` + their 7 tests (`lib/api/base/routes.test.ts`, validators ×3, sanitize ×2, recipe ×2) | `app/lib/**` | main | – | `CHECKS`; test-parity shows these 8 files equal | no |
| P3-03 | Core infra: `lib/store.ts`, `lib/http.ts` (+`axios.test`), `hooks/use-token-cookie` (+test), `use-auth-backend` (+test), `use-mealie-auth`, `use-logged-in-state`, `use-toast` (+test), `use-utils` (+test), `use-passwords` (+test), `use-validators`, `use-clear-composable-caches`, `hooks/api/*`, `hooks/partials/*` (+`use-actions-factory.test`), `hooks/store/*`, `hooks/utils/*` (useAsyncData, useLocalStorage, useDisplay, usePageTitle, debounce, online/idle, clipboard, wake lock), providers AppInfo/ThemeMode (theme.ts, dark-mode.client.ts)/Toast | `composables/{api,partials,store}`, the listed composables, `plugins/*` | main | – | `CHECKS`; test-parity equal for the 8 listed tests | **yes** |
| P3-04 | i18n per §1.6 incl. `src/test/setup.ts` + `src/test/utils.tsx`; new tests for the compat layer (plural choice, `{named}`, `{0}`, missing key, `d()`), `use-locales` hook, `LanguageDialog` | `i18n.config.ts`, `lang/locales/*.ts`, `composables/use-locales/*`, `use-global-i18n.ts`, `tests/*` | main | – | `CHECKS`; a test renders `t("general.save")` = "Save" and `items-checked-count` with 0/1/5 | no |
| P3-05 | Exemplar primitives that fix the conventions: `MdiIcon`, `BaseButton`, `BaseButtonGroup`, `BaseDialog`, `BaseDialogContent`, `BaseMenu`, `BasePageTitle`, `BaseCardSectionTitle`, `BaseDataTable`, `BaseNumberInput`, `BaseImg`, `EmptyState`, `useFormValidation`, `AppLoader`, `SafeMarkdown` | `components/global/*` of the same names | main | – | `CHECKS`; each has a short usage comment at top | **yes** |
| P3-06 | All remaining `components/global/**` (39 files incl. `Transition/*`; e.g. `DropZone` + its test, `AutoForm`, `CrudTable`, `ImageCropper`, `MarkdownEditor`, `RecipeJsonEditor`, `AppToolbar`, `HelpIcon`, `ToggleState`, `BannerWarning`, …) — everything in `components/global/` not done in P3-04/05. After this step no P4 domain owns a global component | `components/global/**` | porter (brief §4.2) | – | main after merge: `CHECKS`; `port-status --domain global` 0 missing; DropZone test parity | **yes** |
| P3-07 | Router + guards + layouts + auth domain: `routes/index.tsx`, `guards.ts` (+ `auth.test` port), all 9 domain route files (auth filled, others empty arrays), layouts (default/admin/basic/blank/error + `components/Layout/**` incl. `AppHeader`, `AppSidebar`, `AppFooter`, `TheSnackbar`), `AnnouncementDialog` + `Announcements/*` (+ `announcements.test`) + `use-announcements`, auth pages (`index`, `login`, `register/index` + `register/states.ts` + its test, `forgot-password`, `reset-password`) + `UserRegistrationForm`, `UserPasswordStrength`, `use-users/user-registration-form`, `use-default-activity`. Header search button is wired in P3-09 (record it in §9 Pending wiring) | `pages/*` listed, `layouts/*`, `middleware/*`, `components/Layout/**` | main | – | `CHECKS`; build; E2E per §3.1 for P3-07 green | **yes** |
| P3-08 | Shared hooks used by ≥ 2 domains: `hooks/recipes/*` (+9 tests), `recipe-page/shared-state`, `shopping-list-page/use-add-to-shopping-list-dialog`, `use-search` (+test), `use-query-filter-builder` (+test), `use-group-mealplan`, `use-users/{index,preferences,user-form,user-ratings}`, `use-ai-providers`, `use-context-presents`, `use-copy`, `use-group-recipe-actions`, `use-groups`, `use-households`, `use-backups`, `use-navigation-warning`, `use-router`, `use-scroll-position`, `forms/*`, `api/use-downloader` | `composables/**` listed | porter | – | main: `CHECKS`; test-parity equal for the 11 test files | **yes** |
| P3-09 | Shared components A (recipe cards, menus, dialogs): `RecipeCard`, `RecipeCardImage`, `RecipeCardMobile`, `RecipeCardRating`, `RecipeCardSection`, `RecipeCardLineItem`, `RecipeChips`, `RecipeFavoriteBadge`, `RecipeContextMenu/*`, `RecipeDialogAddToShoppingList`, `RecipeDialogBulkAdd`, `RecipeDialogPrintPreferences`, `RecipeDialogSearch` (+test), `RecipeDialogShare`, `RecipePrintView`, `RecipeTimeCard`, `RecipeIngredientListItem`, `RecipeIngredientSubstitutions`, `RecipeIngredientSubstitutionEditor`, `MealPlanAddRecipeDialog`, `MealPlanDatePicker`, `UserAvatar`, `AppScrollToTop`, `RecipeTimeline`, `RecipeTimelineItem`, `RecipeTimelineContextMenu` (moved from P3-10, D41); wire header search | `components/Domain/**` listed | porter | D | main: `CHECKS`; RecipeDialogSearch test parity; header search opens dialog (unit test) | no |
| P3-10 | Shared components B: `RecipeOrganizerDialog`, `RecipeOrganizerSelector`, `RecipeSettingsSwitches`, `RecipeTimeInput`, `QueryFilterBuilder`, `SearchFilter`, `GroupAIProviderDialog` (+test), `GroupAIProviderSettingsEditor`, `GroupPreferencesEditor`, `HouseholdPreferencesEditor`, `UserInviteDialog` | `components/Domain/**` listed | porter | D | main: `CHECKS`; GroupAIProviderDialog test parity | **yes** (after both PG-D steps) |
| P3-11 | **Pilot of the P4 procedure**: domain `user` (4 pages + `Domain/User/UserProfileLinkCard`) run exactly as a P4 step (§4.4) | `pages/user/**` | porter | – | P4 done criteria for `user` incl. E2E per §3.1 | no |
| P3-12 | Foundation checkpoint + **G2 packet**: `./rewrite-evidence/measure.sh --app frontend-react --label WF2-P3-foundation-done`; screenshots (Playwright script in scratchpad, not in `frontend-e2e/`) of `/login` light, `/user/profile` light + dark, `/user/<id>/favorites`, an open `LanguageDialog` → `frontend-react/docs/g2/*.png`; write §9 G2 checklist | — | main | – | metrics row appended (build_ok 1, tsc 0, lint 0, unit_failed 0); commit incl. metrics/runs; log `WF2-G2-ready`; tell human G2 is ready | **yes (G2)** |

### P4 — Parallel domain porting (porters; main merges and verifies)

Each step owns the pages of its domain (§1.7), its routes file, and the domain-only files below
(plus any new files it creates under `components/Domain/<Area>/` or `hooks/` for that domain).

| ID | Domain | Owned Vue sources besides pages (`components/` and `composables/` prefixes omitted) | Tests to port | PG | Ends |
|---|---|---|---|---|---|
| P4-01 | shopping | `Domain/ShoppingList/{MultiPurposeLabelSection,ShoppingListAddItemForm,ShoppingListItem,ShoppingListItemDetails,ShoppingListItemEditor}`, `Domain/Recipe/RecipeList`, `shopping-list-page/**` except `use-add-to-shopping-list-dialog` | the 11 under `shopping-list-page/**` | A | no |
| P4-02 | admin | `Domain/Admin/Setup/EndPageContent`, `use-setup/*`, `use-user.ts` | – | A | **yes** |
| P4-03 | household | `Domain/Household/{GroupMealPlanEntryDialog,GroupMealPlanRuleForm,GroupWebhookEditor}`, `Domain/Mealplan/{MealPlanDay,MealPlanDayHeader,MealPlanLayout,MealPlanNoteMenu}`, `Domain/Recipe/RecipeSelector`, `use-group-webhooks`, `use-mealplan-rules` | `use-mealplan-rules` | B | no |
| P4-04 | group | `Domain/Group/{GroupDataPage,GroupExportData}`, `Domain/Recipe/{RecipeDataAliasManagerDialog,RecipeDataSubstitutionManagerDialog,RecipeDataTable}`, `Domain/ShoppingList/MultiPurposeLabel` | `RecipeDataAliasManagerDialog` | B | **yes** |
| P4-05 | explore | `Domain/Cookbook/*`, `Domain/Recipe/RecipeExplorerPage/**`, `Domain/Recipe/{RecipeOrganizerPage,RecipeSuggestion}`, `use-group-cookbooks`, `use-recipe-explorer-search` | – (`recipe-finder` done in P3-02) | C | no |
| P4-06 | recipe-create | `Domain/Recipe/RecipeImportImages`, `use-new-recipe-options` | – | C | **yes** |
| P4-07 | recipe-page | `Domain/Recipe/RecipePage/**`, `Domain/Recipe/{RecipeActionMenu,RecipeAssets,RecipeImageLightbox,RecipeImageUploadBtn,RecipeIngredientEditor,RecipeIngredientEditorLayout,RecipeIngredientHtml,RecipeIngredients,RecipeLastMade,RecipeNotes,RecipeNutrition,RecipePrintContainer,RecipeRating,RecipeScaleEditButton,RecipeSettingsMenu,RecipeTimelineBadge,RecipeUnitSystemButton,RecipeYield}`, `recipe-page/{use-cook-mode-query,use-extract-ingredient-references}`, `recipes/use-parse-ingredients-dialog` | `RecipeIngredients`, `use-cook-mode-query`, `use-extract-ingredient-references`, `use-parse-ingredients-dialog` | – (alone; ~7 k lines, may need a resume; porter runs on Opus, D41) | **yes** |
| P4-08 | checkpoint: `./rewrite-evidence/measure.sh --app frontend-react --label WF2-P4-done`; list failing routes/flows in §9 as the P5-01 work list (main) | – | – | – | **yes** |

If a file turns out to be used by another domain too (the analysis was static), the first step that
needs it ports it, and the main session records the ownership in §9 notes.

### 3.1 E2E subsets per step (main session, after build; from `frontend-e2e/`)

Command: `E2E_STATIC_DIR=../frontend-react/dist pnpm exec playwright test --project=<p> -g '<regex>'`.
A flow is assigned to the first step after which all pages it touches exist.

| Step | `--project=routes -g` | `--project=flows -g` |
|---|---|---|
| P3-07 | `\[route\] (login\|register/index\|forgot-password\|reset-password)\.vue` | `wrong password` |
| P3-11 | `\[route\] user/` | `full name` |
| P4-01 | `\[route\] shopping-lists/` | `create a shopping list\|check it off` |
| P4-02 | `\[route\] admin` | `create a user` |
| P4-03 | `\[route\] household/` | `meal plan` |
| P4-04 | `\[route\] group/` | `create a tag` |
| P4-05 | `\[route\] (index\.vue\|g/\[groupSlug\]/(index\.vue\|cookbooks/\|recipes/))` | `log in with valid\|log out\|offered admin\|search narrows` |
| P4-06 | `\[route\] g/\[groupSlug\]/r/create` | `create a recipe` |
| P4-07 | `\[route\] g/\[groupSlug\]/(r/\[slug\]\|shared/)` | `open a recipe\|comment on a recipe` |

(In this table `\|` is markdown escaping: type a plain `|` in the shell.) 15 flows in total; the
P4-05 regex covers 5 flows (`offered admin` matches both admin-navigation flows). In PG-C merge
P4-05 before P4-06 (the create flow ends on the recipe list).

P4 step procedure (main session): §4.4. Order: PG-A (P4-01 ∥ P4-02) → PG-B (P4-03 ∥ P4-04) →
PG-C (P4-05 ∥ P4-06) → P4-07 → P4-08. A PG's session ends after both its steps are merged and verified.

### P5 — Integration, independent review, final

| ID | Goal | Exec | PG | Done criteria | Ends |
|---|---|---|---|---|---|
| P5-01 | Integration: apply SHARED-CHANGE-REQUESTs from porter reports; PWA (`vite-plugin-pwa`, same workbox options as `nuxt.config.ts`, `manifest: false`); `SUB_PATH` → Vite `base` + router `basename`; error/404 page parity; fix every failing route/flow from P4-08; zero `any` without comment, zero TODO-like hits | main (may spawn ≤ 2 porters for domain-local fix lists, §4) | – | `CHECKS`; `port-status` 0 missing overall; full E2E 66/66 routes, 15/15 flows (`E2E_STATIC_DIR=../frontend-react/dist pnpm exec playwright test`), re-run once more to rule out flakes | **yes** |
| P5-02 | Independent review: reviewer R1 = foundation (`lib`, `i18n`, `providers`, `routes`, `hooks`, `components/global`, `layouts`); reviewer R2 = domains (`pages`, `components/Domain`). Brief §4.3. Main writes findings to `frontend-react/REVIEW.md` (severity, file:line, fix/decline + reason) | reviewer ×2 | R | `REVIEW.md` committed | no |
| P5-03 | Fix all `high`/`medium` findings (decline only with reason in REVIEW.md) | main (+ porters if > 15 domain-local fixes) | – | `CHECKS`; full E2E 66/15 | **yes** |
| P5-04 | Final: `./rewrite-evidence/measure.sh --app frontend-react --label WF2-final` (tree must be clean, `dirty=0`); write `frontend-react/MIGRATION_REPORT.md` (converted (from port-status), not converted + why, known gaps (§9), skipped tests, deviations (§8), final output of install / tsc / lint / vitest / build / measure row) | main | – | measure: routes 66/66, flows 15/15, build_ok 1, tsc 0, lint 0, unit_failed 0; commit; log `WF2-final`; tell human WF2 is done | **yes (end)** |

---

## 4. Subagents

### 4.1 Definitions (`.claude/agents/`)

- `porter.md` — frontmatter: `name: porter`, `description` (ports one assigned slice per PROCESS.md),
  `model: sonnet`, `effort: high`, `tools: Read, Write, Edit, Glob, Grep, Bash`, `isolation: worktree`,
  `background: true` (keys the installed CLI ignores are harmless; the spawn call also passes
  `isolation: "worktree"`). Body: rules §1.1, mapping tables pointer (§1.3–1.9, `frontend-react/CLAUDE.md`),
  branch/commit/check/report protocol below.
- `reviewer.md` — `name: reviewer`, `model: opus`, `tools: Read, Grep, Glob` (read-only), body: review
  checklist (CLAUDE.md "What to Review" adapted to React + §1.1 rules + behavioural parity with the Vue
  file), output format, "you did not write this code; report, never fix".

### 4.2 Porter brief template (main fills `<…>` and passes it as the Agent prompt)

```
You are porter for WF2 step <STEP-ID> (<domain/slice>). Read PROCESS.md §0, §1, §4.2 and
frontend-react/CLAUDE.md first.

Setup (first commands, in your worktree root):
  git switch -c wf2/<STEP-ID>-<slug>            # resume case: git switch wf2/<STEP-ID>-<slug>
  cd frontend-react && pnpm install --frozen-lockfile --prefer-offline
Port these Vue files (source → target, mirrored paths per §1.2):
  <list>
Pages → add their routes to src/routes/<domain>.tsx under the layout groups given by each page's
definePageMeta (guards per middleware arrays).
Tests to port (keep titles, counts, every assertion): <list or "none">
Shared modules already available (import, do not copy): src/lib/**, src/hooks/**, src/components/global/**,
  src/components/Domain/** (shared ones), src/i18n, src/routes/guards.ts. Read their exports first.
You own ONLY: <owned paths>. Do not edit any other file. If a shared file needs a change, work around it
inside your owned files and add a SHARED-CHANGE-REQUEST to your report.
Expected E2E texts for your pages (read-only reference): frontend-e2e/lib/routes.ts entries <files>.
Checks before each commit (from frontend-react/): pnpm exec tsc --noEmit; pnpm exec eslint <your dirs>;
  pnpm exec vitest run --maxWorkers=2 <your test files>. Never run build, E2E or measure.sh.
Commit after every 2–5 files that type-check: "[WF2-<STEP-ID>] <what>". If you are blocked by the usage
cap: git add -A && git commit -m "WIP: usage cap [WF2-<STEP-ID>] <where>" and stop.
Final report (your last message), exactly these sections:
  BRANCH / LAST COMMIT
  CONVERTED (vue file → react file)
  TESTS (file: vue tests/expects → react tests/expects, skipped + reason)
  NOT CONVERTED / GAPS (with reason)
  DEVIATIONS from Vue behaviour (with reason)
  SHARED-CHANGE-REQUESTS (file, change, why)
  CHECK OUTPUT (last lines of tsc, eslint, vitest)
```

### 4.3 Reviewer brief template

```
You are reviewer <R1|R2> for WF2. You did not write this code. Read PROCESS.md §0–§1 and
frontend-react/CLAUDE.md. Scope: <paths>. For each file compare against its Vue source (mirrored path
under frontend/app/) for behavioural parity, then check: rules §1.1 (strings via i18n, accessible
names, no any/TODO, no stubs), React correctness (hooks rules, effect deps, stale closures, keys,
memory leaks/timers, race conditions on async effects), auth/multi-tenant handling (guards, group slug),
security (dangerouslySetInnerHTML only with DOMPurify, redirect validation), test parity
(no weakened assertions). Do not report style/formatting. Output a list:
  severity (high|medium|low) | file:line | finding | suggested fix
Max 40 findings, most severe first. Then 3 lines: overall assessment.
```

### 4.4 Spawning, merging, verifying, resuming (main session)

1. **Before spawning**: write each task into §9 "Active subagents" (step, branch
   `wf2/<STEP-ID>-<slug>`, started time, state `running`), commit `[WF2-<STEP-ID>] Start porter`.
2. Spawn with the Agent tool: `subagent_type: "porter"`, `isolation: "worktree"`, prompt = brief §4.2.
   Max 2 running. Then end the turn; you are re-invoked when a porter finishes. Do not poll.
3. **Merge** (one porter at a time, in the main checkout): `git merge --no-ff wf2/<STEP-ID>-<slug> -m
   "[WF2-<STEP-ID>] Merge <domain> port"`. Conflicts should not happen (ownership); if they do, keep both
   sides' intent, never drop the porter's tests.
4. **Verify**: `CHECKS`; `port-status --domain <d>` 0 missing; `test-parity`; build; E2E subset from the
   step table. Small fixes: do them yourself, commit `[WF2-<STEP-ID>] Fix …`. Large/many fixes: spawn
   the same porter brief in resume mode with a fix list.
5. Record report highlights in §9 (gaps, SHARED-CHANGE-REQUESTs, skipped tests); mark the step done;
   remove the worktree (`git worktree remove <path>`; keep the branch); commit; log usage.
6. **Resume an interrupted porter** (new session finds §9 "Active subagents" with state `running` and no
   result): `git worktree list` + `git log --oneline -5 wf2/<STEP-ID>-<slug>`. If its worktree has
   uncommitted changes: `git -C <path> add -A && git -C <path> commit -m "WIP: interrupted [WF2-<STEP-ID>]"`.
   `git worktree remove --force <path>` (branch kept). Spawn a new porter with the same brief plus:
   "RESUME: first `git switch wf2/<STEP-ID>-<slug>`; `git log` and `git diff cb8bb5dcf --stat --
   frontend-react` show what is done; continue with the rest." Update §9 (state `resumed`, time).

---

## 5. Session protocol

### 5.1 On "繼續" (or any session start)

1. Read §9 Status, then `git status`, `git log --oneline -5`, `git worktree list`.
2. If HEAD is a `WIP: usage cap` / `WIP: interrupted` commit, or §9 shows a step `in-progress`: resume
   that step (for porters §4.4.6; for main steps re-read the step row and continue from the files
   that exist).
3. If §9 shows `gate: G2 waiting`: the human's "繼續" means **G2 approved** → log
   `WF2-G2-approved`, set §9 to the next step, continue. Any other text from the human at a gate is
   change requests: do them first, then continue.
4. Check for stale heavy processes (§1.1 rule 8). Then execute steps in order until a step with
   **Ends = yes** is done, or the usage cap blocks. Context limit: if the conversation was auto-compacted, or
   about 60 % of the context window is used, finish the current step (or PG) and hand off per §5.3.1 even if
   its Ends = no (D41).
5. Never ask the human anything outside a gate. Decide, log in §8, continue.

### 5.2 During a step

- Before starting a step set §9 `current_step: <id>`, `state: in-progress` (no separate commit needed).
- Keep work committed at least every ~30 min of work, so a usage-cap stop loses little (after the cap,
  only `git add/commit` works — Edit/Write and PROCESS.md edits are blocked).
- A step is done only when all its done criteria were run and passed in this session.

### 5.3 Ending a session (handoff)

1. Planned boundary (step with Ends = yes is done): update §9 (last completed, next step, notes,
   gaps), commit `[WF2-<step-id>] Update status`, log `WF2-<step-id>-done` (if not yet) with
   `--note "<one line>"`, then tell the human exactly: **"Run /clear, then type 繼續."**
   Prefer this to automatic context compaction; if compaction happens mid-step, re-read PROCESS.md.
2. Usage cap hit: `git add -A && git commit -m "WIP: usage cap [WF2-<step-id>] <where>"` (the commit
   message replaces the §9 update, which is blocked), run
   `python3 ~/.claude/hooks/usage_log.py "WF2-<step-id>-cap" --note "<where>"`, tell the human:
   "Usage cap reached at <step>. After the limit resets: /clear, then 繼續."
3. Blocked (a check fails and cannot be fixed this session): set §9 `state: blocked` + reason,
   commit, log `WF2-<step-id>-blocked`, tell the human; next session starts by retrying.

## 6. Review gates

- **G1** — this plan (session 1). Human approves → P2.
- **G2** — after P3-12 (foundation + pilot porter, before the parallel phase multiplies conventions).
  The human checks, in this order (≈ 15 min):
  1. `rewrite-evidence/metrics.csv` last row `WF2-P3-foundation-done`: `build_ok=1`, `tsc_errors=0`,
     `lint_errors=0`, `unit_failed=0`, routes passed ≥ 8 (4 auth pages + 4 user pages; `index.vue` needs the
     recipe list from P4-05), and `test_files`/
     `expect_count` growing towards 48/817.
  2. Screenshots `frontend-react/docs/g2/*.png` vs the Vue app: layout, sidebar, header, colours,
     dark mode, dialog look. Acceptable as "same app"?
  3. Read two files against their Vue sources: `src/components/global/BaseDialog.tsx` (main-written
     primitive) and `src/pages/user/profile/index.tsx` (porter-written page). Idiomatic React? Same
     behaviour?
  4. Skim §8 decisions D1–D… and veto any.
  Reply **"繼續"** = approved; anything else = change requests (done before P4).
- Outside G1/G2 the workflow never waits for the human.

## 7. Usage logging

`python3 ~/.claude/hooks/usage_log.py "<label>" --note "<short note>"` — labels: `WF2-P1-plan-approved`,
`WF2-P2-context-ready`, `WF2-<step-id>-done` after each step's commit, `WF2-<step-id>-cap`,
`WF2-<step-id>-blocked`, `WF2-G2-ready`, `WF2-G2-approved`, `WF2-final`. Session start/end rows are
logged automatically by the user-level hooks.

---

## 8. Decision log (append only: `D<n> — <date> — decision — reason`)

- D1 — 2026-10-05 — Copy `frontend/app/lib/api` into `src/lib/api` via `scripts/sync-api.mjs` instead of
  importing across directories. — A cross-dir import resolves bare modules (`axios`) from
  `frontend/node_modules`, which does not exist in porter worktrees; the copy keeps the build
  self-contained and the types still come from codegen (re-sync, never hand-edit).
- D2 — 2026-10-05 — i18next with a vue-i18n compat layer (braces interpolation, pipe plurals, list
  interpolation, datetime formats) instead of converting messages. — Locale files must not change;
  10 en-US keys use pipe plurals, 16+ use `{count}`/`{0}`.
- D3 — 2026-10-05 — `v-data-table` → MUI `Table` (`BaseDataTable`), not MUI X DataGrid. — E2E uses
  `getByRole("cell")`; DataGrid renders `gridcell`. Also lighter.
- D4 — 2026-10-05 — Guards are React Router loaders; `adminOnly` redirects non-admins to `/` also on a
  hard load. — Matches the middleware's intent; the Vue hard-load leak is a known bug
  (frontend-e2e/README) and the yardstick does not depend on it. Reported as a deviation.
- D5 — 2026-10-05 — Vite `build.assetsDir = "_nuxt"`. — `mealie/routes/spa` sets immutable caching only
  for `_nuxt/*`; same path keeps production caching identical without touching the backend.
- D6 — 2026-10-05 — Shared state via `createStore` + `useSyncExternalStore`; no Redux/TanStack Query.
  — Mirrors the Vue module-level refs 1:1, keeps composable tests portable, no new concepts.
- D7 — 2026-10-05 — Mirror Vue paths and names (`components/**`, `pages/**` with `[param]`,
  `composables/**` → `hooks/**`). — Traceability for porters, port-status, review and the report.
- D8 — 2026-10-05 — One `tsconfig.json` without project references. — measure.sh then runs
  `tsc --noEmit`, the command named in the goal.
- D9 — 2026-10-05 — Date pickers from `@mui/x-date-pickers` (MIT), Timeline from `@mui/lab`; no other
  MUI X packages; small own hooks instead of a VueUse equivalent. — Closest MUI-family matches, few deps.
- D10 — 2026-10-05 — Porters on Sonnet, reviewers on Opus, main on Opus. — Porting is high-volume
  pattern work (quota); review benefits from a different, stronger model than the author.
- D11 — 2026-10-05 — Shared Domain components (used by ≥ 2 domains or by layouts, ~6 k lines) are
  ported in P3-08..10 before the parallel phase. — Lets P4 porters own disjoint files, so merges
  don't conflict. The header search depends on the recipe card/context-menu stack.
- D12 — 2026-10-05 — Pilot porter run (`user` domain) inside P3, before G2. — Exercises worktree,
  merge, resume and brief once on a small domain, and gives G2 a porter-written page to judge.
- D13 — 2026-10-05 — E2E subsets after every merge; full measure.sh only at P3-12, P4-08, P5-04
  (≈ 8 min, memory-heavy). — Fast feedback without saturating 3.8 GiB.
- D14 — 2026-10-05 — Stop gate checks tsc + eslint + clean tree (not vitest/build). — Seconds instead of
  minutes on every stop; vitest/build are in each step's done criteria.
- D15 — 2026-10-05 — Forbidden-path protection is two layers: absolute `Edit(//home/deeumiya/mealie-wf2/…)`
  deny rules in `.claude/settings.json` (main checkout) and `wf2_guard_paths.py` (any checkout/worktree,
  resolved from the target's nearest `.git`). Bash writes are not intercepted; the FORBIDDEN check in
  every step's done criteria catches them. — Permission rules don't follow worktree paths.
- D16 — 2026-10-05 — Porter commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
  (their actual model); main-session commits with the Opus 5.5 line. — Accurate attribution.
- D17 — 2026-10-05 — Package versions (P3-01): react/react-dom 19.3.0, react-router 8.4.0, @mui/material 9.4.0,
  @mui/x-date-pickers 9.14.0, @mui/lab 9.0.0-beta.9, @emotion/react 11.14.0, i18next 26.4.2, react-i18next 17.0.15,
  axios 1.20.0, date-fns 4.4.0, dompurify 3.4.16, marked 15.0.12 (same major as Vue), fuse.js 7.5.0, sse.js 2.8.0,
  vite 8.3.2, @vitejs/plugin-react 6.1.1, vitest 5.0.3, jsdom 30.1.2, @testing-library/react 16.3.3,
  eslint 10.12.0, typescript-eslint 8.71.0, typescript **6.0.3** (not 7.x: typescript-eslint requires <6.1).
  — Latest stable majors; TS pinned by the linter's peer range.
- D18 — 2026-10-05 — `dompurify` instead of `isomorphic-dompurify`; Vue-only libraries (`vue-advanced-cropper`,
  `json-editor-vue`, `vue-draggable-plus`/`sortablejs`) get React replacements added by main right before the
  step that needs them (P3-06 for the global components). — SPA and jsdom tests both have a `window`; adding
  deps only when a step needs them keeps the lockfile changes in main.
- D19 — 2026-10-05 — `test-parity.mjs` counts `test(`/`it(` calls statically (Vue: 453 call sites, 817 expects in
  48 files); the 517 in §1.9 is vitest's runtime count incl. `test.each` rows. — Per-file static parity is
  comparable on both sides; the runtime total is checked by measure.sh.
- D20 — 2026-10-05 — ESLint stylistic = Nuxt's defaults (`stylistic.configs.customize`, arrow parens as-needed,
  stroustrup braces) + the same overrides as `frontend/eslint.config.mjs`. — Same style as `frontend/`.
- D21 — 2026-10-05 — Amends D1: `sync-api.mjs` copies only the **generated** type files (`lib/api/types/*.ts` with the
  `/* tslint:disable */` codegen header). The hand-written clients and `types/{activity,non-generated}.ts` are
  ported code: Nuxt auto-imports made explicit (`useNuxtApp().$axios` → `http`, `useMealieAuth().token` → token
  cookie, `useGlobalI18n().locale` → `i18n.language`, `useI18n` type → `GlobalI18n`), strict-TS fixes (base CRUD
  constructor defaults for subclasses that declare routes as fields, typed `put` payloads, no `any`), upstream
  `TODO` comments reworded. The Explore tools-by-id URL quirk (ignores the id) is kept as in Vue. — The upstream
  clients never ran under strict `tsc` and relied on Nuxt globals, so a verbatim copy cannot compile.
- D22 — 2026-10-05 — P3-02 and P3-03 executed in one pass (the API clients need `lib/http`, the token cookie and
  auth from P3-03); two commits split by file, checks run on the combined tree. — Dependency, not preference.
- D23 — 2026-10-05 — Module-level state = `createStore` stores with plain (non-hook) actions next to a hook view:
  `authBackend` + `useAuthBackend()`, `alert`/`loader` + `toastAlert`/`toastLoading` stores, list stores via
  `createStoreActions`/`createReadOnlyActions` (renamed from `use…`: no hooks inside, §1.3). Navigation outside
  components goes through `navigateTo()` in `lib/navigation.ts` (App registers the router's `navigate`). Composable
  tests use `renderHook` + `act`; tests of plain factories call them directly. — Same semantics as the Vue
  module refs, usable from loaders/interceptors, testable without a component.
- D24 — 2026-10-05 — API clients are singletons; `useUserApi()`/`useAdminApi()`/`usePublicApi()`/
  `usePublicExploreApi(slug)` return them (no `i18n` argument). `Accept-Language` is set per request from
  `i18n.language` in `lib/http.ts` instead of mutating axios defaults in `useRequests`. — Stateless wrappers;
  same header on the wire.
- D25 — 2026-10-05 — No `ToastProvider`: `TheSnackbar` (P3-07) subscribes to the toast stores. — The Vue toasts are
  module state too; a provider would add nothing.
- D26 — 2026-10-05 — `clearComposableCaches()` runs resets registered with `registerCacheReset(fn)` at module
  scope by each stateful hook module (instead of importing them all). — Avoids a dependency on modules ported
  later; a never-imported module has no state to clear.
- D27 — 2026-10-05 — `useAsyncData(key, fn, deps)`: `pending` is true for the first load and explicit `refresh()`;
  reloads caused by `deps` keep showing the previous data. — React-hooks v7 forbids synchronous setState in
  effects; matches what users see in Nuxt (cached data while refreshing).
- D28 — 2026-10-05 — `v-no-autofill` directive → `useNoAutofill()` ref callback (`hooks/utils/use-no-autofill.ts`).
- D29 — 2026-10-05 — WF2 hooks call `eslint --format json` (ESLint 10 removed the `unix` formatter) and print
  `file:line:col: message [rule]` themselves.
- D30 — 2026-10-05 — i18next only stores the messages and tracks the language (react-i18next re-renders on change);
  `src/i18n/compat.ts` formats them itself with vue-i18n's semantics (default plural rule incl. "no count = choice for
  1", implicit `count`/`n`, `{0}` lists, missing value → "", missing key → key, en-US fallback). `t`/`d` are plain
  functions; `useI18n()` returns per-language wrappers. — Exact parity with vue-i18n is simpler than configuring
  i18next's interpolation/plural options to approximate it.
- D31 — 2026-10-05 — `LanguageDialog` (listed in P3-04) is ported in P3-05 right after `BaseDialog`, which it renders.
  — Dependency order; same session.
- D32 — 2026-10-05 — `<i18n-t keypath>` + named slots → `<I18nT keypath slots={{ name: node }} />` (`src/i18n/I18nT.tsx`).
  `useLocales()` returns `locale` + `setLocale(code)` instead of a writable computed. `<html lang dir>` follow the
  locale (§1.6); the MUI theme direction stays `ltr` (Vuetify's rtl map has no `ar-SA`/`he-IL` keys, so the Vue app
  never mirrored components either). — Closest to Vue, minimal surface.
- D33 — 2026-10-05 — Component API conventions fixed by the P3-05 exemplars: a boolean `v-model` (dialogs) →
  `open` + `onOpenChange(open)`; a value `v-model` → `value` + `onChange(value)`; dynamic `$emit(btn.event)`
  (BaseButtonGroup) → `onAction(event)`, BaseMenu's `@menu` → `onMenu(event)`; `#activator` slots → `renderActivator(…)`;
  `#item.<key>` table slots → `slots={{ key: item => node }}`; `v-form` + `:rules` → `useFormValidation({ name:
  field(value, rules) })` + `fieldProps(name)`. Vuetify colour names map via `components/global/colors.ts`. —
  One pattern for every porter.
- D34 — 2026-10-05 — Vuetify-internal UI strings that the Mealie locale files do not contain (data-table footer
  "Items per page", number-input stepper labels, "No data available") are not hard-coded: `BaseDataTable` uses MUI's
  built-in pagination labels and shows `noDataText` only when a caller passes one; the number-input steppers are
  `aria-hidden` mouse-only controls like Vuetify's (keyboard uses the native arrows). Recorded as GAP-1. — Rule §1.1.3
  forbids new English strings; behaviour stays usable.
- D35 — 2026-10-05 — Roboto self-hosted via `@fontsource/roboto` (300/400/500/700 imported in `main.tsx`), like
  `@nuxt/fonts` in Vue. `useFormValidation` lives in `hooks/utils` (no Vue counterpart).
- D36 — 2026-10-05 — D18 replacements: `react-advanced-cropper` 0.20.1 (same author/engine as `vue-advanced-cropper`;
  ref API `flipImage`/`rotateImage`/`getCanvas`/`refresh`), `vanilla-jsoneditor` 3.13.0 (the editor `json-editor-vue`
  wraps; same version as `frontend/`, mounted with `createJSONEditor` in an effect), `sortablejs` 1.15.7 (+ types; the
  engine of `vue-draggable-plus`). The first step that needs drag-and-drop (P3-10 `QueryFilterBuilder`) writes a shared
  `hooks/utils/use-sortable.ts`; later steps import it. — Same engines as Vue → same UX, no wrapper-library guesswork.

- D37 — 2026-10-06 — P3-07 ports what the layouts and auth pages need first: `use-groups`, `use-households`,
  `use-users/preferences`, `use-router` (P3-08 list) and `UserAvatar`, `AppScrollToTop` (P3-09 list). React APIs:
  preference hooks return `[value, setValue]` (same storage keys/defaults); `useGroupSelf`/`useHouseholdSelf` →
  `{ group|household, actions }` with `actions.updatePreferences(prefs?)` taking the edited object (Vue mutated the
  ref in place) and `actions.set(...)`; `useRouteQuery(name, default)` → `[value, setValue]` (`null` removes the
  parameter); `useAdminHouseholds().useHouseholdsInGroup(ref)` → `householdsInGroup(groupId)`. `hooks/api/api-client`
  also exports the `userApi`/`adminApi`/`publicApi` singletons for plain modules (lint forbids `use…` there). —
  First step that needs a file ports it (§3 P4 note).
- D38 — 2026-10-06 — Routing details: every guarded loader awaits `initAuth()` itself (React Router runs matched
  loaders in parallel, so the root loader alone can't gate them); guarded routes set `shouldRevalidate:
  alwaysRevalidate` (Nuxt middleware runs on every navigation); pages load lazily via `page(() => import(…))`
  (`routes/lazy.ts`); a layout route is registered only when a page uses it (a childless pathless route would match
  `/`); unknown URLs hit a `*` route and errors the root `errorElement`, both `layouts/ErrorPage` (with Vue's legacy
  404 rewrites). Vue's `v-scroll-x-transition` between pages is not reproduced (cosmetic).
- D39 — 2026-10-06 — Registration: the page's `<script setup>` logic is `pages/register/use-register-page.ts` (the
  Vue test mounted the page with an empty render; the port tests the hook with `renderHook`, same titles and
  assertions). `UserRegistrationForm` reports validity via `onChange(valid)` = all rules pass now (Vuetify's lazy form
  model starts `null`, so Vue's Next button stays disabled a little longer); the account form registers its
  `validate` with `registerAccountForm()` (Vue: the shared `domAccountForm` ref). Password show/hide toggles are
  `aria-hidden` mouse-only icon buttons like D34 (no locale string for a label). Announcement bodies and
  reset-password's "Token Required" stay English exactly as in Vue.

- D40 — 2026-10-06 — P3-08 ports `hooks/recipes/*` except `use-parse-ingredients-dialog` (+ its test): the P4-07 row
  owns it and only `RecipePage/**` uses it. So P3-08 test parity covers 10 files (8 `recipes/__tests__` +
  `use-search` + `use-query-filter-builder`), not 11; `use-downloader` already exists (P3-03). The porter may edit
  `components/global/{use-item-search.ts,auto-form-types.ts,AutoForm.tsx,InputLabelType.tsx,ContextMenu.tsx}` only to
  apply the P3-06 SHARED-CHANGE-REQUESTs (imports/re-exports, no behaviour change).

- D41 — 2026-10-06 — Throughput changes requested by the human (stays within §0): porter `effort: high` (Sonnet kept: the
  P3-08 Sonnet porter delivered green checks and full test parity; Opus burns the Pro 5-hour quota much faster);
  P4-07 (largest, ~7 k lines) is spawned with `model: "opus"`. Sessions end once per PG (amended the same day: the
  human chose shorter sessions over fewer handoffs, because every turn re-sends the whole context); PG-D ends after
  P3-10. Safety net §5.1.4: hand off early after an auto-compaction or at ~60 % context.
  P3-09 ∥ P3-10 as PG-D: the only cross-dependency was `RecipeTimelineItem` (P3-10) rendering `RecipeCardMobile`
  (P3-09), so the timeline trio moved to P3-09 (P3-09 ≈ 5 k Vue lines, P3-10 ≈ 2.3 k). Concurrency stays at 2
  subagents: WSL2 has 3.8 GiB RAM (the human will not raise it), and parallel porters share one quota.

- D42 — 2026-10-06 — Both PG-D porters hit the usage cap; the main session resumed them per §4.4.6 with briefs rebuilt
  from the step rows (the original briefs were not saved). From now on main keeps each porter brief in the session
  scratchpad until the merge. P3-09 deviations accepted: `RecipeTimelineBadge` ported with the timeline trio; imperative
  `open()`/`close()` via React 19 `ref` prop; AppHeader xs search button gets `aria-label` `search.search` (an existing
  locale key). — Keeps resumes faithful; deviations are behaviour-neutral or accessibility gains.
- D43 — 2026-10-06 — P3-11 porter deviations accepted (§9 notes). The pilot showed that `Container` (mapping for
  `v-container`) lacks Vuetify's 16 px vertical padding, so page content sits tight under the app bar (visible in
  `docs/g2/user-favorites-light.png`). Recorded as GAP-4 and deferred to P5-01 as a one-line theme default
  (`MuiContainer` root `py: 2`) rather than patched per page. — A theme-level fix needs no change in P4 pages, so
  deferring it does not multiply work; changing it now would invalidate the G2 metrics row and screenshots.

- D44 — 2026-10-07 — The human allowed exceeding the 70 % 5-hour usage cap once, to finish PG-A (restarted with
  `USAGE_CAP_PCT=95`). Both PG-A porters had stopped without a final report: P4-02 had all 18 files committed (report
  rebuilt from its commits and code by main); P4-01 stopped at a `WIP: usage cap` commit and was resumed per §4.4.6.
  — Human's explicit instruction; the default 70 % applies again from the next session.

- D45 — 2026-10-07 — P4-01 verification found the `check it off` flow failing: Vue keeps a checked-off row (checked) in the
  DOM during its `scroll-x-transition` leave, and Playwright's `check()` re-reads that row. Ported both Vue
  TransitionGroups of `shopping-lists/[id]` (label groups and item rows) with `AnimatedChildren`; `ShoppingListItem` keeps
  its toggled copy like Vue's `model.value = updated`; fixed shared `AnimatedChildren` to snapshot every new `children`
  (it kept the elements of the last key-set change, so a row refreshed since then left with stale props) + 2 tests. The
  previous session was cut off by an API error mid-fix; this session completed it. — Behaviour parity with Vue; the
  shared fix is invisible to SpinTransition/SwipeTransition users (auth/user/admin E2E re-run green).
- D46 — 2026-10-07 — PG-B porter deviations accepted. P4-04: bulk delete/export/assign selection lists are plain
  scrollable lists (height 400) instead of `v-virtual-scroll` (no virtualization dependency; the lists hold only the
  user's selection); foods sorts label/substitution columns via a non-enumerable `toString` sort key (GAP-2
  workaround); report `[id]` table is a custom MUI table with an expand column; migrations tree = nested `List` +
  `Collapse` with tree roles; `group/data` index is `<Navigate replace>`; `scrollToTop` page meta not carried (as in
  P3-11). P4-03: cross-day meal drag-and-drop uses sortablejs directly in `MealPlanDropList` (same options as Vue,
  DOM reverted, React renders the order) because `useSortable` has no cross-list support; planner children get data
  via `<Outlet context>`; bare planner URL redirects to `/view` in the loader (query kept); a cleared webhook time
  keeps the stored schedule instead of crashing like Vue (`null.split`); notifier panels are single-open MUI
  accordions. — All behaviour-neutral for users or strict improvements over a Vue crash; none changes an accessible
  name or URL, and the E2E subsets pass.

---

## 9. Status

```
current_step: P4-05 ∥ P4-06 (PG-C)
state: not started
last_completed: PG-B (P4-03 + P4-04, 2026-10-07)
gate: G2 approved 2026-10-07
```

Steps: [x] P1 (G1 approved 2026-10-05) · [x] P2 · [x] P3-01 · [x] P3-02 · [x] P3-03 · [x] P3-04 · [x] P3-05 · [x] P3-06 · [x] P3-07 · [x] P3-08 · [x] P3-09 · [x] P3-10 · [x] P3-11 · [x] P3-12 · [x] G2 (approved 2026-10-07) · [x] P4-01 · [x] P4-02 · [x] P4-03 · [x] P4-04 · [ ] P4-05 … P4-08 · [ ] P5-01 … P5-04

Active subagents:

| step | branch | worktree | started | state |
|---|---|---|---|---|
| P4-01 | `wf2/P4-01-shopping` | removed | 2026-10-07 00:20, resumed 2026-10-07 | merged, verified |
| P4-02 | `wf2/P4-02-admin` | removed | 2026-10-07 00:20 | merged, verified |
| P4-03 | `wf2/P4-03-household` | removed | 2026-10-07 | merged, verified |
| P4-04 | `wf2/P4-04-group` | removed | 2026-10-07 | merged, verified |

Pending wiring:
- `hooks/utils/use-sortable.ts` (P3-10, D36) exists: `useSortable(containerRef, { onReorder({oldIndex,newIndex}), handle,
  animation, disabled, … })`, `useSortableList(containerRef, list, setList, options)`, `moveItem(list, from, to)`; it
  reverts Sortable's DOM move so React renders the order; no cross-list drags / `pull: "clone"`. Import it by path
  (`@/hooks/utils/use-sortable`, not re-exported from `hooks/utils/index.ts`). P4 steps (shopping list, planner edit,
  cookbooks, recipe page) use it.
- Routes: each P4 step adds its pages to `src/routes/<domain>.tsx` as `{ path, loader: guard(…), shouldRevalidate:
  alwaysRevalidate, ...page(() => import(…)) }` under the layout key of the page's `definePageMeta` (see
  `routes/auth.tsx`; D38). Paths are relative to `/` (e.g. `shopping-lists/:id`).

Known gaps (`GAP-<n>`):
- GAP-1 — Vuetify-internal strings absent from the Mealie locales (data-table footer, "No data available", number-input
  stepper labels) are MUI's English built-ins / omitted (D34). Fix option for P5: MUI locale packs keyed by `i18n.language`.
- GAP-2 — `CrudTable` accepts the Vue per-header `sort` comparator but `BaseDataTable` sorts with its default compare
  (no comparator hook). Fix option for P5: add an optional `sort` to `BaseDataTable` headers and pass it through; then
  drop the non-enumerable `toString` sort-key workaround in `pages/group/data/foods.tsx` (label/substitutions columns)
  and consider a `show-expand` option to replace the custom table in `pages/group/reports/[id].tsx` (D46).
- GAP-3 — Organizer hydration in `QueryFilterBuilder`: the readonly store's `refresh()` returns nothing, so it reads
  `actions.getAll()` and the store's `initialized` flag stays unset (P3-10). Fix option for P5: have `refresh()` return
  the list.
- GAP-4 — MUI `Container` has no vertical padding (Vuetify `v-container` has 16 px), so pages sit tight under the app
  bar (D43). Fix for P5-01: theme `components.MuiContainer.styleOverrides.root` `paddingTop/Bottom: 16px`, then drop
  any per-page compensation.

Skipped tests: none

SHARED-CHANGE-REQUESTs: none open (P3-06's four were applied in P3-08).

G2 checklist (PROCESS.md §6; ≈ 15 min):
1. `rewrite-evidence/metrics.csv` last row `WF2-P3-foundation-done` (commit dfb3f85f7, dirty 0): build_ok 1, tsc 0,
   lint 0 (0 warnings), unit 409 passed / 0 failed / 0 skipped, routes 8/66 (4 auth + 4 user), flows 2/15
   (`wrong password`, `full name`), test_files 55, expect_count 744 (Vue 48/817; the React count includes new
   component tests; test-parity: 31/48 Vue test files ported, rest belong to P4), any_count 3, todo_count 0.
2. Screenshots `frontend-react/docs/g2/`: `login-light.png`, `user-profile-light.png`, `user-profile-dark.png`,
   `user-favorites-light.png` (empty favorites of a fresh DB), `language-dialog-light.png`. Known visual diff: GAP-4
   (no vertical padding under the app bar, best seen on favorites).
3. Read `frontend-react/src/components/global/BaseDialog.tsx` (main-written) and
   `frontend-react/src/pages/user/profile/index.tsx` (porter-written) against their Vue sources.
4. Skim §8 D1–D43 and veto any.
Reply "繼續" = approved → P4 PG-A (P4-01 shopping ∥ P4-02 admin). Anything else = change requests, done before P4.

P4-01 (shopping, merged, verified 2026-10-07): CHECKS green (tsc 0, eslint 0, 69 files / 556 tests, build ok),
port-status `shopping` 20/0 missing, test-parity 42/48 files (React 384 tests / 634 expects, 0 skipped), E2E
`[route] shopping-lists/` 2/2 + `create a shopping list|check it off` 2/2; auth/user/admin subsets re-run 22/22 + 3/3
after the shared `AnimatedChildren` fix (D45). The porter's final report was lost with the interrupted session; main
scanned the diff: no `any`, no TODO-likes, one commented `exhaustive-deps` disable (polling starts on mount only, like
Vue `onMounted`), no new SHARED-CHANGE-REQUESTs. Shopping uses `useSortable` for label reorder and item rows.
P4-02 (admin, merged, verified 2026-10-07): CHECKS green (tsc 0, eslint 0, 55 files / 409 tests, build ok), port-status
`admin` 18/0 missing, E2E `[route] admin` 14/14 + `create a user` 1/1. The porter ended without a final report (D44);
main reviewed the diff: no `any`, no new SHARED-CHANGE-REQUESTs, one commented `exhaustive-deps` disable (users/[id]
loads once on mount like Vue `onMounted`). Routes: one `admin` parent route (guard auth + admin-only, `<Outlet />`)
per layout group (`default` = /admin itself, `admin` = 12 pages, `blank` = setup).
PG-B (2026-10-07): both porters delivered complete reports; merged P4-04 then P4-03, no conflicts, diffs only in
owned paths. CHECKS green (tsc 0, eslint 0, 80 files / 593 tests, build ok), port-status `household` 18/0 and `group`
19/0 missing, test-parity 44/48 files (React 394 tests / 650 expects, 0 skipped; the 4 missing belong to P4-07), E2E
`[route] group/` 13/13 + `create a tag` 1/1, `[route] household/` 8/8 + `meal plan` 1/1. Scan: no `any`, no TODO-likes,
no eslint-disable. Deviations accepted in D46. Optional request for P5-01: `RecipeCardLineItem` `onClick` prop (P4-03
wraps it in a `display: contents` Box with the handler in `RecipeSelector.tsx` and `planner/edit.tsx`).
New domain files: `Domain/Group/GroupDataSeedDialog.tsx` (seed dialog shared by foods/units), `Domain/Mealplan/
MealPlanDropList.tsx` (cross-day sortablejs list for planner/edit). planner.tsx passes `{ mealplans, actions }` to its
children via `<Outlet context>` (`PlannerOutletContext`).
Notes for the next session: start PG-C (P4-05 explore ∥ P4-06 recipe-create) per §4.4 (two porters; keep each brief in
the scratchpad until merged; merge P4-05 before P4-06). Default usage cap 70 % applies. Screenshots were taken by a scratchpad Playwright script against `start-backend.sh` on port 9093 (fresh DB,
default admin taken over via API like `global-setup.ts`).
P3-11 (pilot, 1 porter, merged, verified): CHECKS green (tsc 0, eslint 0, 55 files / 409 tests, build ok), port-status
`user` 5/0 missing, test-parity 31/48 files (all misses belong to P4 domains), E2E `[route] user/` 4/4 + `full name` 1/1.
The §4.2 brief worked as-is; useful additions for P4 briefs: give the routes entries (path + guards per middleware)
and the E2E flow spec file explicitly. Porter deviations: `UserProfileLinkCard` avoids nested anchors (button is the
`Link`, card `onClick` navigates); profile/edit TextFields without `required` (MUI would append " *" to the name);
password eye icon kept Vue's mapping (local state, not `usePasswordField`); activity-preferences combobox = MUI
`Autocomplete freeSolo`; `createAPIToken` result cast to `LongLiveTokenCreateResponse` (generated type lacks `token`);
StatsCards min-width "158px"; `scrollToTop`/page name `UserProfile` not carried. 10 new React tests (5 files).
PG-D delivered (2 porters, merged, verified): CHECKS green (tsc 0, eslint 0, 50 files / 399 tests, build ok),
RecipeDialogSearch 5/13 and GroupAIProviderDialog 1/2 parity equal; test-parity 32/48 files; port-status 150 missing.
P3-09: recipe cards (`RecipeCard`, `…Mobile`, `…Section` with sentinel infinite scroll, `…Image/Rating/LineItem`), chips,
favorite badge, `RecipeContextMenu/*` (content lazy-loaded; unknown item events → `onEvent(event)`; `print`,
`mealplanEdit`, `mealplanRemove` named callbacks), dialogs (AddToShoppingList, BulkAdd, PrintPreferences, Search, Share),
`RecipePrintView`, `RecipeTimeCard`, ingredient list item + substitutions (+ editor: `onChange(index, patch)`, `onAdd`,
`onDelete`, `onFoodChanged` — callers store the patch), timeline trio + `RecipeTimelineBadge`, `MealPlanAddRecipeDialog`,
`MealPlanDatePicker`, `WeekStartLocalization`; `AppHeader` search wired (+ `AppHeader.test.tsx`). `RecipeDialogSearch`/
`RecipeDialogBulkAdd` expose `open()`/`close()` via a React 19 `ref` prop (Vue `defineExpose`); Search's default slot →
`children({ open, close })`. 11 extra component test files.
P3-10: `RecipeOrganizerSelector` (mounts only the selected type's store; option equality by `id`), `QueryFilterBuilder`
(MUI `DateCalendar` in a local `LocalizationProvider`/`AdapterDateFns`; local `yyyy-MM-dd`), `SearchFilter`,
`RecipeOrganizerDialog`, `RecipeSettingsSwitches`, `RecipeTimeInput`, Group AI provider dialog/editor, group/household
preference editors, `UserInviteDialog`. `types/recipe/organizers.ts` is empty in Vue too. Optional requests (not applied):
`SafeMarkdown` `className`/`inline` prop; re-export `use-sortable` from `hooks/utils/index.ts`.
port-status still lists `types/auth.d.ts` missing: the first step that needs it ports it. Branches `worktree-agent-*` are
harness leftovers (kept, unused).
Earlier: all 40 `components/global/**` are ported: import them, never redo (P3-06 deviations: see D33 and the component
headers). `src/test/utils.tsx` has `renderWithProviders(ui, { route, dark })` and `stubI18n()`. `jq` is not installed.
Use absolute paths in Bash edits (the path guard resolves relative paths against the session cwd); copying a Vue file
with a shell redirect from `../frontend` is refused by the permission layer — write the port with the Write tool.
