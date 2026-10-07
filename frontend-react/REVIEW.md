# WF2 independent review (P5-02)

Two read-only `reviewer` subagents (Opus, fresh context, PROCESS.md §4.3 brief), 2026-10-07, at commit `ded6d6abc`:

- **R1** — foundation: `src/lib` (excluding the verbatim `lib/api` copy), `i18n`, `providers`, `routes`, `hooks`,
  `components/global`, `layouts`, `components/Layout` (~21 k lines).
- **R2** — domains: `src/pages`, `src/components/Domain` (~34 k lines).

Totals: 1 high, 6 medium (one reported by both), 22 low (one reported by both). Decision column: **fix** = done in
P5-03; **decline** = not changed, with the reason. Paths are relative to `frontend-react/src/`.

## R1 — foundation

| # | Sev | Location | Finding | Decision |
|---|---|---|---|---|
| R1-1 | high | `routes/guards.ts:36-39, 101-112`, `routes/index.tsx:52` | Under `SUB_PATH`, `request.url` includes the basename: `requireAuth` puts `redirect=/mealie/…` in the login URL (after login → `/mealie/mealie/…` 404), and the PWA share-target / root `shouldRevalidate` checks on `"/r/create/url"` never match. Nuxt's `to.fullPath` excludes the base. | fix: strip the router basename from the pathname in `fullPath()` and both checks; guard test with a basename |
| R1-2 | medium | `components/global/BaseDialog.tsx:124-131, 167, 182` | `onKeyDown` on the Dialog root also receives Enter from portaled children (select menus/popovers inside the dialog) because React events bubble through portals, so picking an option by keyboard submits/confirms and closes the dialog. | fix: ignore events whose target is outside `event.currentTarget` |
| R1-3 | medium | `hooks/utils/use-sortable.ts:68-120` (also R2-1: `RecipePageIngredientEditor.tsx:144-154, 182-204`) | Sortable is created once; the effect depends on the stable ref object, so a container mounted later (ingredient list after deleting all and re-adding, or a recipe with no ingredients) never becomes sortable, and a replaced element keeps a stale instance. | fix: track the element (callback ref → state) and re-create Sortable when it changes |
| R1-4 | medium | `routes/lazy.ts:9-13` (also R2-6: `shopping-lists/[id]`, `admin/manage/users/[id]`, `group/reports/[id]`) | Nuxt keys pages by their interpolated path, so a param-only navigation remounts; React Router reuses the instance and hooks bound to the first id (shopping-list queue/polling, admin user load) keep the old one. Reachable e.g. via the "view list" toast of `RecipeDialogAddToShoppingList`. | fix: `page()` keys the lazy component by the route's matched pathname |
| R1-5 | medium | `hooks/utils/use-wake-lock.ts:18-33` | Unlike VueUse `useWakeLock`, the lock is not re-acquired when the tab becomes visible again; a request while hidden rejects unhandled; a sentinel resolving after unmount is never released. | fix: re-request on `visibilitychange`, catch rejections, release late sentinels |
| R1-6 | medium | `providers/AppInfoProvider.tsx:7-17`, `providers/app-info.ts:18-21` | A failing `/api/app/about` throws from `use()` with no error boundary → blank page; the rejected promise is cached forever. Boot fetches about → theme → i18n sequentially. | fix: error boundary with a minimal error view, reset the cached promise on rejection, start the three boot loads in parallel |
| R1-7 | low | `components/Layout/DefaultLayout.tsx:57`, `layouts/AdminLayout.tsx:20` | No resize watcher: Vuetify's drawer closes when it becomes temporary and opens when permanent; here the temporary drawer + backdrop cover the page after shrinking. | fix: set `sidebar = lgAndUp` when `lgAndUp` changes |
| R1-8 | low | `components/global/BaseDataTable.tsx:97-119` | Vuetify resets to page 1 when `search` changes; the port only clamps. `perPage` ignores later `itemsPerPage` changes. | fix: reset page on search change; follow `itemsPerPage` |
| R1-9 | low | `components/global/BaseDataTable.tsx:110-113`, `CrudTable.tsx:69, 184` | Sorting only works for keys that have a header; CrudTable's default `initialSort="id"` has no id column, so rows keep API order while Vue sorts by id. | fix: fall back to `item[sort.key]` |
| R1-10 | low | `lib/http.ts:6`, `hooks/use-auth-backend.ts`, `hooks/api/api-client.ts:60` | Import cycle http → use-auth-backend → store → api-client → http; `getRequests(http)` at module evaluation only works because of import order. | fix: api-client resolves `http` lazily |
| R1-11 | low | `hooks/api/use-downloader.ts:9-22` | Vue downloaded via `useFetch` (no axios interceptors); the port uses `http`, so a 401 triggers refresh/logout and error bodies toast twice; the object URL is never revoked. | fix: plain `axios` without interceptors (with the auth header as `useFetch` had it via cookie), revoke the URL, remove the link |
| R1-12 | low | `components/global/BaseNumberInput.tsx:44-47, 65-81` | Callers' `slotProps.htmlInput/input` are overwritten; with `precision=0`, "1.5" commits 2 but keeps showing "1.5" until blur. | fix: merge caller slotProps; show the rounded value |
| R1-13 | low | `hooks/use-announcements.ts:124-130` | Vue re-runs `initUnreadAnnouncements()` on every `useAnnouncements()` setup; the port only once per user. | fix: re-init on mount |
| R1-14 | low | `hooks/utils/use-form-validation.ts:59-62` | `validate()` returns the last render's `isValid`; set-and-validate in one tick sees a stale result. | fix (doc): no current caller sets and validates in the same tick; document the limitation in the header |
| R1-15 | low | `hooks/utils/use-storage.ts:60-102` | Stores are cached per key with the first caller's defaults; defaults are never written to storage. Behaviour equals Vue for all current callers. | decline: behaviour-equal for every caller; documented in the file header |
| R1-16 | low | `components/Layout/LayoutParts/AppSidebar.tsx:157-188` | Profile row link contains the favorites link (nested `<a>`); Vue has the same nesting. | fix: outer row navigates by `onClick` like `UserProfileLinkCard` |
| R1-17 | low | `routes/__tests__/guards.test.ts:50` | Kept assertion `navigateTo` not called can never fail (guards throw `redirect`). | fix: add a spy on `redirect` asserting it was not called (kept assertion stays) |

## R2 — domains

| # | Sev | Location | Finding | Decision |
|---|---|---|---|---|
| R2-1 | medium | `components/Domain/Recipe/RecipePage/RecipePageParts/RecipePageIngredientEditor.tsx:144-154, 182-204` | Ingredient drag-and-drop dead after the list container remounts. | fix: same as R1-3 |
| R2-2 | low | `pages/household/mealplan/planner/edit.tsx:170-175` | Recipe meal cards use a `<Box onClick>` wrapper; the focusable `ListItemButton` has no handler, so Enter/Space do not open the edit dialog. | fix: `RecipeCardLineItem onClick` (D51f) |
| R2-3 | low | `pages/admin/manage/households/[id].tsx:90-95`, `pages/admin/manage/groups/[id].tsx:121-126` | `<Box onSubmit>` renders a `div`; Enter in the name field does not submit (Vue `v-form @submit.prevent` does). | fix: `component="form"`, Update button `type="submit"` |
| R2-4 | low | `pages/admin/manage/households/[id].tsx:32-52`, `pages/admin/manage/groups/[id].tsx:30-51` | When the background re-fetch of a cached record lands, the edit copy is reset (keyed by object identity) and typed edits are lost. | fix: key the edit copy by record id |
| R2-5 | low | `pages/shopping-lists/[id].tsx:122-130, 256-277, 595-606` | `viewSx` targets `.shopping-list-item-row`, which no element has; checked rows lack `strike-through-note`. Compact row styling never applies. | fix: `className` prop on `ShoppingListItem` |
| R2-6 | low | `pages/shopping-lists/[id].tsx`, `pages/admin/manage/users/[id].tsx`, `pages/group/reports/[id].tsx` | No remount on param-only navigation. | fix: same as R1-4 |
| R2-7 | low | `pages/admin/backups.tsx:222-229` | Vue's `@click:row="setSelected"` missing. | fix: `onRowClick` |
| R2-8 | low | `pages/g/[groupSlug]/r/[slug]/index.tsx:66` | Tab title follows every keystroke in the name field and empties when cleared; Vue set it only on load/save to a non-empty name. | fix: title from the last non-empty loaded/saved name |
| R2-9 | low | `pages/g/[groupSlug]/recipes/timeline.tsx:18-44` | With cached data, `RecipeTimeline` mounts before `ready` and loads the first page twice. | fix: render the timeline once `ready` |
| R2-10 | low | `pages/shopping-lists/index.tsx:60-61`, `pages/admin/site-settings.tsx:156-160` | Per-visit `useAsyncData` keys grow the module-level cache until logout. | fix: stable keys with explicit refresh on mount |
| R2-11 | low | `components/Domain/Recipe/RecipeContextMenu/RecipeContextMenuContent.tsx:170-174` | Household fetch effect has no stale-response guard. | fix: `active` flag |
| R2-12 | low | `pages/g/[groupSlug]/r/create/bulk.tsx:111-112`, `components/Domain/Recipe/RecipeImportImages.tsx:100` | Deletable rows keyed by index (as in Vue); child state (organizer search, crop) shifts to the next row on delete. | fix: stable per-row ids |

## Overall assessment (reviewers)

- R1: "The foundation is a faithful, well-commented port: auth, http, stores, guards, i18n and the shared components
  match Vue closely, and the tests carry over without weakened assertions. The real defects are React-specific: portal
  event bubbling in BaseDialog, the ref-object dependency in use-sortable, no remount on param change, and basename
  leaking into guard redirects under SUB_PATH."
- R2: "Parity is high. … I found no wrong API calls, guard gaps, or i18n/accessibility contract breaks. React
  correctness is solid overall … The one real behaviour bug is the Sortable attachment; the rest are latent or
  cosmetic."
- Both checked clean: every `dangerouslySetInnerHTML` is DOMPurify output (or translated text + number, as in Vue);
  login validates `redirect` with `isSafeRedirectTarget`; route guards match every page's `definePageMeta`; all Vue test
  files in scope have counterparts with the same titles and assertions; no `any` without reason, no TODO-like text.

## P5-03 outcome

(filled in P5-03)
