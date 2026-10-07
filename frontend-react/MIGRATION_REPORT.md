# Mealie frontend → React migration report (WF2)

`frontend/` (Nuxt 4, Vue 3, Vuetify 4, `@nuxtjs/i18n`) was ported to `frontend-react/` (Vite 8, React 19, TypeScript
strict, React Router 8, MUI 9, react-i18next). The backend, its API, the URL routes and the UI strings are unchanged:
the React app loads the existing `frontend/app/lang/messages/*.json` and reuses the generated API types from
`frontend/app/lib/api/types/` (copied by `scripts/sync-api.mjs`). The build is a static SPA in `dist/` with the same
`_nuxt/` asset path, so `mealie/routes/spa` serves it like the `nuxt generate` output.

Branch `rewrite/wf2-orchestrated`. Process, decisions (D1–D52) and status: `PROCESS.md` at the repo root.
Independent review: `frontend-react/REVIEW.md`.

## Result

`./rewrite-evidence/measure.sh --app frontend-react --label WF2-final` on 2026-10-07 at commit `ff8b2d289`
(clean tree, `dirty=0`): **all done criteria met**. Vue baseline for comparison: `P0-vue-baseline` row in
`rewrite-evidence/metrics.csv` (66/66 routes, 15/15 flows, 517 unit tests).

| Criterion (PROCESS.md §0) | Result |
|---|---|
| `pnpm install --frozen-lockfile` | ok |
| `tsc --noEmit` | 0 errors |
| `eslint .` | 0 errors, 0 warnings (569 files) |
| `vitest run` | 769 passed, 0 failed, 0 skipped (108 test files) |
| `pnpm build` | ok (`dist/index.html`, 9 s incl. PWA service worker) |
| Every page in `frontend/app/pages/` has a real React page | yes — port-status: 429 Vue files, 0 missing, 0 stub words |
| E2E routes (`frontend-e2e/`, against `dist/`) | 66/66 |
| E2E flows | 15/15 |
| Vitest tests ported | 48/48 test files, 453/453 tests, 820/817 expects (static count, `scripts/test-parity.mjs`), 0 skipped |
| `any` | 1, commented (`types/auto-forms.ts` `FormValidationRule`) |
| TODO-like words in `src/` | 0 |

## Converted

Every file under `frontend/app/` that holds code was ported to the mirrored path under `frontend-react/src/`
(`composables/**` → `hooks/**`, `.vue` → `.tsx`, `middleware/*` → `routes/guards.ts`, `plugins/*` → `providers/*` or
`lib/*`; the full map is `scripts/port-map.mjs`). `node scripts/port-status.mjs`:

```
domain          ok  missing  stub  skipped
admin           18        0     0        0
auth            10        0     0        0
explore         17        0     0        0
global          40        0     0        0
group           19        0     0        0
household       18        0     0        0
layout          34        0     0        0
lib             82        0     0        0
recipe-create   12        0     0        0
recipe-page     41        0     0        0
shared         111        0     0        2
shopping        20        0     0        0
user             5        0     0        0

429 Vue files, 0 missing or stub
```

Mapping exceptions (not mirrored 1:1):

| Vue | React |
|---|---|
| `layouts/{default,admin,basic,blank}.vue` | `layouts/{Default,Admin,Basic,Blank}Layout.tsx` |
| `layouts/error.vue` | `layouts/ErrorPage.tsx` (catch-all route and route `errorElement`) |
| `middleware/*.ts` (8 files incl. `pwa-share-target-redirect.global.ts`) | `routes/guards.ts` (React Router loaders) |
| `plugins/app-info.client.ts`, `dark-mode.client.ts`, `theme.ts` | `providers/AppInfoProvider.tsx`, `ThemeModeProvider.tsx`, `theme.ts` |
| `plugins/axios.ts` | `lib/http.ts` |
| `plugins/globals.ts` | `lib/icons/index.ts` |
| `plugins/init-auth.client.ts` | `routes/index.tsx` (root loader) |
| `plugins/no-autofill.client.ts` | `hooks/utils/use-no-autofill.ts` |
| `i18n.config.ts`, `composables/use-global-i18n.ts` | `i18n/index.ts` (+ `i18n/compat.ts`: vue-i18n message semantics on i18next) |
| `tests/setup.ts`, `tests/utils.ts` | `test/setup.ts`, `test/utils.tsx` |

Size: 453 non-test source files and 108 test files, ≈ 65 k lines in `src/` (generated API types excluded).

## Not converted

| Vue file | Why |
|---|---|
| `types/components.d.ts` | Typings for Vue globally registered components; React imports components explicitly. |
| `types/ts-shim.d.ts` | `*.vue` module shim; there are no `.vue` files. |
| Nuxt configuration (`nuxt.config.ts`) | Not a source file; its settings went to `vite.config.ts` (`_nuxt` assets dir, PWA workbox options, `SUB_PATH` base) and the providers. |

Not reproduced (cosmetic, D38/D50): Vuetify's `v-scroll-x-transition` between pages, and the TransitionGroup/`v-lazy`
animations in the ingredient-parse review list.

## Known gaps

- **GAP-6 — PWA offline navigation fallback.** The Nuxt workbox options were ported unchanged; they ignore
  `index.html`, so `/` is not precached and `createHandlerBoundToURL("/")` throws after `precacheAndRoute`. The
  service worker installs and precaches the assets but serves no navigation fallback offline — identical in the Vue
  build (D51a). Fix for both apps: precache `index.html` as `/` (drop it from `globIgnores`).
- GAP-1 … GAP-5 were closed in P5-01 (GAP-1 as parity: Vuetify's locale is pinned to `en-US`, so Vue shows the same
  English built-in table/stepper strings MUI shows; GAP-2 table sort comparators, GAP-3 store refresh, GAP-4 container
  padding, GAP-5 store-hook choice fixed).
- Strings that exist only inside Vuetify (data-table "Items per page", "No data available", number-input stepper
  labels) are MUI's built-in English equivalents or omitted; no new English strings were added (D34).
- Review findings declined (REVIEW.md): R1-15 (storage defaults cached per key — behaviour-equal for every caller),
  R2-7 (`click:row` on admin backups — a no-op in Vue too).

## Skipped tests

None. Every Vue test file has a React counterpart at the mirrored path with the same `describe`/`test` titles, the
same number of tests and every assertion kept. Two Vue tests that mounted a page with an empty render now test the
extracted hook with `renderHook` (D39). `vitest.config.ts` sets `testTimeout: 15000` for one slow userEvent test
(D49; no assertion changed).

## Deviations from Vue behaviour

All are recorded with reasons in `PROCESS.md` §8. User-visible or architectural ones:

- **Guards** (D4, D38): Nuxt middleware → React Router loaders that run on every navigation. `adminOnly` also
  redirects non-admins on a hard load (the Vue app leaks the page on a hard load — a known bug).
- **Error page** (D51c): unknown URLs render the port of `layouts/error.vue` (localized 404, legacy-URL redirects);
  Nuxt 4 never renders that file and shows its built-in English error page instead.
- **State** (D6, D23): module-level `createStore` + `useSyncExternalStore` stores instead of Vue module refs;
  `useAsyncData` keeps showing previous data while dependency-driven reloads run (D27).
- **Component APIs** (D33): `v-model` → `value`/`onChange` or `open`/`onOpenChange`; slots → render props;
  `v-form` rules → `useFormValidation`.
- **i18n** (D2, D30, D32): i18next stores messages; `i18n/compat.ts` formats them with vue-i18n semantics (pipe
  plurals, `{0}` lists, braces). MUI direction stays `ltr` like the Vue app.
- **Drag and drop** (D36, D46): `sortablejs` via `hooks/utils/use-sortable.ts`; Sortable's DOM move is reverted and
  React renders the order. Cross-day meal-plan drag uses sortablejs directly.
- **Fixed Vue crashes / no-ops** (D46, D48, D50): clearing a webhook time no longer throws; the recipe-import clear
  button clears; cookbooks sort by position; the ingredient parser no longer parses twice; the cookbook page no longer
  calls the user API for logged-out visitors.
- **Accessibility additions** (D42, D48, D50): extra `aria-label`s from existing locale keys on icon-only buttons,
  recipe name is an `h1`. No accessible name the Vue app exposes was changed.
- **Minor UI** (D46, D48): bulk-action selection lists are plain scrollable lists (no virtual scroll); notifier panels
  are single-open accordions; zip import shows a loading button.
- **PWA / sub-path** (D51): `vite-plugin-pwa` with the Nuxt workbox options; `SUB_PATH` → Vite `base` + router
  `basename`.

## Final command output

From `rewrite-evidence/runs/20261007T100036Z-frontend-react-WF2-final/` (measure.sh, commit `ff8b2d289`, clean tree).

`pnpm install --frozen-lockfile` (`install.log`):

```
Already up to date
Done in 1s using pnpm v11.23.0
```

`pnpm exec tsc -b --pretty false` (measure.sh's React type check; `tsconfig.json` sets `noEmit`, so it equals `tsc --noEmit`; `types.log`): no output, exit 0 → 0 errors.

`pnpm exec eslint . --format json` (`eslint.json.gz`): 569 files, 0 errors, 0 warnings (`lint.log` empty).

`pnpm exec vitest run --maxWorkers=4 --reporter=json` (`vitest.json.gz`):

```
numTotalTests 769, numPassedTests 769, numFailedTests 0, numPendingTests 0, success true
```

`pnpm build` (`build.log`, last lines; the >500 kB chunk notice is a Rolldown size hint, not an error):

```
vite v8.3.2 building client environment for production...
dist/index.html                                                3.78 kB │ gzip:   1.17 kB
✓ built in 2.50s

PWA v2.0.0
mode      generateSW
precache  311 entries (11807.63 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

E2E (`frontend-e2e/`, `E2E_STATIC_DIR=frontend-react/dist`; `e2e.log`): 66 route checks + the table guard + 15
flows:

```
  82 passed (2.9m)
```

### measure.sh row (`rewrite-evidence/metrics.csv`)

```
timestamp_utc,label,app,branch,commit,dirty,routes_passed,routes_total,flows_passed,flows_total,tsc_errors,lint_errors,lint_warnings,unit_passed,unit_failed,unit_skipped,build_ok,build_seconds,any_count,todo_count,expect_count,test_files,duration_seconds,run_id,notes
2026-10-07T10:07:56Z,WF2-final,frontend-react,rewrite/wf2-orchestrated,ff8b2d289,0,66,66,15,15,0,0,0,769,0,0,1,9,1,0,1551,108,440,20261007T100036Z-frontend-react-WF2-final,
```
