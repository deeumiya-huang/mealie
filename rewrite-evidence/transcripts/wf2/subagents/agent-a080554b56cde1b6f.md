# WF2 subagent — session `agent-a080554b56cde1b6f`

2026-10-07 09:15 → 2026-10-07 09:25 UTC

### Human [2026-10-07 09:15]

```text
You are reviewer R1 for WF2. You did not write this code. Read PROCESS.md §0–§1 and
frontend-react/CLAUDE.md. Scope (all under /home/deeumiya/mealie-wf2/frontend-react/src/): `lib/**` EXCLUDING `lib/api/**`
(lib/api is a verbatim copy of the Vue API client), `i18n/**`, `providers/**`, `routes/**`, `hooks/**`,
`components/global/**`, `layouts/**`, `components/Layout/**`. For each file compare against its Vue source (mirrored path
under frontend/app/; hooks ↔ composables, layouts ↔ layouts, routes/guards ↔ middleware, providers ↔ plugins) for
behavioural parity, then check: rules §1.1 (strings via i18n, accessible names, no any/TODO, no stubs), React correctness
(hooks rules, effect deps, stale closures, keys, memory leaks/timers, race conditions on async effects), auth/multi-tenant
handling (guards, group slug), security (dangerouslySetInnerHTML only with DOMPurify, redirect validation), test parity
(no weakened assertions; Vue tests are `*.test.ts` next to sources under frontend/app/, React ones at mirrored paths).
Do not report style/formatting. The scope is large (~21k lines): prioritise core infra (lib/store.ts, lib/http.ts,
hooks/use-auth-backend, use-mealie-auth, routes/guards.ts, hooks/partials, hooks/store, i18n) and shared global
components first. Known/accepted deviations are in PROCESS.md §8 (D1–D51) and §9 "Known gaps" — do not re-report those
unless the implementation contradicts the decision.
Output a list:
  severity (high|medium|low) | file:line | finding | suggested fix
Max 40 findings, most severe first. Then 3 lines: overall assessment.
```

`Grep`

```text
{"pattern": "^#+ ", "path": "/home/deeumiya/mealie-wf2/PROCESS.md", "output_mode": "content"}
```

> result: 1:# WF2 — Mealie frontend: Nuxt/Vue/Vuetify → React (orchestrated, phased) ⏎ 11:## 0. Goal (fixed, identical to the comparison baseline — never change it) ⏎ 41:## 1. Conventions and rules ⏎ 43:### 1.1 Rules every agent follows (main session, porters, reviewers) ⏎ 89:### 1.2 Target stack and layout (`frontend-react/`) ⏎ 138:### 1.3 Vue reactivity / composition API → React ⏎ 170:### 1.4 Nuxt auto-imports and Nu … [1251 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/CLAUDE.md
```

> result: 1	# frontend-react — agent guide (WF2) ⏎ 2	 ⏎ 3	React rewrite of the Mealie frontend (`../frontend/`, Nuxt 4 + Vue 3 + Vuetify 4). The full process, ⏎ 4	rules and mapping tables are in `../PROCESS.md` (§1 is authoritative); this file is the short version ⏎ 5	for working inside this directory. ⏎ 6	 ⏎ 7	## Stack ⏎ 8	Vite · React 19 · TypeScript strict · React Router data router (`createBrowserRouter`) · MUI (+ ⏎ 9	 … [5229 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/PROCESS.md
```

> result: 1	# WF2 — Mealie frontend: Nuxt/Vue/Vuetify → React (orchestrated, phased) ⏎ 2	 ⏎ 3	This file is the single source of truth for the WF2 run. A fresh session with no memory of earlier ⏎ 4	sessions must be able to execute the next step from this file alone. **§9 Status** is the only ⏎ 5	section that changes routinely. §8 Decision log only gets new entries appended. ⏎ 6	 ⏎ 7	Branch: `rewrite/wf2-orchestrated`. B … [26494 more chars]

**Claude [2026-10-07 09:15]:**

Now the decision log and known gaps.

`Read`

```text
/home/deeumiya/mealie-wf2/PROCESS.md
```

> result: 619	## 8. Decision log (append only: `D<n> — <date> — decision — reason`) ⏎ 620	 ⏎ 621	- D1 — 2026-10-05 — Copy `frontend/app/lib/api` into `src/lib/api` via `scripts/sync-api.mjs` instead of ⏎ 622	  importing across directories. — A cross-dir import resolves bare modules (`axios`) from ⏎ 623	  `frontend/node_modules`, which does not exist in porter worktrees; the copy keeps the build ⏎ 624	  self-contained … [39788 more chars]

`Glob`

```text
{"pattern": "src/{lib/*.ts,lib/!(api)/**,i18n/**,providers/**,routes/**,layouts/**,components/Layout/**}", "path": "/home/deeumiya/mealie-wf2/frontend-react"}
```

`Glob`

```text
{"pattern": "src/hooks/**", "path": "/home/deeumiya/mealie-wf2/frontend-react"}
```

> result: frontend-react/src/hooks/utils/use-storage.ts ⏎ frontend-react/src/hooks/utils/use-display.ts ⏎ frontend-react/src/hooks/utils/use-page-title.ts ⏎ frontend-react/src/hooks/utils/use-debounce.ts ⏎ frontend-react/src/hooks/utils/use-online.ts ⏎ frontend-react/src/hooks/utils/use-clipboard.ts ⏎ frontend-react/src/hooks/utils/use-wake-lock.ts ⏎ frontend-react/src/hooks/utils/use-async-data.ts ⏎ frontend-react/src/hoo … [4866 more chars]

> result: frontend-react/src/lib/store.ts ⏎ frontend-react/src/providers/AppInfoProvider.tsx ⏎ frontend-react/src/lib/navigation.ts ⏎ frontend-react/src/lib/http.ts ⏎ frontend-react/src/providers/color-mode.ts ⏎ frontend-react/src/providers/ThemeModeProvider.tsx ⏎ frontend-react/src/providers/app-info.ts ⏎ frontend-react/src/i18n/compat.ts ⏎ frontend-react/src/i18n/locales.ts ⏎ frontend-react/src/i18n/index.ts ⏎ frontend-react … [1419 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/lib/store.ts
```

> result: 1	import { useCallback, useSyncExternalStore } from "react"; ⏎ 2	 ⏎ 3	/** ⏎ 4	 * Module-level shared state (port of the Vue module-scope `ref`s used as stores and caches). ⏎ 5	 * ⏎ 6	 *   const counter = createStore(0); ⏎ 7	 *   counter.set(n => n + 1);            // anywhere, also outside React ⏎ 8	 *   const n = useStore(counter);        // in a component: re-renders on change ⏎ 9	 *   const name = useStore(use … [1294 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/lib/http.ts
```

> result: 1	// Port of plugins/axios.ts: the one axios instance every API client uses (Bearer token from the ⏎ 2	// cookie, embedded flag, 401 -> shared refresh -> replay once -> logout, toasts for API messages). ⏎ 3	import axios from "axios"; ⏎ 4	import type { InternalAxiosRequestConfig } from "axios"; ⏎ 5	import { AUTH_TOKEN } from "@/config"; ⏎ 6	import { authBackend } from "@/hooks/use-auth-backend"; ⏎ 7	import { a … [6408 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/plugins/axios.ts
```

> result: 1	import axios from "axios"; ⏎ 2	import type { InternalAxiosRequestConfig } from "axios"; ⏎ 3	import { alert } from "~/composables/use-toast"; ⏎ 4	import { readTokenCookie } from "~/composables/use-token-cookie"; ⏎ 5	import { isSafeRedirectTarget } from "~/lib/validators/redirect"; ⏎ 6	 ⏎ 7	declare module "axios" { ⏎ 8	  interface AxiosRequestConfig { ⏎ 9	    suppressAlert?: boolean; ⏎ 10	  } ⏎ 11	} ⏎ 12	 ⏎ 13	/** Reques … [5923 more chars]

`Glob`

```text
{"pattern": "src/hooks/use-*.ts", "path": "/home/deeumiya/mealie-wf2/frontend-react"}
```

> result: frontend-react/src/hooks/use-token-cookie.ts ⏎ frontend-react/src/hooks/use-toast.ts ⏎ frontend-react/src/hooks/use-mealie-auth.ts ⏎ frontend-react/src/hooks/use-logged-in-state.ts ⏎ frontend-react/src/hooks/use-clear-composable-caches.ts ⏎ frontend-react/src/hooks/use-validators.ts ⏎ frontend-react/src/hooks/use-passwords.ts ⏎ frontend-react/src/hooks/use-utils.ts ⏎ frontend-react/src/hooks/use-groups.ts ⏎ fronten … [1058 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/useAuthBackend.ts
```

> result: File does not exist. Note: your current working directory is /home/deeumiya/mealie-wf2.

`Glob`

```text
{"pattern": "frontend/app/composables/*.ts"}
```

> result: frontend/app/composables/use-announcements.ts ⏎ frontend/app/composables/use-backups.ts ⏎ frontend/app/composables/use-auth-backend.ts ⏎ frontend/app/composables/use-default-activity.ts ⏎ frontend/app/composables/use-clear-composable-caches.ts ⏎ frontend/app/composables/use-group-mealplan.ts ⏎ frontend/app/composables/use-groups.ts ⏎ frontend/app/composables/use-group-cookbooks.ts ⏎ frontend/app/composables/use-g … [1049 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-auth-backend.ts
```

> result: 1	import { ref, computed, watch } from "vue"; ⏎ 2	import type { UserOut } from "~/lib/api/types/user"; ⏎ 3	import { clearAllStores } from "~/composables/store"; ⏎ 4	import { clearComposableCaches } from "~/composables/use-clear-composable-caches"; ⏎ 5	import { getTokenCookieOptions, getTokenExpiry, nextRefreshDelay, readTokenCookie } from "~/composables/use-token-cookie"; ⏎ 6	 ⏎ 7	interface AuthData { ⏎ 8	  val … [10985 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-auth-backend.ts
```

> result: 1	import type { User } from "@/types/auth"; ⏎ 2	import { AUTH_TOKEN } from "@/config"; ⏎ 3	import { clearAllStores } from "@/hooks/store"; ⏎ 4	import { clearComposableCaches } from "@/hooks/use-clear-composable-caches"; ⏎ 5	import { clearTokenCookie, getTokenExpiry, nextRefreshDelay, readTokenCookie } from "@/hooks/use-token-cookie"; ⏎ 6	import { clearAsyncDataCache } from "@/hooks/utils/use-async-data"; ⏎ 7	 … [10353 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-mealie-auth.ts
```

> result: 1	import { useState } from "react"; ⏎ 2	import { authBackend, useAuthBackend } from "@/hooks/use-auth-backend"; ⏎ 3	import { http } from "@/lib/http"; ⏎ 4	 ⏎ 5	async function oauthSignIn() { ⏎ 6	  const params = new URLSearchParams(window.location.search); ⏎ 7	  const { data: token } = await http.get<{ access_token: string; token_type: "bearer" }>("/api/auth/oauth/callback", { params }); ⏎ 8	  authBackend.setTo … [1105 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-mealie-auth.ts
```

> result: 1	import { ref, watch, computed } from "vue"; ⏎ 2	import { useAuthBackend } from "~/composables/use-auth-backend"; ⏎ 3	import type { UserOut } from "~/lib/api/types/user"; ⏎ 4	 ⏎ 5	export const useMealieAuth = function () { ⏎ 6	  const auth = useAuthBackend(); ⏎ 7	  const { $axios } = useNuxtApp(); ⏎ 8	 ⏎ 9	  // User Management ⏎ 10	  const lastUser = ref<UserOut | null>(null); ⏎ 11	  const user = computed(() => last … [1317 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/guards.ts
```

> result: 1	import { redirect, type LoaderFunctionArgs, type ShouldRevalidateFunction } from "react-router"; ⏎ 2	import { authBackend } from "@/hooks/use-auth-backend"; ⏎ 3	 ⏎ 4	/** ⏎ 5	 * Ports of middleware/*.ts as loader helpers (PROCESS.md §1.7). A guard throws a `redirect` like a ⏎ 6	 * Nuxt middleware returning `navigateTo(...)`; the "…-only" middlewares, which redirect home, also ⏎ 7	 * apply on a hard load (dec … [4544 more chars]

`Glob`

```text
{"pattern": "frontend/app/{middleware,plugins,layouts}/**"}
```

> result: frontend/app/layouts/admin.vue ⏎ frontend/app/layouts/blank.vue ⏎ frontend/app/layouts/basic.vue ⏎ frontend/app/layouts/default.vue ⏎ frontend/app/layouts/error.vue ⏎ frontend/app/middleware/can-manage-household-only.ts ⏎ frontend/app/middleware/can-organize-only.ts ⏎ frontend/app/middleware/auth.ts ⏎ frontend/app/middleware/group-only.ts ⏎ frontend/app/middleware/advanced-only.ts ⏎ frontend/app/middleware/__tests__/ … [455 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/middleware/auth.ts
```

> result: 1	export default defineNuxtRouteMiddleware((to) => { ⏎ 2	  const { loggedIn } = useMealieAuth(); ⏎ 3	  // If the user is not logged in redirect to the login page, then back here once they are ⏎ 4	  if (!loggedIn.value) { ⏎ 5	    return navigateTo({ path: "/login", query: { redirect: to.fullPath } }); ⏎ 6	  } ⏎ 7	}); ⏎ 8

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/middleware/group-only.ts
```

> result: 1	export default defineNuxtRouteMiddleware((to) => { ⏎ 2	  const { user } = useMealieAuth(); ⏎ 3	  // this can only be used for routes that have a groupSlug parameter (e.g. /g/:groupSlug/...) ⏎ 4	  if (to.params.groupSlug !== user.value?.groupSlug) { ⏎ 5	    navigateTo("/"); ⏎ 6	  } ⏎ 7	}); ⏎ 8

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/middleware/admin-only.ts
```

> result: 1	export default defineNuxtRouteMiddleware(() => { ⏎ 2	  const { user } = useMealieAuth(); ⏎ 3	  // If the user is not an admin redirect to the home page ⏎ 4	  if (!user.value?.admin) { ⏎ 5	    navigateTo("/"); ⏎ 6	  } ⏎ 7	}); ⏎ 8

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/middleware/pwa-share-target-redirect.global.ts
```

> result: 1	export default defineNuxtRouteMiddleware((to) => { ⏎ 2	  if (to.path === "/r/create/url") { ⏎ 3	    const { user } = useMealieAuth(); ⏎ 4	    const groupSlug = user.value?.groupSlug; ⏎ 5	    if (!groupSlug) { ⏎ 6	      // Preserve the full path (including recipe_import_url query param) so the ⏎ 7	      // login page can redirect back here after successful authentication. ⏎ 8	      const redirect = encodeURICo … [210 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/plugins/init-auth.client.ts
```

> result: 1	export default defineNuxtPlugin({ ⏎ 2	  async setup() { ⏎ 3	    const auth = useAuthBackend(); ⏎ 4	 ⏎ 5	    console.debug("Initializing auth plugin"); ⏎ 6	    // Must come first: it hydrates the token from the cookie, which getSession checks before it ⏎ 7	    // will bother asking the server who we are. ⏎ 8	    auth.initTokenRefresh(); ⏎ 9	    await auth.getSession(); ⏎ 10	    console.debug("Auth plugin initializ … [23 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/index.tsx
```

> result: 1	import type { ReactNode } from "react"; ⏎ 2	import { createBrowserRouter, Outlet, type RouteObject } from "react-router"; ⏎ 3	import { adminRoutes } from "./admin"; ⏎ 4	import { authRoutes } from "./auth"; ⏎ 5	import { exploreRoutes } from "./explore"; ⏎ 6	import { groupRoutes } from "./group"; ⏎ 7	import { guard, initAuth, pwaShareTargetRedirect } from "./guards"; ⏎ 8	import { householdRoutes } from "./house … [2570 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/__tests__/guards.test.ts
```

> result: 1	import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"; ⏎ 2	 ⏎ 3	const navigateTo = vi.hoisted(() => vi.fn((to: unknown) => to)); ⏎ 4	 ⏎ 5	vi.mock("@/lib/navigation", () => ({ navigateTo, setNavigate: vi.fn() })); ⏎ 6	 ⏎ 7	// The Vue test stubbed `useMealieAuth` with a `loggedIn` ref; here the auth store gets the status. ⏎ 8	let loggedIn = false; ⏎ 9	function setLoggedIn(value: boolean) { ⏎ 10 … [1536 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/middleware/__tests__/auth.test.ts
```

> result: 1	import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"; ⏎ 2	import { ref } from "vue"; ⏎ 3	 ⏎ 4	const loggedIn = ref(false); ⏎ 5	const navigateTo = vi.fn((to: unknown) => to); ⏎ 6	 ⏎ 7	describe("auth middleware", () => { ⏎ 8	  beforeEach(() => { ⏎ 9	    vi.resetModules(); ⏎ 10	    navigateTo.mockClear(); ⏎ 11	    vi.stubGlobal("defineNuxtRouteMiddleware", (fn: unknown) => fn); ⏎ 12	    vi.stubGlob … [927 more chars]

`Grep`

```text
{"pattern": "redirect", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/pages/login.tsx", "output_mode": "content"}
```

> result: 32:import { isSafeRedirectTarget } from "@/lib/validators/redirect"; ⏎ 67:  // Survives the page reload that happens during OIDC redirect ⏎ 68:  const [pendingShareRedirect, setPendingShareRedirect] = useSessionStorage<string | null>("pwa_share_redirect", null); ⏎ 102:  const redirected = useRef(false); ⏎ 103:  const redirectFromQuery = searchParams.get("redirect") ?? undefined; ⏎ 106:      redirected.curre … [792 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/lib/navigation.ts
```

> result: 1	/** ⏎ 2	 * Navigation from outside React components (auth module, interceptors) — the port of calling ⏎ 3	 * `useRouter().push()` in a composable. App registers the data router's `navigate` on startup; ⏎ 4	 * before that (or in plain scripts) it falls back to a full page load. ⏎ 5	 */ ⏎ 6	export interface NavigateOptions { ⏎ 7	  replace?: boolean; ⏎ 8	} ⏎ 9	 ⏎ 10	type NavigateFn = (to: string, options?: NavigateO … [464 more chars]

`Grep`

```text
{"pattern": "middleware|layout:", "path": "/home/deeumiya/mealie-wf2/frontend/app/pages", "output_mode": "content"}
```

> result: frontend/app/pages/shopping-lists/index.vue:140:  middleware: ["auth"], ⏎ frontend/app/pages/group/reports/[id].vue:55:  middleware: ["auth"], ⏎ frontend/app/pages/reset-password.vue:92:  layout: "basic", ⏎ frontend/app/pages/forgot-password.vue:71:  layout: "basic", ⏎ frontend/app/pages/shopping-lists/[id].vue:411:  middleware: ["auth"], ⏎ frontend/app/pages/g/[groupSlug]/shared/r/[id].vue:17:  layout: "ba … [2814 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/admin.tsx
```

> result: 1	import type { RouteObject } from "react-router"; ⏎ 2	import { adminOnly, alwaysRevalidate, guard, requireAuth } from "./guards"; ⏎ 3	import { page, type DomainRoutes } from "./lazy"; ⏎ 4	 ⏎ 5	// Domain "admin (/admin/**)" (PROCESS.md §1.7). pages/admin.vue is a Nuxt parent whose middleware ⏎ 6	// ["auth", "admin-only"] applies to every /admin/** page and which renders only <NuxtPage />. ⏎ 7	// ⏎ 8	// Route sh … [2556 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/explore.tsx
```

> result: 1	import { alwaysRevalidate, guard, groupOnly, requireAuth } from "./guards"; ⏎ 2	import { page, type DomainRoutes } from "./lazy"; ⏎ 3	 ⏎ 4	// Domain "explore (/g/:groupSlug, cookbooks, organizers, finder, timeline)" (PROCESS.md §1.7). All pages use layout ⏎ 5	// `default`. The explorer (`g/:groupSlug`), a single cookbook and the recipe finder have no middleware (public); ⏎ 6	// the others have middleware  … [1773 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/group.tsx
```

> result: 1	import { advancedOnly, alwaysRevalidate, canManageOnly, canOrganizeOnly, guard, requireAuth } from "./guards"; ⏎ 2	import { page, type DomainRoutes } from "./lazy"; ⏎ 3	 ⏎ 4	// Domain "group (/group/**)" (PROCESS.md §1.7): group/index, group/migrations, group/reports/[id], group/data ⏎ 5	// (a Nuxt parent that renders <NuxtPage />) and its children index (redirect to foods), foods, units, labels, ⏎ 6	// c … [1965 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/household.tsx
```

> result: 1	import { redirect } from "react-router"; ⏎ 2	import { advancedOnly, alwaysRevalidate, canManageHouseholdOnly, guard, requireAuth, type Guard } from "./guards"; ⏎ 3	import { page, type DomainRoutes } from "./lazy"; ⏎ 4	 ⏎ 5	// Domain "household (/household/**)" (PROCESS.md §1.7). All pages use layout `default` (none of the Vue pages sets a ⏎ 6	// layout). Guards = the Vue `middleware` arrays; pages/househo … [2158 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/recipe-create.tsx
```

> result: 1	import { alwaysRevalidate, groupOnly, guard, requireAuth } from "./guards"; ⏎ 2	import { page, type DomainRoutes } from "./lazy"; ⏎ 3	 ⏎ 4	// Domain "recipe-create (/g/:groupSlug/r/create/**)" (PROCESS.md §1.7): create (a Nuxt parent rendering <NuxtPage /> ⏎ 5	// under the shared "Recipe Creation" header) and its children index (redirect to url), url, ai, bulk, html, zip, new, ⏎ 6	// debug and image (redi … [1313 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/auth.tsx
```

> result: 1	import { page, type DomainRoutes } from "./lazy"; ⏎ 2	 ⏎ 3	// Domain "auth" (PROCESS.md §1.7): index, login, register, forgot-password, reset-password. ⏎ 4	export const authRoutes: DomainRoutes = { ⏎ 5	  blank: [ ⏎ 6	    { index: true, ...page(() => import("@/pages/index")) }, ⏎ 7	    { path: "login", ...page(() => import("@/pages/login")) }, ⏎ 8	    { path: "register", ...page(() => import("@/pages/register/ … [219 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/lazy.ts
```

> result: 1	import type { ComponentType } from "react"; ⏎ 2	import type { RouteObject } from "react-router"; ⏎ 3	 ⏎ 4	/** ⏎ 5	 * A route's page component, loaded on first visit (Nuxt splits every page into its own chunk too). ⏎ 6	 * ⏎ 7	 *   { path: "login", ...page(() => import("@/pages/login")) } ⏎ 8	 */ ⏎ 9	export function page(load: () => Promise<{ default: ComponentType }>): Pick<RouteObject, "lazy"> { ⏎ 10	  return { ⏎ 1 … [343 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/recipe-page.tsx
```

> result: 1	import { page, type DomainRoutes } from "./lazy"; ⏎ 2	 ⏎ 3	// Domain "recipe-page (/g/:groupSlug/r/:slug, shared recipes)" (PROCESS.md §1.7). Neither Vue page has middleware: ⏎ 4	// a recipe is viewable logged out (the page picks the user or the public API itself) and a shared recipe needs no ⏎ 5	// login. `r/[slug]` has no layout (→ default); `shared/r/[id]` uses layout "basic". The root loader has alr … [492 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/user.tsx
```

> result: 1	import { advancedOnly, alwaysRevalidate, guard, requireAuth } from "./guards"; ⏎ 2	import { page, type DomainRoutes } from "./lazy"; ⏎ 3	 ⏎ 4	// Domain "user (/user/**)" (PROCESS.md §1.7): profile, profile/edit, profile/api-tokens, [id]/favorites. ⏎ 5	// Layout `default` for all four (none of the Vue pages sets a layout). ⏎ 6	export const userRoutes: DomainRoutes = { ⏎ 7	  default: [ ⏎ 8	    { ⏎ 9	      path: " … [808 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/routes/shopping.tsx
```

> result: 1	import { alwaysRevalidate, guard, requireAuth } from "./guards"; ⏎ 2	import { page, type DomainRoutes } from "./lazy"; ⏎ 3	 ⏎ 4	// Domain "shopping (/shopping-lists/**)" (PROCESS.md §1.7): shopping-lists, shopping-lists/[id]. ⏎ 5	// Layout `default` for both (neither Vue page sets a layout); both have middleware ["auth"]. ⏎ 6	export const shoppingRoutes: DomainRoutes = { ⏎ 7	  default: [ ⏎ 8	    { ⏎ 9	      pat … [394 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/partials/use-store-factory.ts
```

> result: 1	import { useCallback, useEffect, useMemo, useState } from "react"; ⏎ 2	import { createReadOnlyActions, createStoreActions } from "./use-actions-factory"; ⏎ 3	import type { BoundT } from "./types"; ⏎ 4	import type { BaseCRUDAPI, BaseCRUDAPIReadOnly } from "@/lib/api/base/base-clients"; ⏎ 5	import type { QueryValue } from "@/lib/api/base/route"; ⏎ 6	import { useStore as useStoreValue, type Store } from "@/l … [2945 more chars]

`Glob`

```text
{"pattern": "frontend/app/composables/{partials,store}/**"}
```

> result: frontend/app/composables/partials/use-actions-factory.ts ⏎ frontend/app/composables/partials/__tests__/use-actions-factory.test.ts ⏎ frontend/app/composables/partials/use-store-factory.ts ⏎ frontend/app/composables/partials/types.ts ⏎ frontend/app/composables/store/index.ts ⏎ frontend/app/composables/store/use-cookbook-store.ts ⏎ frontend/app/composables/store/use-category-store.ts ⏎ frontend/app/composables/st … [320 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/partials/use-store-factory.ts
```

> result: 1	import { useReadOnlyActions, useStoreActions } from "./use-actions-factory"; ⏎ 2	import type { BoundT } from "./types"; ⏎ 3	import type { BaseCRUDAPI, BaseCRUDAPIReadOnly } from "~/lib/api/base/base-clients"; ⏎ 4	import type { QueryValue } from "~/lib/api/base/route"; ⏎ 5	 ⏎ 6	export const useData = function <T extends BoundT>(defaultObject: T) { ⏎ 7	  const data = reactive({ ...defaultObject }); ⏎ 8	  functi … [1634 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/partials/use-actions-factory.ts
```

> result: 1	import type { AsyncData, NuxtError } from "#app"; ⏎ 2	import type { BoundT } from "./types"; ⏎ 3	import type { BaseCRUDAPI, BaseCRUDAPIReadOnly } from "~/lib/api/base/base-clients"; ⏎ 4	import type { QueryValue } from "~/lib/api/base/route"; ⏎ 5	 ⏎ 6	interface ReadOnlyStoreActions<T extends BoundT> { ⏎ 7	  getAll(page?: number, perPage?: number, params?: any): AsyncData<T[] | null, NuxtError<unknown> | null … [5585 more chars]

`Glob`

```text
{"pattern": "src/hooks/partials/*", "path": "/home/deeumiya/mealie-wf2/frontend-react"}
```

> result: frontend-react/src/hooks/partials/types.ts ⏎ frontend-react/src/hooks/partials/use-store-factory.ts ⏎ frontend-react/src/hooks/partials/use-actions-factory.ts

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/partials/use-actions-factory.ts
```

> result: 1	import type { BoundT } from "./types"; ⏎ 2	import type { BaseCRUDAPI, BaseCRUDAPIReadOnly } from "@/lib/api/base/base-clients"; ⏎ 3	import type { QueryValue } from "@/lib/api/base/route"; ⏎ 4	import type { Store } from "@/lib/store"; ⏎ 5	 ⏎ 6	// Port of composables/partials/use-actions-factory.ts. The Vue refs become module-level stores ⏎ 7	// (lib/store.ts); these factories call no React hooks, hence `crea … [4504 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/store/use-food-store.ts
```

> result: 1	import { useData, useReadOnlyStore, useStore } from "../partials/use-store-factory"; ⏎ 2	import type { IngredientFood } from "@/lib/api/types/recipe"; ⏎ 3	import { usePublicExploreApi, useUserApi } from "@/hooks/api"; ⏎ 4	import { createStore } from "@/lib/store"; ⏎ 5	 ⏎ 6	const store = createStore<IngredientFood[]>([]); ⏎ 7	const loading = createStore(false); ⏎ 8	const initialized = createStore(false); ⏎ 9	con … [920 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/store/use-food-store.ts
```

> result: 1	import type { Composer } from "vue-i18n"; ⏎ 2	import { useData, useReadOnlyStore, useStore } from "../partials/use-store-factory"; ⏎ 3	import type { IngredientFood } from "~/lib/api/types/recipe"; ⏎ 4	import { usePublicExploreApi, useUserApi } from "~/composables/api"; ⏎ 5	 ⏎ 6	const store: Ref<IngredientFood[]> = ref([]); ⏎ 7	const loading = ref(false); ⏎ 8	const initialized = ref(false); ⏎ 9	const publicLoadi … [901 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/store/index.ts
```

> result: 1	import { resetCategoryStore } from "./use-category-store"; ⏎ 2	import { resetFoodStore } from "./use-food-store"; ⏎ 3	import { resetHouseholdStore } from "./use-household-store"; ⏎ 4	import { resetLabelStore } from "./use-label-store"; ⏎ 5	import { resetTagStore } from "./use-tag-store"; ⏎ 6	import { resetToolStore } from "./use-tool-store"; ⏎ 7	import { resetUnitStore } from "./use-unit-store"; ⏎ 8	import {  … [1241 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/store/index.ts
```

> result: 1	import { resetCategoryStore } from "./use-category-store"; ⏎ 2	import { resetFoodStore } from "./use-food-store"; ⏎ 3	import { resetHouseholdStore } from "./use-household-store"; ⏎ 4	import { resetLabelStore } from "./use-label-store"; ⏎ 5	import { resetTagStore } from "./use-tag-store"; ⏎ 6	import { resetToolStore } from "./use-tool-store"; ⏎ 7	import { resetUnitStore } from "./use-unit-store"; ⏎ 8	import {  … [1241 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/api/api-client.ts
```

> result: 1	import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios"; ⏎ 2	import type { ApiRequestInstance, RequestResponse } from "@/lib/api/types/non-generated"; ⏎ 3	import { AdminAPI, PublicApi, UserApi } from "@/lib/api"; ⏎ 4	import { PublicExploreApi } from "@/lib/api/client-public"; ⏎ 5	import { http } from "@/lib/http"; ⏎ 6	 ⏎ 7	// Port of composables/api/api-client.ts. The clients are state … [3024 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/api/api-client.ts
```

> result: 1	import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios"; ⏎ 2	import type { Composer } from "vue-i18n"; ⏎ 3	import type { ApiRequestInstance, RequestResponse } from "~/lib/api/types/non-generated"; ⏎ 4	import { AdminAPI, PublicApi, UserApi } from "~/lib/api"; ⏎ 5	import { PublicExploreApi } from "~/lib/api/client-public"; ⏎ 6	import { useGlobalI18n } from "~/composables/use-global-i18 … [2797 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/i18n/index.ts
```

> result: 1	import { useMemo } from "react"; ⏎ 2	import i18next from "i18next"; ⏎ 3	import { initReactI18next, useTranslation } from "react-i18next"; ⏎ 4	import { createDateFormat, createTranslate, type DateFn, type TranslateFn } from "./compat"; ⏎ 5	import { ⏎ 6	  DEFAULT_LOCALE, ⏎ 7	  detectLocale, ⏎ 8	  getDateTimeFormats, ⏎ 9	  getLocaleDir, ⏎ 10	  isLocaleCode, ⏎ 11	  loadLocaleMessages, ⏎ 12	  writeLocaleCookie, ⏎ 13	  type  … [4383 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/i18n/compat.ts
```

> result: 1	// vue-i18n message semantics on top of i18next resources (PROCESS.md §1.6, decision D2). ⏎ 2	// The locale JSON files are vue-i18n messages: `{name}` / `{0}` interpolation and `a | b | c` plurals. ⏎ 3	// i18next only stores the resources and tracks the language; formatting happens here so `t()` behaves ⏎ 4	// exactly like vue-i18n's `t()` in the Vue app. ⏎ 5	 ⏎ 6	export type NamedValues = Record<string,  … [4731 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/i18n/locales.ts
```

> result: 1	// Locale files and locale selection, as configured for @nuxtjs/i18n in frontend/nuxt.config.ts: ⏎ 2	// strategy no_prefix, lazy messages, browser-language detection remembered in the `i18n_redirected` ⏎ 3	// cookie, fallback en-US. Messages are merged like frontend/app/lang/locales/<code>.ts. ⏎ 4	import { LOCALES } from "@/hooks/use-locales/available-locales"; ⏎ 5	import type { DateTimeFormats } from " … [3560 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/i18n/I18nT.tsx
```

> result: 1	import { Fragment, type ReactNode } from "react"; ⏎ 2	import { useI18n } from "./index"; ⏎ 3	 ⏎ 4	// Usage (port of vue-i18n's <i18n-t> component interpolation): ⏎ 5	//   <I18nT keypath="group.manage-members-description" slots={{ manage: <b>{t("group.manage")}</b> }} /> ⏎ 6	// Each `{name}` placeholder of the message is replaced by `slots[name]`; the rest is plain text. ⏎ 7	// Renders a fragment, like <i18n … [865 more chars]

`Grep`

```text
{"pattern": "@:|\\{'|@\\.|\\{ *[a-zA-Z0-9_]+ *\\}.*\\|", "path": "/home/deeumiya/mealie-wf2/frontend/app/lang/messages/en-US.json", "output_mode": "content"}
```

> result: 636:      "ingredient-parser-result-success": "No ingredients auto parsed | {count} ingredient auto parsed | {count} ingredients auto parsed", ⏎ 637:      "ingredient-parser-result-failed": "No ingredients to review | {count} ingredient to review | {count} ingredients to review" ⏎ 1229:    "max-length": "Must Be At Most {max} Character|Must Be At Most {max} Characters"

`Grep`

```text
{"pattern": "@:|\\{'", "path": "/home/deeumiya/mealie-wf2/frontend/app/lang/messages", "output_mode": "count"}
```

> result: No matches found ⏎  ⏎ Found 0 total occurrences across 0 files.

`Grep`

```text
{"pattern": "i18n|detectBrowser|cookie|redirectOn|fallbackLocale|defaultLocale", "path": "/home/deeumiya/mealie-wf2/frontend/nuxt.config.ts", "output_mode": "content", "-A": 2}
```

> result: 12:    "@nuxtjs/i18n", ⏎ 13-    "@nuxt/fonts", ⏎ 14-    "vuetify-nuxt-module", ⏎ -- ⏎ 168:  i18n: { ⏎ 169-    locales: [ ⏎ 170-      // CODE_GEN_ID: MESSAGE_LOCALES ⏎ -- ⏎ 217:    langDir: "./../app/lang/locales", // note: we need to up one ../ because the default root of lang dir is the /frontend/i18n, which can not be configured ⏎ 218:    defaultLocale: "en-US", ⏎ 219:    detectBrowserLanguage: { ⏎ 220-      useCooki … [289 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/providers/AppInfoProvider.tsx
```

> result: 1	import { Suspense, use, type ReactNode } from "react"; ⏎ 2	import { loadAppInfo } from "./app-info"; ⏎ 3	 ⏎ 4	// Usage: <AppInfoProvider>{app}</AppInfoProvider> — children render once /api/app/about has loaded, ⏎ 5	// like the Nuxt plugin that blocks the app until it resolves. Read it with useAppInfo(). ⏎ 6	 ⏎ 7	function AppInfoGate({ children }: { children: ReactNode }) { ⏎ 8	  use(loadAppInfo()); ⏎ 9	  return … [225 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/providers/app-info.ts
```

> result: 1	import axios from "axios"; ⏎ 2	import type { AppInfo } from "@/lib/api/types/admin"; ⏎ 3	import { createStore, useStore } from "@/lib/store"; ⏎ 4	 ⏎ 5	/** ⏎ 6	 * Port of plugins/app-info.client.ts: `/api/app/about`, fetched once before the app renders ⏎ 7	 * (see AppInfoProvider). `getAppInfo()` is for plain modules, `useAppInfo()` for components. ⏎ 8	 */ ⏎ 9	export const appInfoStore = createStore<AppInfo | nu … [1014 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/plugins/app-info.client.ts
```

> result: 1	import axios from "axios"; ⏎ 2	import type { AppInfo } from "~/lib/api/types/admin"; ⏎ 3	 ⏎ 4	export default defineNuxtPlugin({ ⏎ 5	  async setup() { ⏎ 6	    const { data } = await axios.get<AppInfo>("/api/app/about"); ⏎ 7	 ⏎ 8	    return { ⏎ 9	      provide: { ⏎ 10	        appInfo: data, ⏎ 11	      }, ⏎ 12	    }; ⏎ 13	  }, ⏎ 14	}); ⏎ 15

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/plugins/dark-mode.client.ts
```

> result: 1	import { useDark } from "@vueuse/core"; ⏎ 2	 ⏎ 3	export default defineNuxtPlugin((nuxtApp) => { ⏎ 4	  const isDark = useDark({ ⏎ 5	    onChanged: (v) => { ⏎ 6	      console.log(`changing theme to ${v ? "dark" : "light"} using @vueuse/useDark`); ⏎ 7	      const $vuetify = nuxtApp.vueApp.$nuxt.$vuetify; ⏎ 8	      if ($vuetify) ⏎ 9	        $vuetify.theme.toggle(); ⏎ 10	    }, ⏎ 11	  }); ⏎ 12	 ⏎ 13	  nuxtApp.hook("vuetify: … [149 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/plugins/theme.ts
```

> result: 1	export interface ThemeConfig { ⏎ 2	  lightPrimary: string; ⏎ 3	  lightAccent: string; ⏎ 4	  lightSecondary: string; ⏎ 5	  lightSuccess: string; ⏎ 6	  lightInfo: string; ⏎ 7	  lightWarning: string; ⏎ 8	  lightError: string; ⏎ 9	  darkPrimary: string; ⏎ 10	  darkAccent: string; ⏎ 11	  darkSecondary: string; ⏎ 12	  darkSuccess: string; ⏎ 13	  darkInfo: string; ⏎ 14	  darkWarning: string; ⏎ 15	  darkError: string; ⏎ 16	} ⏎ 17	 ⏎ 18	 … [2031 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/providers/ThemeModeProvider.tsx
```

> result: 1	import { Suspense, use, useMemo, type ReactNode } from "react"; ⏎ 2	import CssBaseline from "@mui/material/CssBaseline"; ⏎ 3	import { ThemeProvider } from "@mui/material/styles"; ⏎ 4	import { useColorMode } from "./color-mode"; ⏎ 5	import { buildTheme, fetchTheme } from "./theme"; ⏎ 6	 ⏎ 7	// Usage: <ThemeModeProvider>{app}</ThemeModeProvider> — MUI theme with the server's colours ⏎ 8	// (plugins/theme.ts) in … [648 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/providers/color-mode.ts
```

> result: 1	import { useCallback, useSyncExternalStore } from "react"; ⏎ 2	import { getStorageStore } from "@/hooks/utils/use-storage"; ⏎ 3	import { useStore } from "@/lib/store"; ⏎ 4	 ⏎ 5	/** ⏎ 6	 * Port of VueUse `useDark()` as used by plugins/dark-mode.client.ts: the choice is stored under the ⏎ 7	 * same key (`vueuse-color-scheme`: "auto" | "dark" | "light"), "auto" follows the system, and the ⏎ 8	 * pre-paint script … [1500 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/providers/I18nProvider.tsx
```

> result: 1	import { Suspense, use, type ReactNode } from "react"; ⏎ 2	import { initI18n } from "@/i18n"; ⏎ 3	 ⏎ 4	// Usage: <I18nProvider>{app}</I18nProvider> — children render once the en-US fallback and the detected ⏎ 5	// locale (cookie `i18n_redirected` → browser language → en-US) are loaded, like @nuxtjs/i18n before the ⏎ 6	// first page. Translate with useI18n() from "@/i18n". ⏎ 7	 ⏎ 8	function I18nGate({ children … [279 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/index.html
```

> result: 1	<!doctype html> ⏎ 2	<html lang="en-US" dir="ltr"> ⏎ 3	  <head> ⏎ 4	    <meta charset="utf-8" /> ⏎ 5	    <meta name="viewport" content="width=device-width, initial-scale=1" /> ⏎ 6	    <title>Mealie</title> ⏎ 7	    <meta data-hid="og:type" property="og:type" content="website" /> ⏎ 8	    <meta data-hid="og:title" property="og:title" content="Mealie" /> ⏎ 9	    <meta data-hid="og:site_name" property="og:site_name"  … [1297 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/providers/theme.ts
```

> result: 1	import { createTheme, type Theme } from "@mui/material/styles"; ⏎ 2	import { themes } from "@/config"; ⏎ 3	 ⏎ 4	/** ⏎ 5	 * Port of plugins/theme.ts: the colours come from `/api/app/about/theme` (admin-configurable via ⏎ 6	 * env on the backend) with the nuxt.config defaults as fallback. Breakpoints are Vuetify's. ⏎ 7	 */ ⏎ 8	export interface ThemeConfig { ⏎ 9	  lightPrimary: string; ⏎ 10	  lightAccent: string; ⏎ 11 … [3549 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/use-async-data.ts
```

> result: 1	import { useCallback, useEffect, useRef, useState } from "react"; ⏎ 2	 ⏎ 3	/** ⏎ 4	 * Port of Nuxt `useAsyncData(key, fn)`: runs `fn` on mount and whenever `deps` change, and caches ⏎ 5	 * the last result per key at module level so a remount shows the previous data immediately while ⏎ 6	 * it refreshes. `clearAsyncDataCache()` is the port of `clearNuxtData()` (called on logout). ⏎ 7	 * ⏎ 8	 *   const { data,  … [2167 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/use-storage.ts
```

> result: 1	import { useCallback } from "react"; ⏎ 2	import { createStore, useStore, type Store } from "@/lib/store"; ⏎ 3	 ⏎ 4	/** ⏎ 5	 * Port of VueUse `useLocalStorage` / `useSessionStorage` / `useStorage`: same keys, same ⏎ 6	 * serialisation (raw strings, numbers, booleans, JSON for objects), `mergeDefaults` for objects, ⏎ 7	 * shared between every component using the same key and synced across tabs via `storage` e … [4000 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-toast.ts
```

> result: 1	import { createStore } from "@/lib/store"; ⏎ 2	 ⏎ 3	export interface Toast { ⏎ 4	  open: boolean; ⏎ 5	  text: string; ⏎ 6	  title: string | null; ⏎ 7	  color: string; ⏎ 8	  timeout?: number; ⏎ 9	  action?: { ⏎ 10	    onClick: VoidFunction; ⏎ 11	    message?: string; ⏎ 12	  }; ⏎ 13	} ⏎ 14	 ⏎ 15	// Module-level toast state, rendered by TheSnackbar (components/Layout/LayoutParts). ⏎ 16	export const toastAlert = createStore<Toas … [2504 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-toast.ts
```

> result: 1	interface Toast { ⏎ 2	  open: boolean; ⏎ 3	  text: string; ⏎ 4	  title: string | null; ⏎ 5	  color: string; ⏎ 6	  timeout?: number; ⏎ 7	  action?: { ⏎ 8	    onClick: VoidFunction; ⏎ 9	    message?: string; ⏎ 10	  }; ⏎ 11	} ⏎ 12	 ⏎ 13	export const toastAlert = reactive<Toast>({ ⏎ 14	  open: false, ⏎ 15	  title: null, ⏎ 16	  text: "Hello From The Store", ⏎ 17	  color: "info", ⏎ 18	}); ⏎ 19	 ⏎ 20	export const toastLoading = reactive<To … [2306 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/Layout/LayoutParts/TheSnackbar.tsx
```

> result: 1	// Usage: <TheSnackbar /> once per layout — renders the module-level toasts (hooks/use-toast): ⏎ 2	// `alert.*` at the top (auto-hides, default 2 s, optional action button) and `loader.*` at the bottom ⏎ 3	// (stays until clicked). ⏎ 4	import Alert from "@mui/material/Alert"; ⏎ 5	import Box from "@mui/material/Box"; ⏎ 6	import Button from "@mui/material/Button"; ⏎ 7	import LinearProgress from "@mui/material … [3143 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/Layout/LayoutParts/TheSnackbar.vue
```

> result: 1	<template> ⏎ 2	  <div class="text-center"> ⏎ 3	    <v-snackbar ⏎ 4	      v-model="toastAlert.open" ⏎ 5	      location="top" ⏎ 6	      :color="toastAlert.color" ⏎ 7	      :timeout="toastAlert.timeout ?? 2000" ⏎ 8	    > ⏎ 9	      <v-icon ⏎ 10	        v-if="icon" ⏎ 11	        dark ⏎ 12	        start ⏎ 13	        :icon="icon" ⏎ 14	      /> ⏎ 15	 ⏎ 16	      {{ toastAlert.title }} ⏎ 17	      {{ toastAlert.text }} ⏎ 18	 ⏎ 19	      <templ … [1508 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-token-cookie.ts
```

> result: 1	import { getAppInfo } from "@/providers/app-info"; ⏎ 2	 ⏎ 3	/** ⏎ 4	 * Cookie options used to clear the session token. ⏎ 5	 * ⏎ 6	 * The server sets the cookie; the client only ever removes it, on logout or a dead session. A cookie ⏎ 7	 * is matched for removal by name and path, but these have to line up with what the server sent for ⏎ 8	 * the embedded (partitioned, SameSite=None) case to clear reliably. ⏎ 9	  … [4731 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-token-cookie.ts
```

> result: 1	/** ⏎ 2	 * Cookie options used to clear the session token. ⏎ 3	 * ⏎ 4	 * The server sets the cookie; the client only ever removes it, on logout or a dead session. A cookie ⏎ 5	 * is matched for removal by name and path, but these have to line up with what the server sent for ⏎ 6	 * the embedded (partitioned, SameSite=None) case to clear reliably. ⏎ 7	 */ ⏎ 8	export function getTokenCookieOptions() { ⏎ 9	  const … [4099 more chars]

`Glob`

```text
{"pattern": "frontend/app/{composables,lib,components/global,components/Layout,layouts,plugins,middleware}/**/*.test.ts"}
```

> result: frontend/app/components/global/DropZone.test.ts ⏎ frontend/app/composables/__tests__/use-auth-backend.test.ts ⏎ frontend/app/composables/__tests__/use-passwords.test.ts ⏎ frontend/app/composables/__tests__/use-query-filter-builder.test.ts ⏎ frontend/app/composables/__tests__/use-utils.test.ts ⏎ frontend/app/composables/__tests__/use-mealplan-rules.test.ts ⏎ frontend/app/composables/__tests__/use-toast.test.ts … [2523 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/__tests__/use-auth-backend.test.ts
```

> result: 1	import { describe, expect, test, vi, beforeEach, afterEach } from "vitest"; ⏎ 2	// Reused rather than reimplemented: the production reader escapes the full set of regex ⏎ 3	// metacharacters, and it has its own coverage in use-token-cookie.test.ts. ⏎ 4	import { readTokenCookie } from "../use-token-cookie"; ⏎ 5	 ⏎ 6	// Pulled in by use-auth-backend purely to wipe cached data on logout. They drag in most of … [8226 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/__tests__/use-auth-backend.test.ts
```

> result: 1	import { act, renderHook } from "@testing-library/react"; ⏎ 2	import { describe, expect, test, vi, beforeEach, afterEach } from "vitest"; ⏎ 3	// Reused rather than reimplemented: the production reader escapes the full set of regex ⏎ 4	// metacharacters, and it has its own coverage in use-token-cookie.test.ts. ⏎ 5	import { readTokenCookie } from "../use-token-cookie"; ⏎ 6	import type { AppInfo } from "@/li … [9316 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/layouts/default.vue
```

> result: 1	<template> ⏎ 2	  <DefaultLayout /> ⏎ 3	</template> ⏎ 4	 ⏎ 5	<script setup lang="ts"> ⏎ 6	import DefaultLayout from "@/components/Layout/DefaultLayout.vue"; ⏎ 7	import { useGlobalI18n } from "~/composables/use-global-i18n"; ⏎ 8	 ⏎ 9	useGlobalI18n(); // ensure i18n is initialized ⏎ 10	</script> ⏎ 11

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/layouts/DefaultLayout.tsx
```

> result: 1	// Layout "default" (Vue layouts/default.vue): the app shell from components/Layout/DefaultLayout. ⏎ 2	import { DefaultLayout as DefaultLayoutShell } from "@/components/Layout/DefaultLayout"; ⏎ 3	 ⏎ 4	export default function DefaultLayout() { ⏎ 5	  return <DefaultLayoutShell />; ⏎ 6	} ⏎ 7

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/Layout/DefaultLayout.vue
```

> result: 1	<template> ⏎ 2	  <v-app dark> ⏎ 3	    <TheSnackbar /> ⏎ 4	 ⏎ 5	    <AppHeader> ⏎ 6	      <v-btn ⏎ 7	        icon ⏎ 8	        @click.stop="sidebar = !sidebar" ⏎ 9	      > ⏎ 10	        <v-icon> {{ $globals.icons.menu }}</v-icon> ⏎ 11	      </v-btn> ⏎ 12	    </AppHeader> ⏎ 13	 ⏎ 14	    <AppSidebar ⏎ 15	      v-model="sidebar" ⏎ 16	      :top-link="topLinks" ⏎ 17	      :secondary-links="cookbookLinks || []" ⏎ 18	    > ⏎ 19	      <v-me … [8854 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/Layout/DefaultLayout.tsx
```

> result: 1	// The default layout: header, sidebar (recipes/planner/… links, the group's cookbooks, the "Create" menu) ⏎ 2	// and the page (`<Outlet />`). Used by layouts/DefaultLayout. ⏎ 3	import { useState, type ReactNode } from "react"; ⏎ 4	import Box from "@mui/material/Box"; ⏎ 5	import Button from "@mui/material/Button"; ⏎ 6	import Divider from "@mui/material/Divider"; ⏎ 7	import IconButton from "@mui/material/Ico … [10036 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/use-display.ts
```

> result: 1	import { useMediaQuery, useTheme } from "@mui/material"; ⏎ 2	 ⏎ 3	/** ⏎ 4	 * Port of Vuetify `useDisplay()` with the same names. Breakpoints are Vuetify's (0/600/960/1280/1920), ⏎ 5	 * configured in providers/theme.ts. ⏎ 6	 */ ⏎ 7	export function useDisplay() { ⏎ 8	  const theme = useTheme(); ⏎ 9	  const { values } = theme.breakpoints; ⏎ 10	  const width = (min: number) => `(min-width:${min}px)`; ⏎ 11	 ⏎ 12	  const s … [751 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-logged-in-state.ts
```

> result: 1	import { useParams } from "react-router"; ⏎ 2	import { useMealieAuth } from "@/hooks/use-mealie-auth"; ⏎ 3	 ⏎ 4	/** Port of composables/use-logged-in-state.ts. */ ⏎ 5	export function useLoggedInState() { ⏎ 6	  const auth = useMealieAuth(); ⏎ 7	  const { groupSlug } = useParams(); ⏎ 8	 ⏎ 9	  const loggedIn = auth.loggedIn; ⏎ 10	  const isOwnGroup = !groupSlug ? loggedIn : loggedIn && auth.user?.groupSlug === group … [55 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-logged-in-state.ts
```

> result: 1	export const useLoggedInState = function () { ⏎ 2	  const auth = useMealieAuth(); ⏎ 3	  const route = useRoute(); ⏎ 4	 ⏎ 5	  const loggedIn = computed(() => auth.loggedIn.value); ⏎ 6	  const isOwnGroup = computed(() => { ⏎ 7	    if (!route.params.groupSlug) { ⏎ 8	      return loggedIn.value; ⏎ 9	    } ⏎ 10	    else { ⏎ 11	      return loggedIn.value && auth.user.value?.groupSlug === route.params.groupSlug; ⏎ 12	    } … [60 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/store/use-cookbook-store.ts
```

> result: 1	import { useCallback } from "react"; ⏎ 2	import { useReadOnlyStore, useStore } from "../partials/use-store-factory"; ⏎ 3	import type { ReadCookBook, UpdateCookBook } from "@/lib/api/types/cookbook"; ⏎ 4	import { usePublicExploreApi, useUserApi } from "@/hooks/api"; ⏎ 5	import { createStore } from "@/lib/store"; ⏎ 6	 ⏎ 7	const cookbooks = createStore<ReadCookBook[]>([]); ⏎ 8	const loading = createStore(false); … [1156 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/store/use-cookbook-store.ts
```

> result: 1	import type { Composer } from "vue-i18n"; ⏎ 2	import { useReadOnlyStore, useStore } from "../partials/use-store-factory"; ⏎ 3	import type { ReadCookBook, UpdateCookBook } from "~/lib/api/types/cookbook"; ⏎ 4	import { usePublicExploreApi, useUserApi } from "~/composables/api"; ⏎ 5	 ⏎ 6	const cookbooks: Ref<ReadCookBook[]> = ref([]); ⏎ 7	const loading = ref(false); ⏎ 8	const initialized = ref(false); ⏎ 9	const pu … [1131 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/Layout/LayoutParts/AppSidebar.tsx
```

> result: 1	// Usage: <AppSidebar open={open} onOpenChange={setOpen} topLink={links} secondaryLinks={more}>{createMenu}</AppSidebar> ⏎ 2	// The navigation drawer: user card, `children`, primary and secondary links (groups expand), and at the ⏎ 3	// bottom announcements + the settings menu (language, dark mode, user/data/admin settings). ⏎ 4	// Temporary overlay below lg, persistent (pushes the content) from lg up … [12005 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/Layout/LayoutParts/AppSidebar.vue
```

> result: 1	<template> ⏎ 2	  <v-navigation-drawer v-model="modelValue" class="d-flex flex-column d-print-none position-fixed" touchless> ⏎ 3	    <AnnouncementDialog v-model="showAnnouncementsDialog" /> ⏎ 4	    <LanguageDialog v-model="state.languageDialog" /> ⏎ 5	    <!-- User Profile --> ⏎ 6	    <template v-if="loggedIn && sessionUser"> ⏎ 7	      <v-list-item lines="two" :to="userProfileLink" exact> ⏎ 8	        <div cla … [8863 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/Layout/LayoutParts/AppHeader.tsx
```

> result: 1	// Usage: <AppHeader>{menuToggleButton}</AppHeader> · <AppHeader menu={false} /> — the top app bar: logo + ⏎ 2	// "Mealie" (home of the current group), and with `menu` the login/logout button. ⏎ 3	// The recipe search: a read-only field (≥ sm) or an icon button (xs) and the "/" key open RecipeDialogSearch. ⏎ 4	import { useEffect, useRef, type ReactNode } from "react"; ⏎ 5	import AppBar from "@mui/materi … [6018 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/Layout/LayoutParts/AppHeader.vue
```

> result: 1	<template> ⏎ 2	  <v-app-bar ⏎ 3	    clipped-left ⏎ 4	    density="compact" ⏎ 5	    app ⏎ 6	    color="primary" ⏎ 7	    dark ⏎ 8	    class="d-print-none" ⏎ 9	  > ⏎ 10	    <slot /> ⏎ 11	    <RouterLink :to="routerLink"> ⏎ 12	      <v-btn ⏎ 13	        icon ⏎ 14	        color="white" ⏎ 15	      > ⏎ 16	        <v-icon size="40"> {{ $globals.icons.primary }} </v-icon> ⏎ 17	      </v-btn> ⏎ 18	    </RouterLink> ⏎ 19	 ⏎ 20	    <div ⏎ 21	      … [3167 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/layouts/AdminLayout.tsx
```

> result: 1	// Layout "admin" (Vue layouts/admin.vue): header + sidebar with the admin pages. ⏎ 2	import { useState } from "react"; ⏎ 3	import Box from "@mui/material/Box"; ⏎ 4	import IconButton from "@mui/material/IconButton"; ⏎ 5	import { Outlet } from "react-router"; ⏎ 6	import { AppHeader, APP_HEADER_HEIGHT } from "@/components/Layout/LayoutParts/AppHeader"; ⏎ 7	import { AppSidebar } from "@/components/Layout/Layou … [2717 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/layouts/admin.vue
```

> result: 1	<template> ⏎ 2	  <v-app dark> ⏎ 3	    <TheSnackbar /> ⏎ 4	 ⏎ 5	    <AppHeader> ⏎ 6	      <v-btn ⏎ 7	        icon ⏎ 8	        @click.stop="sidebar = !sidebar" ⏎ 9	      > ⏎ 10	        <v-icon> {{ $globals.icons.menu }}</v-icon> ⏎ 11	      </v-btn> ⏎ 12	    </AppHeader> ⏎ 13	 ⏎ 14	    <AppSidebar ⏎ 15	      v-model="sidebar" ⏎ 16	      :top-link="topLinks" ⏎ 17	      :user="{ data: true }" ⏎ 18	      :secondary-header="$t('sidebar … [2567 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/layouts/BasicLayout.tsx
```

> result: 1	// Layout "basic" (Vue layouts/basic.vue): header without menu, no sidebar. ⏎ 2	import Box from "@mui/material/Box"; ⏎ 3	import { Outlet } from "react-router"; ⏎ 4	import { AppHeader, APP_HEADER_HEIGHT } from "@/components/Layout/LayoutParts/AppHeader"; ⏎ 5	import { TheSnackbar } from "@/components/Layout/LayoutParts/TheSnackbar"; ⏎ 6	 ⏎ 7	export default function BasicLayout() { ⏎ 8	  return ( ⏎ 9	    <Box sx={ … [227 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/layouts/basic.vue
```

> result: 1	<template> ⏎ 2	  <v-app dark> ⏎ 3	    <TheSnackbar /> ⏎ 4	 ⏎ 5	    <AppHeader :menu="false" /> ⏎ 6	    <v-main> ⏎ 7	      <v-scroll-x-transition> ⏎ 8	        <div> ⏎ 9	          <NuxtPage /> ⏎ 10	        </div> ⏎ 11	      </v-scroll-x-transition> ⏎ 12	    </v-main> ⏎ 13	  </v-app> ⏎ 14	</template> ⏎ 15	 ⏎ 16	<script setup lang="ts"> ⏎ 17	import TheSnackbar from "~/components/Layout/LayoutParts/TheSnackbar.vue"; ⏎ 18	import AppHe … [194 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/layouts/ErrorPage.tsx
```

> result: 1	// Port of layouts/error.vue (Nuxt's error page): the 404 page for unknown URLs (catch-all route) and the ⏎ 2	// error element of the root route. A 404 first tries the legacy URL rewrites Vue did: /group/{mealplan, ⏎ 3	// members,notifiers,webhooks}… → /household/…, /recipe/ → /r/, and the current group slug prefix. ⏎ 4	import { useEffect } from "react"; ⏎ 5	import Box from "@mui/material/Box"; ⏎ 6	import … [3947 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/layouts/error.vue
```

> result: 1	<template> ⏎ 2	  <v-app ⏎ 3	    v-if="ready" ⏎ 4	    dark ⏎ 5	  > ⏎ 6	    <v-card-title> ⏎ 7	      <slot> ⏎ 8	        <h1 class="mx-auto"> ⏎ 9	          {{ $t("page.404-page-not-found") }} ⏎ 10	        </h1> ⏎ 11	      </slot> ⏎ 12	    </v-card-title> ⏎ 13	    <div class="d-flex justify-space-around"> ⏎ 14	      <div class="d-flex align-center"> ⏎ 15	        <p class="primary--text"> ⏎ 16	          4 ⏎ 17	        </p> ⏎ 18	      … [3105 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/layouts/BlankLayout.tsx
```

> result: 1	// Layout "blank" (Vue layouts/blank.vue): no header or sidebar; the demo banner when the server runs as a demo. ⏎ 2	import Alert from "@mui/material/Alert"; ⏎ 3	import Box from "@mui/material/Box"; ⏎ 4	import { Outlet } from "react-router"; ⏎ 5	import { TheSnackbar } from "@/components/Layout/LayoutParts/TheSnackbar"; ⏎ 6	import { useI18n } from "@/i18n"; ⏎ 7	import { useAppInfo } from "@/providers/app-inf … [747 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/layouts/blank.vue
```

> result: 1	<template> ⏎ 2	  <v-app dark> ⏎ 3	    <TheSnackbar /> ⏎ 4	 ⏎ 5	    <v-banner ⏎ 6	      v-if="$appInfo.demoStatus" ⏎ 7	      sticky ⏎ 8	    > ⏎ 9	      <div class="text-center"> ⏎ 10	        <b> {{ $t("demo.info_message_with_version", { version: $appInfo.version }) }} </b> ⏎ 11	      </div> ⏎ 12	    </v-banner> ⏎ 13	 ⏎ 14	    <v-main> ⏎ 15	      <v-scroll-x-transition> ⏎ 16	        <div> ⏎ 17	          <NuxtPage /> ⏎ 18	        < … [211 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/Layout/LayoutParts/AppScrollToTop.tsx
```

> result: 1	// Usage: <AppScrollToTop /> — a floating button that appears after scrolling 400 px and scrolls back up. ⏎ 2	import { useEffect, useState } from "react"; ⏎ 3	import Fab from "@mui/material/Fab"; ⏎ 4	import Fade from "@mui/material/Fade"; ⏎ 5	import { MdiIcon } from "@/components/global/MdiIcon"; ⏎ 6	import { icons } from "@/lib/icons"; ⏎ 7	 ⏎ 8	const threshold = 400; ⏎ 9	 ⏎ 10	export function AppScrollToTop() { ⏎  … [765 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/Layout/LayoutParts/AppScrollToTop.vue
```

> result: 1	<template> ⏎ 2	  <v-fade-transition> ⏎ 3	    <v-btn ⏎ 4	      v-if="showButton" ⏎ 5	      icon ⏎ 6	      position="fixed" ⏎ 7	      location="bottom right" ⏎ 8	      class="ma-4" ⏎ 9	      color="primary" ⏎ 10	      elevation="4" ⏎ 11	      style="z-index: 999;" ⏎ 12	      @click="scrollToTop" ⏎ 13	    > ⏎ 14	      <v-icon>{{ $globals.icons.arrowUp }}</v-icon> ⏎ 15	    </v-btn> ⏎ 16	  </v-fade-transition> ⏎ 17	</template> ⏎ 18	 ⏎  … [469 more chars]

`Glob`

```text
{"pattern": "src/components/global/**", "path": "/home/deeumiya/mealie-wf2/frontend-react"}
```

> result: frontend-react/src/components/global/colors.ts ⏎ frontend-react/src/components/global/BaseButton.tsx ⏎ frontend-react/src/components/global/MdiIcon.tsx ⏎ frontend-react/src/components/global/BaseButtonGroup.tsx ⏎ frontend-react/src/components/global/BaseMenu.tsx ⏎ frontend-react/src/components/global/BaseDialogContent.tsx ⏎ frontend-react/src/components/global/BaseDialog.tsx ⏎ frontend-react/src/components/glob … [2482 more chars]

`Grep`

```text
{"pattern": "dangerouslySetInnerHTML", "path": "/home/deeumiya/mealie-wf2/frontend-react/src", "output_mode": "content"}
```

> result: frontend-react/src/components/Domain/Recipe/RecipePrintView.tsx:226:                  <span dangerouslySetInnerHTML={{ __html: recipeYield }} /> ⏎ frontend-react/src/components/Domain/Recipe/RecipePrintView.tsx:274:                  <p className="ingredient-body" dangerouslySetInnerHTML={{ __html: parseText(ingredient) }} /> ⏎ frontend-react/src/components/Domain/Recipe/RecipePrintView.tsx:331:        … [628 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/SafeMarkdown.tsx
```

> result: 1	// Usage: <SafeMarkdown source={recipe.description} /> ⏎ 2	// Renders markdown (marked, `breaks: true`) as HTML sanitised by DOMPurify (lib/sanitize/markdown), with ⏎ 3	// iframes allowed only for the server's `allowedIframeHosts`. The only place markdown becomes HTML. ⏎ 4	import { useMemo } from "react"; ⏎ 5	import Box from "@mui/material/Box"; ⏎ 6	import { marked } from "marked"; ⏎ 7	import { sanitizeMark … [1006 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/SafeMarkdown.vue
```

> result: 1	<template> ⏎ 2	  <!-- eslint-disable-next-line vue/no-v-html is safe here because all HTML is sanitized with DOMPurify in setup() --> ⏎ 3	  <div v-html="value" /> ⏎ 4	</template> ⏎ 5	 ⏎ 6	<script setup lang="ts"> ⏎ 7	import { marked } from "marked"; ⏎ 8	import { sanitizeMarkdownHtml } from "~/lib/sanitize/markdown"; ⏎ 9	 ⏎ 10	const props = defineProps({ ⏎ 11	  source: { ⏎ 12	    type: String, ⏎ 13	    default: "", ⏎ 14	  … [621 more chars]

`Glob`

```text
{"pattern": "src/lib/!(api)/**", "path": "/home/deeumiya/mealie-wf2/frontend-react"}
```

> result: No files found

`Glob`

```text
{"pattern": "frontend/app/lib/!(api)/**"}
```

> result: No files found

`Glob`

```text
{"pattern": "src/lib/{sanitize,validators,recipe,icons}/**", "path": "/home/deeumiya/mealie-wf2/frontend-react"}
```

> result: frontend-react/src/lib/validators/index.ts ⏎ frontend-react/src/lib/validators/password.ts ⏎ frontend-react/src/lib/validators/password.test.ts ⏎ frontend-react/src/lib/validators/redirect.ts ⏎ frontend-react/src/lib/validators/redirect.test.ts ⏎ frontend-react/src/lib/sanitize/markdown.test.ts ⏎ frontend-react/src/lib/sanitize/text.ts ⏎ frontend-react/src/lib/sanitize/text.test.ts ⏎ frontend-react/src/lib/recipe … [431 more chars]

`Glob`

```text
{"pattern": "frontend/app/lib/{sanitize,validators,recipe,icons}/**"}
```

> result: frontend/app/lib/icons/icon-type.ts ⏎ frontend/app/lib/icons/index.ts ⏎ frontend/app/lib/icons/icons.ts ⏎ frontend/app/lib/recipe/recipe-finder.test.ts ⏎ frontend/app/lib/recipe/recipe-finder.ts ⏎ frontend/app/lib/recipe/recipe-visibility.ts ⏎ frontend/app/lib/recipe/recipe-visibility.test.ts ⏎ frontend/app/lib/sanitize/markdown.test.ts ⏎ frontend/app/lib/validators/index.ts ⏎ frontend/app/lib/sanitize/markdown.ts ⏎  … [323 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/lib/sanitize/markdown.ts
```

> result: 1	import DOMPurify from "dompurify"; ⏎ 2	 ⏎ 3	enum DOMPurifyHook { ⏎ 4	  UponSanitizeAttribute = "uponSanitizeAttribute", ⏎ 5	  AfterSanitizeAttributes = "afterSanitizeAttributes", ⏎ 6	} ⏎ 7	 ⏎ 8	const ALLOWED_STYLE_PROPERTIES = [ ⏎ 9	  "background-color", "color", "font-style", "font-weight", "text-decoration", "text-align", ⏎ 10	]; ⏎ 11	 ⏎ 12	const BASE_ALLOWED_TAGS = [ ⏎ 13	  "strong", "em", "b", "i", "u", "p", "code" … [3428 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/lib/sanitize/markdown.ts
```

> result: 1	import DOMPurify from "isomorphic-dompurify"; ⏎ 2	 ⏎ 3	enum DOMPurifyHook { ⏎ 4	  UponSanitizeAttribute = "uponSanitizeAttribute", ⏎ 5	  AfterSanitizeAttributes = "afterSanitizeAttributes", ⏎ 6	} ⏎ 7	 ⏎ 8	const ALLOWED_STYLE_PROPERTIES = [ ⏎ 9	  "background-color", "color", "font-style", "font-weight", "text-decoration", "text-align", ⏎ 10	]; ⏎ 11	 ⏎ 12	const BASE_ALLOWED_TAGS = [ ⏎ 13	  "strong", "em", "b", "i", "u",  … [3407 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/lib/validators/redirect.ts
```

> result: 1	// rejects protocol-relative payloads (`//evil.com`, `/\evil.com`) that a bare startsWith("/") check would miss ⏎ 2	export function isSafeRedirectTarget(target: string | null | undefined): target is string { ⏎ 3	  return !!target && target.startsWith("/") && !/^[/\\]{2}/.test(target); ⏎ 4	} ⏎ 5

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/lib/validators/redirect.ts
```

> result: 1	// rejects protocol-relative payloads (`//evil.com`, `/\evil.com`) that a bare startsWith("/") check would miss ⏎ 2	export function isSafeRedirectTarget(target: string | null | undefined): target is string { ⏎ 3	  return !!target && target.startsWith("/") && !/^[/\\]{2}/.test(target); ⏎ 4	} ⏎ 5

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/lib/validators/inputs.ts
```

> result: 1	import { getGlobalI18n } from "@/i18n"; ⏎ 2	 ⏎ 3	const EMAIL_REGEX ⏎ 4	  = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(([[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; ⏎ 5	 ⏎ 6	export function required(v: string | undefined | null) { ⏎ 7	  const i18n = getGlobalI18n(); ⏎ 8	  return !!v || i18n.t("validators.required"); ⏎ 9	} ⏎ 10	 ⏎ 11	export function email( … [1259 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/lib/validators/inputs.ts
```

> result: 1	import { useGlobalI18n } from "~/composables/use-global-i18n"; ⏎ 2	 ⏎ 3	const EMAIL_REGEX ⏎ 4	  = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(([[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; ⏎ 5	 ⏎ 6	export function required(v: string | undefined | null) { ⏎ 7	  const i18n = useGlobalI18n(); ⏎ 8	  return !!v || i18n.t("validators.required"); ⏎ 9	} ⏎ 10	 ⏎ 11 … [1282 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/BaseDialog.tsx
```

> result: 1	// Usage: ⏎ 2	//   const [open, setOpen] = useState(false); ⏎ 3	//   <BaseDialog open={open} onOpenChange={setOpen} title={t("general.create")} icon={icons.tags} ⏎ 4	//     canSubmit onSubmit={create} loading={saving}> ⏎ 5	//     <CardContent>…form…</CardContent> ⏎ 6	//   </BaseDialog> ⏎ 7	// `v-model` → `open` + `onOpenChange`. Submitting closes the dialog once `loading` is false (unless ⏎ 8	// `keepOpen`);  … [5983 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/BaseDialog.vue
```

> result: 1	<template> ⏎ 2	  <div> ⏎ 3	    <slot ⏎ 4	      name="activator" ⏎ 5	      v-bind="{ open }" ⏎ 6	    /> ⏎ 7	    <v-bottom-sheet ⏎ 8	      v-if="bottomSheet && $vuetify.display.xs" ⏎ 9	      v-model="dialog" ⏎ 10	      content-class="rounded-t-xl" ⏎ 11	      :content-props="{ ⏎ 12	        style: 'overflow: hidden', ⏎ 13	      }" ⏎ 14	      :max-width="maxWidth ?? undefined" ⏎ 15	      @keydown.enter="submitOnEnter" ⏎ 16	       … [4670 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/BaseDialogContent.tsx
```

> result: 1	// Usage: rendered by BaseDialog (props pass through); use directly only for a dialog-styled card. ⏎ 2	// Coloured toolbar (icon + title), scrollable body, and the default actions: cancel, `customCardAction`, ⏎ 3	// delete (`canDelete`), confirm (`canConfirm`), submit (`canSubmit`). `cardActions` replaces them all. ⏎ 4	import type { ReactNode } from "react"; ⏎ 5	import Box from "@mui/material/Box"; ⏎ 6	im … [3762 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/BaseDialogContent.vue
```

> result: 1	<template> ⏎ 2	  <v-card height="100%" :loading="loading"> ⏎ 3	    <template #loader="{ isActive }"> ⏎ 4	      <v-progress-linear ⏎ 5	        :active="isActive" ⏎ 6	        indeterminate ⏎ 7	      /> ⏎ 8	    </template> ⏎ 9	    <v-toolbar ⏎ 10	      dark ⏎ 11	      density="comfortable" ⏎ 12	      :color="color" ⏎ 13	      class="px-3 position-relative top-0 left-0 w-100" ⏎ 14	    > ⏎ 15	      <v-icon size="large"> ⏎ 16	     … [3296 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/BaseDataTable.tsx
```

> result: 1	// Usage: ⏎ 2	//   const headers: DataTableHeader<User>[] = [ ⏎ 3	//     { title: t("user.username"), key: "username" }, ⏎ 4	//     { title: t("user.admin"), key: "admin", align: "center" }, ⏎ 5	//     { title: "", key: "actions", sortable: false, align: "end" }, ⏎ 6	//   ]; ⏎ 7	//   <BaseDataTable headers={headers} items={users} itemKey="id" search={search} itemsPerPage={15} ⏎ 8	//     slots={{ admin: user = … [9961 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/CrudTable.tsx
```

> result: 1	// Usage: <CrudTable headers={headers} data={items} bulkActions={actions} tableConfig={{ hideColumns: true, canExport: true }} ⏎ 2	//          slots={{ name: item => <b>{item.name}</b> }} buttonRow={<BaseButton … />} onEditOne={…} onDeleteOne={…} ⏎ 3	//          onBulkAction={(event, items) => …} /> ⏎ 4	// Searchable table with a column-visibility menu, bulk actions on the selection, edit/delete butto … [7089 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/CrudTable.vue
```

> result: 1	<template> ⏎ 2	  <div> ⏎ 3	    <v-card-actions class="flex-wrap"> ⏎ 4	      <v-menu ⏎ 5	        v-if="tableConfig.hideColumns" ⏎ 6	        offset-y ⏎ 7	        bottom ⏎ 8	        nudge-bottom="6" ⏎ 9	        :close-on-content-click="false" ⏎ 10	      > ⏎ 11	        <template #activator="{ props: activatorProps }"> ⏎ 12	          <v-btn ⏎ 13	            color="accent" ⏎ 14	            variant="elevated" ⏎ 15	            v-b … [5950 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/BaseButton.tsx
```

> result: 1	// Usage: <BaseButton save onClick={…} /> · <BaseButton delete /> · <BaseButton secondary icon={icons.edit} text={t("…")} /> ⏎ 2	// · <BaseButton to="/path">label</BaseButton> · <BaseButton download downloadUrl={url} />. ⏎ 3	// The first preset flag (delete, update, edit, cancel, save, download; else create) sets text, icon and colour; ⏎ 4	// `secondary` = outlined, `minor`/`cancel` = text, else conta … [3736 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/BaseButton.vue
```

> result: 1	<template> ⏎ 2	  <v-btn ⏎ 3	    :color="color || btnAttrs.color" ⏎ 4	    :size="small ? 'small' : 'default'" ⏎ 5	    :x-small="xSmall" ⏎ 6	    :loading="loading" ⏎ 7	    :disabled="disabled" ⏎ 8	    :variant="disabled ? 'tonal' : btnStyle.outlined ? 'outlined' : btnStyle.text ? 'text' : 'elevated'" ⏎ 9	    :to="to" ⏎ 10	    v-bind="$attrs" ⏎ 11	    @click="download ? downloadFile() : undefined" ⏎ 12	  > ⏎ 13	    <v-ico … [3907 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/LanguageDialog.tsx
```

> result: 1	// Usage: <LanguageDialog open={open} onOpenChange={setOpen} /> — pick the UI language; closes once it changed. ⏎ 2	import { useState } from "react"; ⏎ 3	import Autocomplete from "@mui/material/Autocomplete"; ⏎ 4	import Box from "@mui/material/Box"; ⏎ 5	import CardContent from "@mui/material/CardContent"; ⏎ 6	import Link from "@mui/material/Link"; ⏎ 7	import TextField from "@mui/material/TextField"; ⏎ 8	impor … [3186 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/LanguageDialog.vue
```

> result: 1	<template> ⏎ 2	  <BaseDialog ⏎ 3	    v-model="modelValue" ⏎ 4	    bottom-sheet ⏎ 5	    :icon="$globals.icons.translate" ⏎ 6	    :title="$t('language-dialog.choose-language')" ⏎ 7	  > ⏎ 8	    <v-card-text> ⏎ 9	      {{ $t("language-dialog.select-description") }} ⏎ 10	      <v-autocomplete ⏎ 11	        v-model="selectedLocale" ⏎ 12	        :items="locales" ⏎ 13	        :custom-filter="normalizeFilter" ⏎ 14	        item-tit … [1821 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-locales/use-locales.ts
```

> result: 1	import { useI18n } from "@/i18n"; ⏎ 2	import { LOCALES } from "./available-locales"; ⏎ 3	 ⏎ 4	/** ⏎ 5	 * Port of composables/use-locales/use-locales.ts. Vue's writable `locale` computed becomes ⏎ 6	 * `locale` + `setLocale(code)`; MUI needs no separate locale sync (Vue synced Vuetify's locale here). ⏎ 7	 */ ⏎ 8	export const useLocales = () => { ⏎ 9	  const i18n = useI18n(); ⏎ 10	 ⏎ 11	  return { ⏎ 12	    locale: i18n … [97 more chars]

`Glob`

```text
{"pattern": "frontend/app/composables/use-locales/*"}
```

> result: frontend/app/composables/use-locales/available-locales.ts ⏎ frontend/app/composables/use-locales/index.ts ⏎ frontend/app/composables/use-locales/use-locales.ts

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-locales/use-locales.ts
```

> result: 1	import type { LocaleObject } from "@nuxtjs/i18n"; ⏎ 2	import { LOCALES } from "./available-locales"; ⏎ 3	import { useGlobalI18n } from "../use-global-i18n"; ⏎ 4	 ⏎ 5	export const useLocales = () => { ⏎ 6	  const i18n = useGlobalI18n(); ⏎ 7	  const { current: vuetifyLocale } = useLocale(); ⏎ 8	 ⏎ 9	  const locale = computed<LocaleObject["code"]>({ ⏎ 10	    get: () => i18n.locale.value, ⏎ 11	    set(value) { ⏎ 12	      … [440 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-locales/__tests__/use-locales.test.ts
```

> result: 1	import { act, renderHook } from "@testing-library/react"; ⏎ 2	import { describe, expect, test } from "vitest"; ⏎ 3	import { useLocales } from "@/hooks/use-locales"; ⏎ 4	 ⏎ 5	describe("useLocales", () => { ⏎ 6	  test("exposes the 42 locales and the current locale", () => { ⏎ 7	    const { result } = renderHook(() => useLocales()); ⏎ 8	    expect(result.current.locales).toHaveLength(42); ⏎ 9	    expect(result.cur … [602 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/use-debounce.ts
```

> result: 1	import { useCallback, useEffect, useRef, useState } from "react"; ⏎ 2	 ⏎ 3	/** Port of VueUse `refDebounced` / `watchDebounced` source: the value, settled for `delay` ms. */ ⏎ 4	export function useDebouncedValue<T>(value: T, delay: number): T { ⏎ 5	  const [debounced, setDebounced] = useState(value); ⏎ 6	  useEffect(() => { ⏎ 7	    const timer = setTimeout(() => setDebounced(value), delay); ⏎ 8	    return ()  … [2112 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/index.ts
```

> result: 1	export { useAsyncData, clearAsyncDataCache, type AsyncData } from "./use-async-data"; ⏎ 2	export { useLocalStorage, useSessionStorage, getStorageStore, resetStorageStores } from "./use-storage"; ⏎ 3	export { useDisplay } from "./use-display"; ⏎ 4	export { usePageTitle } from "./use-page-title"; ⏎ 5	export { useDebouncedValue, useDebouncedCallback, useThrottledCallback } from "./use-debounce"; ⏎ 6	export { … [345 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/use-page-title.ts
```

> result: 1	import { useEffect } from "react"; ⏎ 2	 ⏎ 3	const DEFAULT_TITLE = "Mealie"; ⏎ 4	 ⏎ 5	/** ⏎ 6	 * Port of `useSeoMeta({ title })` / `useHead({ title })`: sets `document.title` while mounted. ⏎ 7	 * The Vue app has no title template, so the title is used as is; without one it falls back to the ⏎ 8	 * `nuxt.config` head title "Mealie". ⏎ 9	 */ ⏎ 10	export function usePageTitle(title: string | null | undefined) { ⏎ 11	  … [200 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/use-wake-lock.ts
```

> result: 1	import { useCallback, useEffect, useRef, useState } from "react"; ⏎ 2	 ⏎ 3	/** Port of VueUse `useWakeLock`: `isSupported`, `isActive`, `request("screen")`, `release()`. */ ⏎ 4	export function useWakeLock() { ⏎ 5	  const isSupported = typeof navigator !== "undefined" && "wakeLock" in navigator; ⏎ 6	  const sentinel = useRef<WakeLockSentinel | null>(null); ⏎ 7	  const [isActive, setIsActive] = useState(false … [840 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/use-online.ts
```

> result: 1	import { useEffect, useState, useSyncExternalStore } from "react"; ⏎ 2	 ⏎ 3	function subscribeOnline(listener: () => void) { ⏎ 4	  window.addEventListener("online", listener); ⏎ 5	  window.addEventListener("offline", listener); ⏎ 6	  return () => { ⏎ 7	    window.removeEventListener("online", listener); ⏎ 8	    window.removeEventListener("offline", listener); ⏎ 9	  }; ⏎ 10	} ⏎ 11	 ⏎ 12	/** Port of VueUse `useOnline`. … [1824 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/use-clipboard.ts
```

> result: 1	import { useCallback, useEffect, useRef, useState } from "react"; ⏎ 2	 ⏎ 3	function legacyCopy(text: string) { ⏎ 4	  const area = document.createElement("textarea"); ⏎ 5	  area.value = text; ⏎ 6	  area.style.position = "absolute"; ⏎ 7	  area.style.opacity = "0"; ⏎ 8	  document.body.appendChild(area); ⏎ 9	  area.select(); ⏎ 10	  document.execCommand("copy"); ⏎ 11	  area.remove(); ⏎ 12	} ⏎ 13	 ⏎ 14	/** ⏎ 15	 * Port of VueUse … [1040 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/WakelockSwitch.vue
```

> result: 1	<template> ⏎ 2	  <div ⏎ 3	    v-if="wakeIsSupported" ⏎ 4	    class="d-print-none d-flex px-2" ⏎ 5	    :class="$vuetify.display.smAndDown ? 'justify-center' : 'justify-end'" ⏎ 6	  > ⏎ 7	    <v-switch ⏎ 8	      v-model="wakeLock" ⏎ 9	      color="primary" ⏎ 10	      :label="$t('recipe.screen-awake')" ⏎ 11	    /> ⏎ 12	  </div> ⏎ 13	</template> ⏎ 14	 ⏎ 15	<script setup lang="ts"> ⏎ 16	import { useWakeLock } from "@vueuse/core"; ⏎  … [1052 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/WakelockSwitch.tsx
```

> result: 1	// Usage: <WakelockSwitch /> — "Screen awake" switch (hidden when the browser has no Wake Lock API) that keeps the ⏎ 2	// screen on while the page is open; the choice is stored in the `user-experience-preferences` local storage entry. ⏎ 3	import { useEffect } from "react"; ⏎ 4	import Box from "@mui/material/Box"; ⏎ 5	import FormControlLabel from "@mui/material/FormControlLabel"; ⏎ 6	import Switch from "@m … [1988 more chars]

`Grep`

```text
{"pattern": "\"@vueuse/core\"", "path": "/home/deeumiya/mealie-wf2/frontend/package.json", "output_mode": "content"}
```

> result: 27:    "@vueuse/core": "^12.7.0",

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-navigation-warning.ts
```

> result: 1	export function useNavigationWarning() { ⏎ 2	  return { activateNavigationWarning, deactivateNavigationWarning }; ⏎ 3	} ⏎ 4	 ⏎ 5	/** ⏎ 6	 * Displays a warning before the user navigates to another page ⏎ 7	 * e.g., by clicking a link (which isn't internal and rendered without page load), ⏎ 8	 * reloading the page, ⏎ 9	 * or closing the tab. ⏎ 10	 */ ⏎ 11	const activateNavigationWarning = () => { ⏎ 12	  window.onbefore … [188 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-navigation-warning.ts
```

> result: 1	export function useNavigationWarning() { ⏎ 2	  return { activateNavigationWarning, deactivateNavigationWarning }; ⏎ 3	} ⏎ 4	 ⏎ 5	/** ⏎ 6	 * Displays a warning before the user navigates to another page ⏎ 7	 * e.g., by clicking a link (which isn't internal and rendered without page load), ⏎ 8	 * reloading the page, ⏎ 9	 * or closing the tab. ⏎ 10	 */ ⏎ 11	const activateNavigationWarning = () => { ⏎ 12	  window.onbefore … [188 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-router.ts
```

> result: 1	import { useCallback } from "react"; ⏎ 2	import { useSearchParams } from "react-router"; ⏎ 3	 ⏎ 4	/** Port of `useRouterQuery(query)`: the query value as a string ("" when absent) and a setter. */ ⏎ 5	export function useRouterQuery(query: string) { ⏎ 6	  const [value, setValue] = useRouteQuery(query, ""); ⏎ 7	  return [value ?? "", setValue] as const; ⏎ 8	} ⏎ 9	 ⏎ 10	/** ⏎ 11	 * Port of `useRouteQuery(name, default … [985 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-router.ts
```

> result: 1	export function useRouterQuery(query: string) { ⏎ 2	  const router = useRoute(); ⏎ 3	  // TODO FUTURE: Remove when migrating to Vue 3 ⏎ 4	 ⏎ 5	  const param: WritableComputedRef<string> = computed({ ⏎ 6	    get(): string { ⏎ 7	      console.log("Get Query Change"); ⏎ 8	      return router?.query[query] as string || ""; ⏎ 9	    }, ⏎ 10	    set(v: string): void { ⏎ 11	      router.query[query] = v; ⏎ 12	    }, ⏎ 13	  }); … [519 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-groups.ts
```

> result: 1	import { useCallback, useEffect, useState } from "react"; ⏎ 2	import { useUserApi } from "@/hooks/api"; ⏎ 3	import { userApi } from "@/hooks/api/api-client"; ⏎ 4	import { authStore } from "@/hooks/use-auth-backend"; ⏎ 5	import { registerCacheReset } from "@/hooks/use-clear-composable-caches"; ⏎ 6	import type { AIProviderSettingsUpdate, UpdateGroupPreferences } from "@/lib/api/types/group"; ⏎ 7	import type { … [4351 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-groups.ts
```

> result: 1	import { useUserApi } from "~/composables/api"; ⏎ 2	import type { GroupBase, GroupInDB, GroupSummary } from "~/lib/api/types/user"; ⏎ 3	 ⏎ 4	const groupSelfRef = ref<GroupSummary | null>(null); ⏎ 5	const loading = ref(false); ⏎ 6	 ⏎ 7	export function resetGroupSelf() { ⏎ 8	  groupSelfRef.value = null; ⏎ 9	  loading.value = false; ⏎ 10	} ⏎ 11	 ⏎ 12	export const useGroupSelf = function () { ⏎ 13	  const api = useUserApi( … [2860 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-clear-composable-caches.ts
```

> result: 1	import { resetGroupRecipeActions } from "~/composables/use-group-recipe-actions"; ⏎ 2	import { resetGroupSelf } from "~/composables/use-groups"; ⏎ 3	import { resetHouseholdSelf } from "~/composables/use-households"; ⏎ 4	import { resetUserSelfRatings } from "~/composables/use-users/user-ratings"; ⏎ 5	import { resetBackups } from "~/composables/use-backups"; ⏎ 6	import { resetRecipes } from "~/composables/r … [356 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-clear-composable-caches.ts
```

> result: 1	/** ⏎ 2	 * Port of composables/use-clear-composable-caches.ts. In Vue this imported every composable that ⏎ 3	 * keeps module-level state and called its reset; here each such module registers its reset when it ⏎ 4	 * is first imported (a module that was never imported holds no state), which keeps this file free ⏎ 5	 * of a dependency on every feature module. ⏎ 6	 * ⏎ 7	 *   registerCacheReset(resetGroupSelf … [282 more chars]

`Grep`

```text
{"pattern": "registerCacheReset\\(", "path": "/home/deeumiya/mealie-wf2/frontend-react/src", "output_mode": "content"}
```

> result: frontend-react/src/hooks/use-clear-composable-caches.ts:7: *   registerCacheReset(resetGroupSelf);     // at module scope in hooks/use-groups.ts ⏎ frontend-react/src/hooks/use-clear-composable-caches.ts:11:export function registerCacheReset(reset: () => void) { ⏎ frontend-react/src/hooks/use-backups.ts:24:registerCacheReset(resetBackups); ⏎ frontend-react/src/hooks/recipes/use-recipes.ts:19:registerCach … [587 more chars]

`Grep`

```text
{"pattern": "createStore[<(]", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/hooks", "output_mode": "content"}
```

> result: frontend-react/src/hooks/use-mealplan-rules.ts:49:const rulesStore = createStore<PlanRulesOut[]>([]); ⏎ frontend-react/src/hooks/use-mealplan-rules.ts:50:const loadingStore = createStore(false); ⏎ frontend-react/src/hooks/use-mealplan-rules.ts:51:const initializedStore = createStore(false); ⏎ frontend-react/src/hooks/recipes/use-parse-ingredients-dialog.ts:570:  const [dialog] = useState(() => createPar … [6720 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-recipe-explorer-search.ts
```

> result: 1	// Port of composables/use-recipe-explorer-search.ts. ⏎ 2	//   const explorer = useRecipeExplorerSearch(groupSlug);   // state, selections, passedQueryWithSeed, actions ⏎ 3	//   useRecipeExplorerSearchEffects(groupSlug);             // once per explorer: auto-search + reset on bare URL ⏎ 4	// Like in Vue the search state is one shared instance per group slug (memoised at module level), used by the sea … [23422 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-recipe-explorer-search.ts
```

> result: 1	import { watchDebounced } from "@vueuse/shared"; ⏎ 2	import type { IngredientFood, RecipeCategory, RecipeTag, RecipeTool } from "~/lib/api/types/recipe"; ⏎ 3	import type { NoUndefinedField } from "~/lib/api/types/non-generated"; ⏎ 4	import type { HouseholdSummary } from "~/lib/api/types/household"; ⏎ 5	import type { RecipeSearchQuery } from "~/lib/api/user/recipes/recipe"; ⏎ 6	import { ⏎ 7	  useCategoryStor … [16345 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-users/preferences.ts
```

> result: 1	import { ActivityKey } from "@/lib/api/types/activity"; ⏎ 2	import type { RegisteredParser, TimelineEventType } from "@/lib/api/types/recipe"; ⏎ 3	import type { QueryFilterJSON } from "@/lib/api/types/non-generated"; ⏎ 4	import { useLocalStorage, useSessionStorage } from "@/hooks/utils"; ⏎ 5	import { icons } from "@/lib/icons"; ⏎ 6	 ⏎ 7	// Port of composables/use-users/preferences.ts: same storage keys and  … [6218 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-users/preferences.ts
```

> result: 1	import { useLocalStorage, useSessionStorage } from "@vueuse/core"; ⏎ 2	import { ActivityKey } from "~/lib/api/types/activity"; ⏎ 3	import type { RegisteredParser, TimelineEventType } from "~/lib/api/types/recipe"; ⏎ 4	import type { QueryFilterJSON } from "~/lib/api/types/non-generated"; ⏎ 5	 ⏎ 6	export interface UserPrintPreferences { ⏎ 7	  imagePosition: string; ⏎ 8	  showDescription: boolean; ⏎ 9	  showLinked … [6629 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-utils.ts
```

> result: 1	import { useColorMode } from "@/providers/color-mode"; ⏎ 2	 ⏎ 3	/** Same signature as Vuetify's FilterFunction, used by the deprecated normalizeFilter. */ ⏎ 4	export type FilterFunction = (value: string, query: string) => boolean; ⏎ 5	 ⏎ 6	export const useToggleDarkMode = () => { ⏎ 7	  const { toggle } = useColorMode(); ⏎ 8	  return toggle; ⏎ 9	}; ⏎ 10	 ⏎ 11	export const useAsyncKey = function () { ⏎ 12	  return `${D … [3620 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-utils.ts
```

> result: 1	import { useDark, useToggle } from "@vueuse/core"; ⏎ 2	import type { FilterFunction } from "vuetify"; ⏎ 3	 ⏎ 4	export const useToggleDarkMode = () => { ⏎ 5	  const isDark = useDark(); ⏎ 6	  const toggleDark = useToggle(isDark); ⏎ 7	 ⏎ 8	  return () => toggleDark(); ⏎ 9	}; ⏎ 10	 ⏎ 11	export const useAsyncKey = function () { ⏎ 12	  return `${Date.now()}-${Math.random().toString(36).slice(2)}`; ⏎ 13	}; ⏎ 14	 ⏎ 15	export const … [3483 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/api/use-downloader.ts
```

> result: 1	import { useCallback } from "react"; ⏎ 2	import { alert } from "@/hooks/use-toast"; ⏎ 3	import { getGlobalI18n } from "@/i18n"; ⏎ 4	import { http } from "@/lib/http"; ⏎ 5	 ⏎ 6	/** Port of composables/api/use-downloader.ts: returns `download(url, filename)`. */ ⏎ 7	export function useDownloader() { ⏎ 8	  return useCallback((url: string, filename: string) => { ⏎ 9	    void http.get<Blob>(url, { responseType: "blo … [552 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/api/use-downloader.ts
```

> result: 1	import { alert } from "~/composables/use-toast"; ⏎ 2	import { useGlobalI18n } from "~/composables/use-global-i18n"; ⏎ 3	 ⏎ 4	export function useDownloader() { ⏎ 5	  function download(url: string, filename: string) { ⏎ 6	    useFetch(url, { ⏎ 7	      method: "GET", ⏎ 8	      responseType: "blob", ⏎ 9	      onResponse({ response }) { ⏎ 10	        if (!response.ok) { ⏎ 11	          console.error("Download failed", res … [498 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/api/static-routes.ts
```

> result: 1	import { SUB_PATH } from "@/config"; ⏎ 2	 ⏎ 3	function UnknownToString(ukn: string | unknown) { ⏎ 4	  return typeof ukn === "string" ? ukn : ""; ⏎ 5	} ⏎ 6	 ⏎ 7	/** Port of composables/api/static-routes.ts: URLs of recipe images and assets. */ ⏎ 8	export const useStaticRoutes = () => { ⏎ 9	  const prefix = `${SUB_PATH}/api`.replace("//", "/"); ⏎ 10	 ⏎ 11	  // Methods to Generate reference urls for assets/images * ⏎ 12 … [1755 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/api/static-routes.ts
```

> result: 1	function UnknownToString(ukn: string | unknown) { ⏎ 2	  return typeof ukn === "string" ? ukn : ""; ⏎ 3	} ⏎ 4	 ⏎ 5	export const useStaticRoutes = () => { ⏎ 6	  const { $config } = useNuxtApp(); ⏎ 7	  const prefix = `${$config.public.SUB_PATH}/api`.replace("//", "/"); ⏎ 8	 ⏎ 9	  // Methods to Generate reference urls for assets/images * ⏎ 10	  function recipeImage(recipeId: string, version: string | unknown = "", ke … [1679 more chars]

`Glob`

```text
{"pattern": "src/*.{ts,tsx}", "path": "/home/deeumiya/mealie-wf2/frontend-react"}
```

> result: frontend-react/src/config.ts ⏎ frontend-react/src/App.test.tsx ⏎ frontend-react/src/App.tsx ⏎ frontend-react/src/vite-env.d.ts ⏎ frontend-react/src/main.tsx

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/App.tsx
```

> result: 1	import { useEffect, useState } from "react"; ⏎ 2	import { RouterProvider } from "react-router"; ⏎ 3	import { setNavigate } from "@/lib/navigation"; ⏎ 4	import { AppInfoProvider } from "@/providers/AppInfoProvider"; ⏎ 5	import { I18nProvider } from "@/providers/I18nProvider"; ⏎ 6	import { ThemeModeProvider } from "@/providers/ThemeModeProvider"; ⏎ 7	import { createRouter } from "@/routes"; ⏎ 8	 ⏎ 9	// Providers  … [699 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/config.ts
```

> result: 1	// Runtime constants: port of `runtimeConfig` in frontend/nuxt.config.ts. ⏎ 2	// Values are fixed at build time, like the statically generated Nuxt app. ⏎ 3	const env = import.meta.env; ⏎ 4	 ⏎ 5	export const AUTH_TOKEN = "mealie.access_token"; ⏎ 6	export const GLOBAL_MIDDLEWARE = env.GLOBAL_MIDDLEWARE || undefined; ⏎ 7	export const SUB_PATH = env.SUB_PATH || ""; ⏎ 8	 ⏎ 9	export interface ThemeColors { ⏎ 10	  prim … [1128 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/main.tsx
```

> result: 1	import "@fontsource/roboto/300.css"; ⏎ 2	import "@fontsource/roboto/400.css"; ⏎ 3	import "@fontsource/roboto/500.css"; ⏎ 4	import "@fontsource/roboto/700.css"; ⏎ 5	import { StrictMode } from "react"; ⏎ 6	import { createRoot } from "react-dom/client"; ⏎ 7	import { registerSW } from "virtual:pwa-register"; ⏎ 8	import App from "@/App"; ⏎ 9	 ⏎ 10	// PWA client, as configured for @vite-pwa/nuxt in frontend/nuxt.config … [779 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/vite.config.ts
```

> result: 1	import { fileURLToPath, URL } from "node:url"; ⏎ 2	import react from "@vitejs/plugin-react"; ⏎ 3	import { defineConfig, loadEnv } from "vite"; ⏎ 4	import { VitePWA } from "vite-plugin-pwa"; ⏎ 5	 ⏎ 6	const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url)); ⏎ 7	 ⏎ 8	// Locale messages are imported (never copied) from the Vue app and the backend seed data. ⏎ 9	export const aliases = { ⏎ 10	  … [2068 more chars]

`Grep`

```text
{"pattern": "useDark|GLOBAL_MIDDLEWARE", "path": "/home/deeumiya/mealie-wf2/frontend-react/src", "output_mode": "content"}
```

> result: frontend-react/src/config.ts:6:export const GLOBAL_MIDDLEWARE = env.GLOBAL_MIDDLEWARE || undefined; ⏎ frontend-react/src/config.ts:20:export const useDark = Boolean(env.THEME_USE_DARK) || false; ⏎ frontend-react/src/providers/color-mode.ts:6: * Port of VueUse `useDark()` as used by plugins/dark-mode.client.ts: the choice is stored under the ⏎ frontend-react/src/vite-env.d.ts:8:  readonly GLOBAL_MIDDLEWA … [12 more chars]

`Grep`

```text
{"pattern": "useDark|THEME_USE_DARK|SUB_PATH", "path": "/home/deeumiya/mealie-wf2/frontend/nuxt.config.ts", "output_mode": "content"}
```

> result: 30:    baseURL: process.env.SUB_PATH || "/", ⏎ 84:      SUB_PATH: process.env.SUB_PATH || "", ⏎ 87:      useDark: Boolean(process.env.THEME_USE_DARK) || false, ⏎ 130:    baseURL: process.env.SUB_PATH || "",

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/AppButtonUpload.tsx
```

> result: 1	// Usage: <AppButtonUpload url="/api/…" fileName="archive" accept=".zip" onUploaded={result => …} /> ⏎ 2	// `renderButton({ isSelecting, onButtonClick })` replaces the default button (Vue default slot). ⏎ 3	// With `post={false}` the selected file(s) are emitted without calling the API. ⏎ 4	import { useState, type ChangeEvent, type ReactNode } from "react"; ⏎ 5	import Button from "@mui/material/Button"; … [3668 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/AppButtonUpload.vue
```

> result: 1	<template> ⏎ 2	  <v-form ref="form"> ⏎ 3	    <input ⏎ 4	      ref="uploader" ⏎ 5	      class="d-none" ⏎ 6	      type="file" ⏎ 7	      :accept="accept" ⏎ 8	      :multiple="multiple" ⏎ 9	      @change="onFileChanged" ⏎ 10	    > ⏎ 11	    <slot v-bind="{ isSelecting, onButtonClick }"> ⏎ 12	      <v-btn ⏎ 13	        :loading="isSelecting" ⏎ 14	        :small="small" ⏎ 15	        :color="color" ⏎ 16	        :variant="textBtn ? 't … [3097 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/BaseOverflowButton.tsx
```

> result: 1	// Usage: <BaseOverflowButton mode="model" items={items} value={selected} onChange={setSelected} /> ⏎ 2	//        <BaseOverflowButton mode="link" items={[{ text, to }]} /> · <BaseOverflowButton mode="event" items={…} onAction={event => …} /> ⏎ 3	// A dropdown button: "model" shows/sets the selected item's value, "link" navigates, "event" calls `onAction(item.event)`. ⏎ 4	// Extra props (e.g. `size`, ` … [3656 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/BaseOverflowButton.vue
```

> result: 1	<template> ⏎ 2	  <v-menu offset-y> ⏎ 3	    <template #activator="{ props: hoverProps }"> ⏎ 4	      <v-btn ⏎ 5	        color="primary" ⏎ 6	        v-bind="{ ...hoverProps, ...$attrs }" ⏎ 7	        :class="btnClass" ⏎ 8	        :disabled="disabled" ⏎ 9	      > ⏎ 10	        <v-icon ⏎ 11	          v-if="activeObj.icon" ⏎ 12	          start ⏎ 13	        > ⏎ 14	          {{ activeObj.icon }} ⏎ 15	        </v-icon> ⏎ 16	        {{  … [4164 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/RecipeJsonEditor.tsx
```

> result: 1	// Usage: <RecipeJsonEditor value={recipe} onChange={setRecipe} height="700px" mode="text" mainMenuBar={false} readOnly /> ⏎ 2	// JSON editor (vanilla-jsoneditor, the editor json-editor-vue wraps). `value` is an object; edits that parse as JSON ⏎ 3	// call `onChange(object)`, text that does not parse keeps the previous value. `mode`, `mainMenuBar` and `readOnly` ⏎ 4	// are the editor options Vue passe … [3370 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/RecipeJsonEditor.vue
```

> result: 1	<template> ⏎ 2	  <JsonEditorVue ⏎ 3	    :model-value="modelValue" ⏎ 4	    v-bind="$attrs" ⏎ 5	    :style="{ height }" ⏎ 6	    :stringified="false" ⏎ 7	    @change="onChange" ⏎ 8	  /> ⏎ 9	</template> ⏎ 10	 ⏎ 11	<script setup lang="ts"> ⏎ 12	import JsonEditorVue from "json-editor-vue"; ⏎ 13	 ⏎ 14	const modelValue = defineModel<object>("modelValue", { default: () => ({}) }); ⏎ 15	defineProps({ ⏎ 16	  height: { ⏎ 17	    type: Stri … [601 more chars]

`Glob`

```text
{"pattern": "src/hooks/{shopping-list-page,recipe-page,use-setup,forms,use-users}/**", "path": "/home/deeumiya/mealie-wf2/frontend-react"}
```

> result: frontend-react/src/hooks/use-users/preferences.ts ⏎ frontend-react/src/hooks/use-users/user-registration-form.ts ⏎ frontend-react/src/hooks/forms/index.ts ⏎ frontend-react/src/hooks/recipe-page/shared-state.ts ⏎ frontend-react/src/hooks/forms/use-field-types.ts ⏎ frontend-react/src/hooks/use-users/index.ts ⏎ frontend-react/src/hooks/use-users/user-ratings.ts ⏎ frontend-react/src/hooks/use-users/user-form.ts ⏎ fro … [2637 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/shopping-list-page/use-shopping-list-page.ts
```

> result: 1	// Port of composables/shopping-list-page/use-shopping-list-page.ts: orchestrates the sub-hooks of the shopping list ⏎ 2	// page. The Vue refs keep their names and are `StateRef`s (`.value`, `.set()`), `state` / `listItems` are reactive ⏎ 3	// objects (see ./state-ref.ts). Polling starts when the page mounts and stops when it unmounts. ⏎ 4	import { useEffect } from "react"; ⏎ 5	import type { ShoppingLis … [7730 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/shopping-list-page/use-shopping-list-page.ts
```

> result: 1	import type { ShoppingListItemOut } from "~/lib/api/types/household"; ⏎ 2	import { useShoppingListState } from "~/composables/shopping-list-page/sub-composables/use-shopping-list-state"; ⏎ 3	import { useShoppingListData } from "~/composables/shopping-list-page/sub-composables/use-shopping-list-data"; ⏎ 4	import { useShoppingListSorting } from "~/composables/shopping-list-page/sub-composables/use-shopp … [6930 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/shopping-list-page/sub-composables/use-shopping-list-data.ts
```

> result: 1	// Port of composables/shopping-list-page/sub-composables/use-shopping-list-data.ts. ⏎ 2	// `isOffline` is a plain boolean (re-rendered by `useOnline()`); the async refresh/poll code reads the latest ⏎ 3	// online/idle flags through a small ref, because it keeps running across renders. ⏎ 4	import { useEffect } from "react"; ⏎ 5	import { useIdle, useOnline } from "@/hooks/utils"; ⏎ 6	import type { Shopping … [4387 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/shopping-list-page/sub-composables/use-shopping-list-data.ts
```

> result: 1	import { useOnline, useIdle } from "@vueuse/core"; ⏎ 2	import type { ShoppingListOut } from "~/lib/api/types/household"; ⏎ 3	import { useShoppingListItemActions } from "~/composables/shopping-list-page/sub-composables/use-shopping-list-item-actions"; ⏎ 4	 ⏎ 5	/** ⏎ 6	 * Composable for managing shopping list data fetching and polling ⏎ 7	 */ ⏎ 8	export function useShoppingListData( ⏎ 9	  listId: string, ⏎ 10	  sho … [3157 more chars]

`Grep`

```text
{"pattern": "useShoppingListPage|key=\\{", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/pages/shopping-lists/[id].tsx", "output_mode": "content", "head_limit": 10}
```

> result: 29:import { useShoppingListPage } from "@/hooks/shopping-list-page/use-shopping-list-page"; ⏎ 61:        <div key={labelSetting.id}> ⏎ 104:          return row && <div key={item.id}>{row}</div>; ⏎ 143:  const shoppingListPage = useShoppingListPage(id); ⏎ 257:        key={item.id} ⏎ 515:              <div key={key}> ⏎ 596:                    <div key={item.id} style={matchesSearch(item) ? undefined : { display … [12 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/pages/shopping-lists/[id].tsx
```

> result: 125	  "& .shopping-list-item-row .MuiCheckbox-root": { p: 0.5 }, ⏎ 126	  // the row's action icons are secondary to the item text, so they sit back until used ⏎ 127	  "& .shopping-list-item-row .MuiIconButton-sizeSmall": { "width": 32, "height": 32, "ml": "0 !important", "& svg": { opacity: 0.55 } }, ⏎ 128	  "& .shopping-list-item-row .MuiIconButton-sizeSmall:hover svg, & .shopping-list-item-row .MuiIco … [774 more chars]

`Grep`

```text
{"pattern": "export default", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/pages/shopping-lists/[id].tsx", "output_mode": "content", "-A": 8}
```

> result: 132:export default function ShoppingListPage() { ⏎ 133-  const { smAndUp, smAndDown } = useDisplay(); ⏎ 134-  const { t } = useI18n(); ⏎ 135-  const navigate = useNavigate(); ⏎ 136- ⏎ 137-  usePageTitle(t("shopping-list.shopping-list")); ⏎ 138- ⏎ 139-  const params = useParams(); ⏎ 140-  const id = params.id as string;

`Grep`

```text
{"pattern": "slug|key=", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/pages/g/[groupSlug]/cookbooks/[slug].tsx", "output_mode": "content"}
```

> result: No matches found

`Glob`

```text
{"pattern": "src/pages/g/*/cookbooks/**", "path": "/home/deeumiya/mealie-wf2/frontend-react"}
```

> result: frontend-react/src/pages/g/[groupSlug]/cookbooks/[slug].tsx ⏎ frontend-react/src/pages/g/[groupSlug]/cookbooks/index.test.tsx ⏎ frontend-react/src/pages/g/[groupSlug]/cookbooks/index.tsx

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/pages/g/[groupSlug]/cookbooks/[slug].tsx
```

> result: 1	import { CookbookPage } from "@/components/Domain/Cookbook/CookbookPage"; ⏎ 2	 ⏎ 3	export default function CookbookSlugPage() { ⏎ 4	  return <CookbookPage />; ⏎ 5	} ⏎ 6

`Grep`

```text
{"pattern": "useParams|slug|useEffect|useCookbookData", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/components/Domain/Cookbook/CookbookPage.tsx", "output_mode": "content"}
```

> result: 1:// Usage: <CookbookPage /> — body of /g/:groupSlug/cookbooks/:slug: the cookbook's name and description with an edit ⏎ 9:import { useNavigate, useParams } from "react-router"; ⏎ 16:import { useCookbookData } from "@/hooks/use-group-cookbooks"; ⏎ 41:    if (response?.slug && book.slug !== response.slug) { ⏎ 42:      // if name changed, redirect to new slug ⏎ 43:      void navigate(`/g/${groupSlug}/cookbook … [227 more chars]

`Grep`

```text
{"pattern": "listId", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/hooks/shopping-list-page/sub-composables/use-shopping-list-item-actions.ts", "output_mode": "content"}
```

> result: No matches found

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/shopping-list-page/sub-composables/use-shopping-list-item-actions.ts
```

> result: 1	// Port of composables/shopping-list-page/sub-composables/use-shopping-list-item-actions.ts. ⏎ 2	// The offline queue is a plain mutable object (the Vue `reactive` queue) that is written through to the ⏎ 3	// `shopping-list-queue` local storage entry after every change, like the deep watcher did. `isOnline` is read at ⏎ 4	// call time from the latest render's `useOnline()`. ⏎ 5	import { useEffect, useSt … [10372 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-announcements.ts
```

> result: 1	import { useEffect, type ComponentType } from "react"; ⏎ 2	import { userApi } from "@/hooks/api/api-client"; ⏎ 3	import { authStore } from "@/hooks/use-auth-backend"; ⏎ 4	import { useGroupSelf } from "@/hooks/use-groups"; ⏎ 5	import { useHouseholdSelf } from "@/hooks/use-households"; ⏎ 6	import { useMealieAuth } from "@/hooks/use-mealie-auth"; ⏎ 7	import { createStore, useStore } from "@/lib/store"; ⏎ 8	 ⏎ 9	ex … [4313 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-announcements.ts
```

> result: 1	import { useHouseholdSelf } from "~/composables/use-households"; ⏎ 2	import { useGroupSelf } from "~/composables/use-groups"; ⏎ 3	import { useUserApi } from "~/composables/api"; ⏎ 4	 ⏎ 5	export type AnnouncementMeta = { ⏎ 6	  title: string | undefined; ⏎ 7	}; ⏎ 8	 ⏎ 9	export type Announcement = { ⏎ 10	  key: string; ⏎ 11	  component: Component; ⏎ 12	  date: Date | undefined; ⏎ 13	  meta: AnnouncementMeta | undefined; ⏎ 1 … [3957 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/use-form-validation.ts
```

> result: 1	import { useState } from "react"; ⏎ 2	 ⏎ 3	/** ⏎ 4	 * Replacement for `<v-form ref>` + `:rules` (Vuetify validate-on "input"). ⏎ 5	 * ⏎ 6	 *   const { required, email } = validators;                       // lib/validators ⏎ 7	 *   const form = useFormValidation({ ⏎ 8	 *     username: field(username, [required]), ⏎ 9	 *     email: field(email, [required, email]), ⏎ 10	 *   }); ⏎ 11	 *   <TextField label={t("user.em … [2831 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/ContextMenu.tsx
```

> result: 1	// Usage: <ContextMenu items={[{ title: t("general.edit"), icon: icons.edit, event: "edit" }]} onAction={event => …} /> ⏎ 2	// Three-dots icon button that opens a compact list; picking an item calls `onAction(item.event)`. ⏎ 3	import { useState, type MouseEvent } from "react"; ⏎ 4	import IconButton from "@mui/material/IconButton"; ⏎ 5	import ListItemIcon from "@mui/material/ListItemIcon"; ⏎ 6	import ListI … [2161 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/ContextMenu.vue
```

> result: 1	<template> ⏎ 2	  <v-menu ⏎ 3	    offset-y ⏎ 4	    start ⏎ 5	    :bottom="!menuTop" ⏎ 6	    :nudge-bottom="!menuTop ? '5' : '0'" ⏎ 7	    :top="menuTop" ⏎ 8	    :nudge-top="menuTop ? '5' : '0'" ⏎ 9	    allow-overflow ⏎ 10	    close-delay="125" ⏎ 11	    content-class="d-print-none" ⏎ 12	  > ⏎ 13	    <template #activator="{ props }"> ⏎ 14	      <v-btn ⏎ 15	        size="small" ⏎ 16	        :icon="$globals.icons.dotsVertical" ⏎ 17	 … [919 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/recipes/use-recipes.ts
```

> result: 1	import { useCallback, useEffect, useState } from "react"; ⏎ 2	import { useLocation, useNavigate } from "react-router"; ⏎ 3	import { useUserApi } from "@/hooks/api"; ⏎ 4	import { usePublicExploreApi } from "@/hooks/api/api-client"; ⏎ 5	import { registerCacheReset } from "@/hooks/use-clear-composable-caches"; ⏎ 6	import { isSafeRedirectTarget } from "@/lib/validators/redirect"; ⏎ 7	import { createStore } from … [5506 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/recipes/use-recipes.ts
```

> result: 1	import { ref } from "vue"; ⏎ 2	import { useAsyncKey } from "../use-utils"; ⏎ 3	import { usePublicExploreApi } from "~/composables/api/api-client"; ⏎ 4	import { useUserApi } from "~/composables/api"; ⏎ 5	import { isSafeRedirectTarget } from "~/lib/validators/redirect"; ⏎ 6	import type { OrderByNullPosition, Recipe } from "~/lib/api/types/recipe"; ⏎ 7	import type { RecipeSearchQuery } from "~/lib/api/user/rec … [4817 more chars]

`Grep`

```text
{"pattern": "fetchMore", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/components", "output_mode": "content"}
```

> result: frontend-react/src/components/Domain/Recipe/RecipeSelector.test.tsx:8:  fetchMore: vi.fn(), ⏎ frontend-react/src/components/Domain/Recipe/RecipeSelector.test.tsx:12:  useLazyRecipes: () => ({ fetchMore: mocks.fetchMore }), ⏎ frontend-react/src/components/Domain/Recipe/RecipeSelector.test.tsx:30:    mocks.fetchMore.mockResolvedValue([ ⏎ frontend-react/src/components/Domain/Recipe/RecipeSelector.test.tsx: … [2693 more chars]

`Grep`

```text
{"pattern": "^\\s*(test|it)(\\.skip|\\.each)?\\(", "path": "/home/deeumiya/mealie-wf2/frontend/app/plugins/__tests__/axios.test.ts", "output_mode": "count"}
```

> result: frontend/app/plugins/__tests__/axios.test.ts:13 ⏎  ⏎ Found 13 total occurrences across 1 file.

`Grep`

```text
{"pattern": "^\\s*(test|it)(\\.skip|\\.each)?\\(", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/lib/__tests__/http.test.ts", "output_mode": "count"}
```

> result: frontend-react/src/lib/__tests__/http.test.ts:13 ⏎  ⏎ Found 13 total occurrences across 1 file.

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/lib/__tests__/http.test.ts
```

> result: 1	import type { AxiosInstance, InternalAxiosRequestConfig } from "axios"; ⏎ 2	import { describe, expect, test, vi, beforeEach, afterEach } from "vitest"; ⏎ 3	 ⏎ 4	const TOKEN_NAME = "mealie.access_token"; ⏎ 5	const toastMocks = vi.hoisted(() => ({ ⏎ 6	  error: vi.fn(), ⏎ 7	  info: vi.fn(), ⏎ 8	})); ⏎ 9	 ⏎ 10	vi.mock("@/hooks/use-toast", () => ({ ⏎ 11	  alert: toastMocks, ⏎ 12	})); ⏎ 13	 ⏎ 14	// The Vue test stubbed the aut … [9227 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/plugins/__tests__/axios.test.ts
```

> result: 1	import type { AxiosInstance, InternalAxiosRequestConfig } from "axios"; ⏎ 2	import { describe, expect, test, vi, beforeEach, afterEach } from "vitest"; ⏎ 3	 ⏎ 4	const TOKEN_NAME = "mealie.access_token"; ⏎ 5	const toastMocks = vi.hoisted(() => ({ ⏎ 6	  error: vi.fn(), ⏎ 7	  info: vi.fn(), ⏎ 8	})); ⏎ 9	 ⏎ 10	vi.mock("~/composables/use-toast", () => ({ ⏎ 11	  alert: toastMocks, ⏎ 12	})); ⏎ 13	 ⏎ 14	/** Rejects the way axios … [9171 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/AutoForm.tsx
```

> result: 1	// Usage: <AutoForm items={fields} value={model} onChange={setModel} isValid onIsValidChange={setValid} updateMode /> ⏎ 2	// Renders a form from a list of field definitions (auto-form-types.ts): checkbox, text/password, textarea, number, ⏎ 3	// select and colour fields in a 12-column grid, with optional section headings. `v-model` → `value`/`onChange`, ⏎ 4	// `v-model:isValid` → `onIsValidChange`. Rul … [8714 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/AutoForm.vue
```

> result: 1	<template> ⏎ 2	  <v-form v-model="isValid" validate-on="input"> ⏎ 3	    <v-card ⏎ 4	      :color="color" ⏎ 5	      :dark="dark" ⏎ 6	      flat ⏎ 7	      :width="width" ⏎ 8	      class="my-2" ⏎ 9	    > ⏎ 10	      <v-row no-gutters> ⏎ 11	        <template v-for="(inputField, index) in items" :key="index"> ⏎ 12	          <v-col ⏎ 13	            v-if="inputField.section" ⏎ 14	            :cols="12" ⏎ 15	            class="px-2 … [7013 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/BaseNumberInput.tsx
```

> result: 1	// Usage: <BaseNumberInput label={t("recipe.servings")} value={servings} onChange={setServings} min={0} precision={null} /> ⏎ 2	// Replacement for <v-number-input>: a number field with −/+ steppers (`controlVariant="hidden"` hides them), ⏎ 3	// clamped to min/max (steppers are mouse-only like Vuetify's; keyboard uses the native arrows),, rounded to `precision` decimals (null = unrounded, Vuetify def … [4139 more chars]

`Grep`

```text
{"pattern": "<BaseNumberInput[^>]*slotProps|BaseNumberInput", "path": "/home/deeumiya/mealie-wf2/frontend-react/src", "output_mode": "files_with_matches"}
```

> result: Found 13 files ⏎ frontend-react/src/pages/g/[groupSlug]/recipes/finder/index.tsx ⏎ frontend-react/src/components/Domain/QueryFilterBuilder.tsx ⏎ frontend-react/src/components/global/__tests__/primitives.test.tsx ⏎ frontend-react/src/components/Domain/Recipe/RecipeScaleEditButton.tsx ⏎ frontend-react/src/components/Domain/Recipe/RecipePage/RecipePageParts/RecipePageInfoEditor.tsx ⏎ frontend-react/src/component … [480 more chars]

`Grep`

```text
{"pattern": "slotProps", "path": "/home/deeumiya/mealie-wf2/frontend-react/src", "glob": "{components/Domain/Recipe/RecipeIngredientEditor.tsx,components/Domain/Recipe/RecipeScaleEditButton.tsx,components/Domain/ShoppingList/ShoppingListItemDetails.tsx,components/Domain/Recipe/RecipeNutrition.tsx,components/Domain/Recipe/RecipeTimeInput.tsx,pages/household/mealplan/planner.tsx,components/Domain/Recipe/RecipePage/RecipePageParts/RecipePageInfoEditor.tsx,components/Domain/QueryFilterBuilder.tsx,pages/g/[[]groupSlug]/recipes/finder/index.tsx,components/Domain/Group/GroupAIProviderDialog.tsx}", "o … [32 more chars]
```

> result: frontend-react/src/pages/g/[groupSlug]/recipes/finder/index.tsx-525-                        anchorEl={settingsAnchor} ⏎ frontend-react/src/pages/g/[groupSlug]/recipes/finder/index.tsx-526-                        onClose={() => setSettingsAnchor(null)} ⏎ frontend-react/src/pages/g/[groupSlug]/recipes/finder/index.tsx-527-                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }} ⏎  … [3615 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/global/BasePageTitle.tsx
```

> result: 1	// Usage: <BasePageTitle divider header={<img …/>} title={t("user.profile")}>{t("…subtitle")}</BasePageTitle> ⏎ 2	// Centred page heading (h2) with optional header, subtitle (children, h3) and a `content` row. ⏎ 3	import type { ReactNode } from "react"; ⏎ 4	import Box from "@mui/material/Box"; ⏎ 5	import Divider from "@mui/material/Divider"; ⏎ 6	import Typography from "@mui/material/Typography"; ⏎ 7	 ⏎ 8	inte … [963 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/global/BasePageTitle.vue
```

> result: 1	<template> ⏎ 2	  <div class="mt-4"> ⏎ 3	    <section class="d-flex flex-column align-center"> ⏎ 4	      <slot name="header" /> ⏎ 5	      <h2 class="text-h5"> ⏎ 6	        <slot name="title"> ⏎ 7	          👋 Here's a Title ⏎ 8	        </slot> ⏎ 9	      </h2> ⏎ 10	 ⏎ 11	      <h3 class="subtitle-1"> ⏎ 12	        <slot /> ⏎ 13	      </h3> ⏎ 14	    </section> ⏎ 15	    <section class="d-flex"> ⏎ 16	      <slot name="content" /> ⏎ 17 … [396 more chars]

`Grep`

```text
{"pattern": ">\\s*[A-Z][a-z]+( [a-z]+)*\\s*<|(label|title|placeholder|aria-label)=\"[A-Z][a-z]", "path": "/home/deeumiya/mealie-wf2/frontend-react/src", "glob": "{components/global,components/Layout,layouts,providers}/**/*.tsx", "output_mode": "content"}
```

> result: frontend-react/src/components/Layout/LayoutParts/AppFooter.tsx:23:        <strong> Mealie </strong> ⏎ frontend-react/src/components/global/__tests__/primitives.test.tsx:29:        <BaseButton>Custom</BaseButton> ⏎ frontend-react/src/components/global/__tests__/primitives.test.tsx:57:      <BaseDialog open={open} onOpenChange={setOpen} title="Dialog Title" {...props}> ⏎ frontend-react/src/components/glob … [152 more chars]

`Grep`

```text
{"pattern": ": any\\b|as any\\b|<any>|TODO|FIXME|XXX|HACK|@ts-ignore|eslint-disable", "path": "/home/deeumiya/mealie-wf2/frontend-react/src", "glob": "{hooks,components/global,components/Layout,layouts,providers,routes,i18n,lib/validators,lib/sanitize,lib/recipe,lib/icons,lib/*.ts}/**", "output_mode": "content"}
```

> result: frontend-react/src/components/global/RecipeJsonEditor.tsx:96:    // eslint-disable-next-line react-hooks/exhaustive-deps ⏎ frontend-react/src/components/global/WakelockSwitch.tsx:55:    // eslint-disable-next-line react-hooks/exhaustive-deps ⏎ frontend-react/src/hooks/recipes/use-recipe.ts:48:    // eslint-disable-next-line react-hooks/exhaustive-deps ⏎ frontend-react/src/hooks/shopping-list-page/use-sh … [377 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/recipes/use-recipe.ts
```

> result: 1	import { useCallback, useEffect, useState } from "react"; ⏎ 2	import { useUserApi } from "@/hooks/api"; ⏎ 3	import type { Recipe } from "@/lib/api/types/recipe"; ⏎ 4	 ⏎ 5	export const useRecipe = function (slug: string, eager = true) { ⏎ 6	  const api = useUserApi(); ⏎ 7	  const [loading, setLoading] = useState(eager); ⏎ 8	 ⏎ 9	  const [recipe, setRecipe] = useState<Recipe | null>(null); ⏎ 10	 ⏎ 11	  const fetchRec … [1327 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/recipes/use-recipe.ts
```

> result: 1	import { useUserApi } from "~/composables/api"; ⏎ 2	import type { Recipe } from "~/lib/api/types/recipe"; ⏎ 3	 ⏎ 4	export const useRecipe = function (slug: string, eager = true) { ⏎ 5	  const api = useUserApi(); ⏎ 6	  const loading = ref(false); ⏎ 7	 ⏎ 8	  const recipe = ref<Recipe | null>(null); ⏎ 9	 ⏎ 10	  async function fetchRecipe() { ⏎ 11	    loading.value = true; ⏎ 12	    const { data } = await api.recipes.getO … [715 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/Layout/LayoutParts/AppFooter.tsx
```

> result: 1	// Usage: <AppFooter /> — primary-coloured footer with the GitHub link and the year. ⏎ 2	import Box from "@mui/material/Box"; ⏎ 3	import IconButton from "@mui/material/IconButton"; ⏎ 4	import { MdiIcon } from "@/components/global/MdiIcon"; ⏎ 5	import { useI18n } from "@/i18n"; ⏎ 6	import { icons } from "@/lib/icons"; ⏎ 7	 ⏎ 8	export function AppFooter() { ⏎ 9	  const { t } = useI18n(); ⏎ 10	  return ( ⏎ 11	    <Box … [537 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/components/Layout/LayoutParts/AppFooter.vue
```

> result: 1	<template> ⏎ 2	  <v-footer ⏎ 3	    color="primary" ⏎ 4	    padless ⏎ 5	    app ⏎ 6	  > ⏎ 7	    <v-row ⏎ 8	      justify="center" ⏎ 9	      align="center" ⏎ 10	      density="comfortable" ⏎ 11	      no-gutters ⏎ 12	    > ⏎ 13	      <v-col ⏎ 14	        class="py-2 text-center white--text" ⏎ 15	        cols="12" ⏎ 16	      > ⏎ 17	        <v-btn ⏎ 18	          color="white" ⏎ 19	          icon ⏎ 20	          href="https://github.com/mea … [308 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/use-households.ts
```

> result: 1	import { useCallback, useEffect, useState } from "react"; ⏎ 2	import { useAdminApi } from "@/hooks/api"; ⏎ 3	import { userApi } from "@/hooks/api/api-client"; ⏎ 4	import { authStore } from "@/hooks/use-auth-backend"; ⏎ 5	import { registerCacheReset } from "@/hooks/use-clear-composable-caches"; ⏎ 6	import type { HouseholdCreate, HouseholdInDB, UpdateHouseholdPreferences } from "@/lib/api/types/household"; ⏎  … [4385 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend/app/composables/use-households.ts
```

> result: 1	import { useAdminApi, useUserApi } from "~/composables/api"; ⏎ 2	import type { HouseholdCreate, HouseholdInDB } from "~/lib/api/types/household"; ⏎ 3	 ⏎ 4	const householdSelfRef = ref<HouseholdInDB | null>(null); ⏎ 5	const loading = ref(false); ⏎ 6	 ⏎ 7	export function resetHouseholdSelf() { ⏎ 8	  householdSelfRef.value = null; ⏎ 9	  loading.value = false; ⏎ 10	} ⏎ 11	 ⏎ 12	export const useHouseholdSelf = function () … [2937 more chars]

`Grep`

```text
{"pattern": "useStore\\([^,()]+, ", "path": "/home/deeumiya/mealie-wf2/frontend-react/src", "output_mode": "content"}
```

> result: frontend-react/src/lib/store.ts:9: *   const name = useStore(userStore, s => s.name);

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/hooks/utils/use-sortable.ts
```

> result: 1	// Usage: ⏎ 2	//   const listRef = useRef<HTMLDivElement>(null); ⏎ 3	//   useSortableList(listRef, items, setItems, { handle: ".handle", animation: 200, delay: 250, delayOnTouchOnly: true }); ⏎ 4	//   <div ref={listRef}>{items.map(item => <Row key={item.id} … />)}</div> ⏎ 5	// or, when the caller needs the indices (e.g. to also reset per-row state): ⏎ 6	//   useSortable(listRef, { handle: ".handle", onReo … [6232 more chars]

`Grep`

```text
{"pattern": "useSortable(List)?\\(", "path": "/home/deeumiya/mealie-wf2/frontend-react/src", "output_mode": "content"}
```

> result: frontend-react/src/pages/g/[groupSlug]/cookbooks/index.tsx:157:  useSortableList( ⏎ frontend-react/src/hooks/utils/use-sortable.test.tsx:35:  useSortableList(ref, items, setItems, { handle: ".handle", animation: 200, disabled, onReorder }); ⏎ frontend-react/src/hooks/utils/use-sortable.test.tsx:123:      useSortable(ref, { ⏎ frontend-react/src/hooks/utils/use-sortable.ts:3://   useSortableList(listRef,  … [1005 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/pages/shopping-lists/[id].tsx
```

> result: 40	  list[index] = item; ⏎ 41	} ⏎ 42	 ⏎ 43	interface ReorderLabelsListProps { ⏎ 44	  labels: ShoppingListMultiPurposeLabelOut[]; ⏎ 45	  onReorder: (labels: ShoppingListMultiPurposeLabelOut[]) => void; ⏎ 46	} ⏎ 47	 ⏎ 48	/** The sortable list of the "reorder labels" dialog; it is mounted together with the dialog content. */ ⏎ 49	function ReorderLabelsList({ labels, onReorder }: ReorderLabelsListProps) { ⏎ 50	  const li … [2505 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/pages/g/[groupSlug]/cookbooks/index.tsx
```

> result: 140	  }); ⏎ 141	  useEffect(() => { ⏎ 142	    function handleUnmount() { ⏎ 143	      const current = pending.current; ⏎ 144	      if (!current.createTarget?.id || current.createTarget.queryFilterString) { ⏎ 145	        return; ⏎ 146	      } ⏎ 147	      void current.deleteCreateTarget(); ⏎ 148	    } ⏎ 149	    window.addEventListener("beforeunload", handleUnmount); ⏎ 150	    return () => { ⏎ 151	      handleUnmount(); ⏎ 15 … [1554 more chars]

`Grep`

```text
{"pattern": "ref=\\{listRef\\}", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/pages/g/[groupSlug]/cookbooks/index.tsx", "output_mode": "content", "-B": 8}
```

> result: 238-          </Box> ⏎ 239-        </Box> ⏎ 240- ⏎ 241-        {/* Create New */} ⏎ 242-        <BaseButton create onClick={() => void createCookbook()} /> ⏎ 243- ⏎ 244-        {/* Cookbook List */} ⏎ 245-        <Box sx={{ mt: 1 }}> ⏎ 246:          <Box ref={listRef} sx={{ width: "100%" }}>

`Grep`

```text
{"pattern": "ref=\\{listRef\\}|useSortable\\(listRef", "path": "/home/deeumiya/mealie-wf2/frontend-react/src/components", "output_mode": "content", "-B": 4}
```

> result: frontend-react/src/components/Domain/QueryFilterBuilder.tsx-296- ⏎ frontend-react/src/components/Domain/QueryFilterBuilder.tsx-297-  // =========================================================================== ⏎ frontend-react/src/components/Domain/QueryFilterBuilder.tsx-298-  // Drag and drop ⏎ frontend-react/src/components/Domain/QueryFilterBuilder.tsx-299- ⏎ frontend-react/src/components/Domain/Query … [4688 more chars]

`Grep`

```text
{"pattern": "shopping-lists/\\$|/shopping-lists/", "path": "/home/deeumiya/mealie-wf2/frontend-react/src", "output_mode": "content"}
```

> result: frontend-react/src/routes/shopping.tsx:4:// Domain "shopping (/shopping-lists/**)" (PROCESS.md §1.7): shopping-lists, shopping-lists/[id]. ⏎ frontend-react/src/routes/shopping.tsx:12:      ...page(() => import("@/pages/shopping-lists/index")), ⏎ frontend-react/src/routes/shopping.tsx:18:      ...page(() => import("@/pages/shopping-lists/[id]")), ⏎ frontend-react/src/routes/__tests__/guards.test.ts:39:   … [963 more chars]

`Read`

```text
/home/deeumiya/mealie-wf2/frontend-react/src/components/Domain/Recipe/RecipePage/RecipePageParts/RecipePageIngredientEditor.tsx
```

> result: 140	    }); ⏎ 141	  } ⏎ 142	 ⏎ 143	  // drag and drop (Vue <VueDraggable handle=".handle" :delay="250" :delay-on-touch-only="true">) ⏎ 144	  const listRef = useRef<HTMLDivElement>(null); ⏎ 145	  useSortable(listRef, { ⏎ 146	    handle: ".handle", ⏎ 147	    delay: 250, ⏎ 148	    delayOnTouchOnly: true, ⏎ 149	    animation: 200, ⏎ 150	    group: "recipe-ingredients", ⏎ 151	    disabled: false, ⏎ 152	    ghostClass: "ghost" … [2127 more chars]

`SubagentHandback`

```text
{"message": "R1 review (foundation: lib excl. lib/api, i18n, providers, routes, hooks, components/global, layouts, components/Layout)\n\nFindings (most severe first):\n\n1. high | frontend-react/src/routes/guards.ts:36-39, 101-112 (and routes/index.tsx:52) | This only affects SUB_PATH deployments (D51 supports them). In a data router, `request.url` includes the basename, so `fullPath()` returns `/mealie/g/...`. Two things break. (a) `requireAuth` puts `redirect=/mealie/...` in the login URL. After login, `navigate(redirect)` adds the basename again and lands on `/mealie/mealie/...`, which is t … [10219 more chars]
```

> result: {"success":true,"message":"Report delivered to your caller."}
