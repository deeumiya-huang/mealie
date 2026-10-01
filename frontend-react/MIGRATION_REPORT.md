# WF1 Migration Report: Nuxt → React

`frontend/` (Nuxt 4 + Vue 3 + Vuetify) has been ported to `frontend-react/` (Vite + React 19 + TypeScript strict + MUI 9 + React Router 8 + react-i18next) on branch `rewrite/wf1-baseline`. `frontend/`, `mealie/` and every locale file are unchanged; generated API types, locale messages and public assets are shared from `frontend/` through Vite/TS path aliases, so code generation stays single-sourced.

## Converted

### Pages: 66 / 66

Every `frontend/app/pages/**/*.vue` has a React page at the same path under `frontend-react/src/pages/` (`[param].vue` → `[param].tsx`), registered in `src/app/routes.tsx` with the same middleware (auth, admin-only, advanced-only, can-manage, etc.) and layout (default / admin / basic / blank).

- **(root)** (5): `admin`, `forgot-password`, `index`, `login`, `reset-password`
- **admin** (13): `admin/backups`, `admin/debug/openai`, `admin/debug/parser`, `admin/maintenance/index`, `admin/manage/groups/[id]`, `admin/manage/groups/index`, `admin/manage/households/[id]`, `admin/manage/households/index`, `admin/manage/users/[id]`, `admin/manage/users/create`, `admin/manage/users/index`, `admin/setup`, `admin/site-settings`
- **g** (20): `g/[groupSlug]/cookbooks/[slug]`, `g/[groupSlug]/cookbooks/index`, `g/[groupSlug]/index`, `g/[groupSlug]/r/[slug]/index`, `g/[groupSlug]/r/create`, `g/[groupSlug]/r/create/ai`, `g/[groupSlug]/r/create/bulk`, `g/[groupSlug]/r/create/debug`, `g/[groupSlug]/r/create/html`, `g/[groupSlug]/r/create/image`, `g/[groupSlug]/r/create/index`, `g/[groupSlug]/r/create/new`, `g/[groupSlug]/r/create/url`, `g/[groupSlug]/r/create/zip`, `g/[groupSlug]/recipes/categories/index`, `g/[groupSlug]/recipes/finder/index`, `g/[groupSlug]/recipes/tags/index`, `g/[groupSlug]/recipes/timeline`, `g/[groupSlug]/recipes/tools/index`, `g/[groupSlug]/shared/r/[id]`
- **group** (13): `group/data`, `group/data/categories`, `group/data/foods`, `group/data/index`, `group/data/labels`, `group/data/recipe-actions`, `group/data/recipes`, `group/data/tags`, `group/data/tools`, `group/data/units`, `group/index`, `group/migrations`, `group/reports/[id]`
- **household** (8): `household/index`, `household/mealplan/planner`, `household/mealplan/planner/edit`, `household/mealplan/planner/view`, `household/mealplan/settings`, `household/members`, `household/notifiers`, `household/webhooks`
- **register** (1): `register/index`
- **shopping-lists** (2): `shopping-lists/[id]`, `shopping-lists/index`
- **user** (4): `user/[id]/favorites`, `user/profile/api-tokens`, `user/profile/edit`, `user/profile/index`

### Components, composables, tests

- **Components:** all 158 Vue components are ported. `RecipeIngredientEditorLayout` (13 lines) is folded into `RecipeIngredientEditor`, and `BaseDialogContent` is exported from `BaseDialog.tsx`.
- **Composables → hooks:** everything under `composables/` is ported to `src/hooks/`. Helpers that call no React hooks are named `get*` / `create*` instead of `use*`.
- **Tests:** all 48 Vue test files are ported (446 Vue tests → 446 React tests, plus 1 new regression test = 447 test cases, 518 executed including `each` expansions). None are skipped, deleted or weakened. The Vue auth middleware test lives at `src/app/__tests__/middleware.test.ts`. One arrangement changed: the two item-editor "does not overwrite" tests now set `foodId`/`unitId` on the item explicitly. In Vue they only passed because earlier tests' async continuations mutated the shared `MOCK_ITEM` in place, and the React editor updates the item immutably. The assertions are unchanged.

### Architecture notes

- Vue's global reactive state (`useState`, module-level refs) is replaced by small external stores (`src/lib/store.ts`, `useSyncExternalStore`). `registerCacheReset` / `resetAllCaches` replace `use-clear-composable-caches.ts`.
- The shopping-list page keeps the Vue composables' shared-mutable-ref design via `src/lib/observable.ts` (`ref` / `computed` / `reactive` + a change channel that the page subscribes to), so the 132 composable tests port 1:1. `src/lib/browser-state.ts` replaces the `@vueuse/core` online/idle/localStorage helpers, and `src/lib/clipboard.ts` replaces `useClipboard`.
- `vue-draggable-plus` is replaced by `SortableList` (dnd-kit), `<i18n-t>` by `I18nT`, and `v-form` validation by `VForm` + `useFieldRules`.

## Not converted

- `composables/use-backups.ts`: no page used it (the backups page calls the admin API directly). Only its cache reset was referenced, by `use-clear-composable-caches.ts`, which has itself been replaced (see above).
- `useUser().getUser` (in `use-user.ts`) had no callers and was dropped. `createUser`, `updateUser` and `deleteUser` are ported.
- Vue-only styling hooks (`.v-*` class overrides in page `<style>` blocks) are re-expressed as MUI `sx` where they mattered and dropped otherwise.

## Behaviour changes vs the Vue app (bug fixes)

- **InputLabelType:** the "Create" button sat permanently below the field. It now appears inside the dropdown, matching Vue's `#append-item` slot (via the new `AutocompleteInput appendItem`). This affects every food/unit/label picker.
- **Shopping list item editor:** it now copies the item when editing starts. Vue took the copy when the row mounted, so the editor could show stale data after a background refresh.
- **Admin ingredient parser:** switching NLP / Brute / OpenAI now re-runs the parse. In Vue, `@change` on `v-btn-toggle` never fired.
- **API typings:** `users.createAPIToken` is typed as `LongLiveTokenCreateResponse`, which matches the backend `response_model` and contains `token`. `admin.about.statistics` is typed as `AppStatistics`.
- **Earlier pages:** the previous sessions' notes also record fixes to the date-filter default, the cookbook sort comparator, the URL-import page's clear button and the organizer selector. Their commit messages don't describe these further.

## Known gaps

- InputLabelType has no `menu-props.location` (top/bottom). The MUI popper flips on its own when there is no room.
- Vuetify transitions are mostly dropped: `TransitionGroup scroll-x` on shopping-list rows, `v-slide-x-transition` on profile edit (a simple Fade instead), and `v-lazy` on linked recipes.
- The shopping-list page's compact header CSS (shrunken title, hidden subtitle) is approximated, not matched pixel for pixel.
- The setup wizard uses MUI `Stepper` with custom step icons. Below `sm` the step titles are hidden, similar to Vuetify's `mobile-breakpoint`.
- `definePageMeta.scrollToTop` (profile page) relies on the router's default scroll behaviour.
- Browser smoke tests covered the complex pages: shopping lists (desktop and phone), user/profile pages, all admin pages (user/group/household CRUD, backup create/restore dialog, maintenance, debug, site settings), and a full first-time setup run against a throwaway data snapshot. Simpler pages were checked only by type-check, lint and unit tests.

## Effort (time and tokens)

These figures were not tracked while the work was happening. They were reconstructed afterwards from the Claude Code session transcripts (`~/.claude/projects/-home-deeumiya-mealie-wf1/*.jsonl`), as of 2026-10-01 21:58 (UTC+13).

**Time**
- Wall clock: 2026-09-30 16:13 (first `[WF1]` commit) to 2026-10-01 21:51 (report commit), about 30 hours end to end.
- Active time: about 5.0 hours. This is the sum of gaps under 10 minutes between transcript events, so it is an estimate.

**Tokens** (748 model requests)

| Session | Period (UTC+13) | Active | Requests | Output | Cache write | Cache read | Uncached input |
|---|---|---|---|---|---|---|---|
| d46d5131 | 09-30 15:58 → 10-01 20:49 | 3.8 h | 525 | 753,952 | 3,027,353 | 205,776,277 | 1,046 |
| c9f616b7 | 10-01 20:50 → 21:58 | 1.1 h | 223 | 178,008 | 401,989 | 52,252,735 | 446 |
| **Total** | | **5.0 h** | **748** | **931,960** | **3,429,342** | **258,029,012** | **1,492** |

All tokens add up to about 262 million, but over 98% of that is cache reads. Every request re-reads the conversation context, and cache reads are billed and counted against limits at a much lower rate than regular input, so the total is not a cost figure.

Caveats:
- Session 353b62b9 left no transcript on this machine. Any work it did is not counted.
- No subagents were used, so no subagent tokens are missing.
- The c9f616b7 figures include the follow-up turns that wrote this section.
- Weekly quota percentages are not in the transcripts. The Claude usage page is the source for those.

## Final command output

Run in `frontend-react/`.

### `pnpm install`
```
Already up to date
Done in 47ms using pnpm v12.8.1
exit=0
```

### `npx tsc --noEmit`
```
exit=0
```

### `npx eslint .`
```
exit=0
```

### `npx vitest run`
```
RUN  v4.1.11 /home/deeumiya/mealie-wf1/frontend-react


 Test Files  48 passed (48)
      Tests  518 passed (518)
   Start at  21:49:30
   Duration  32.15s (transform 6.23s, setup 23.10s, import 15.19s, tests 5.34s, environment 67.44s)

exit=0
```

### `npx vite build` (tail)
```
✓ built in 3.14s

PWA v1.3.0
mode      generateSW
precache  342 entries (12434.16 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
exit=0
```
