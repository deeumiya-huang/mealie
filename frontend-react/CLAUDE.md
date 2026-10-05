# frontend-react — agent guide (WF2)

React rewrite of the Mealie frontend (`../frontend/`, Nuxt 4 + Vue 3 + Vuetify 4). The full process,
rules and mapping tables are in `../PROCESS.md` (§1 is authoritative); this file is the short version
for working inside this directory.

## Stack
Vite · React 19 · TypeScript strict · React Router data router (`createBrowserRouter`) · MUI (+
`@mui/x-date-pickers`, `@mui/lab` Timeline) · i18next/react-i18next with a vue-i18n compat layer ·
axios · vitest + jsdom + Testing Library · ESLint flat config (2 spaces, double quotes, semicolons).

## Commands (run here)
```bash
pnpm install --frozen-lockfile          # worktrees: add --prefer-offline
pnpm exec tsc --noEmit
pnpm exec eslint .
pnpm exec vitest run --maxWorkers=4     # porters: --maxWorkers=2 and only their test files
pnpm build                              # -> dist/index.html, assets in dist/_nuxt/
node scripts/port-status.mjs [--domain <d>]
node scripts/test-parity.mjs
node scripts/sync-api.mjs               # re-copy ../frontend/app/lib/api (never hand-edit src/lib/api/types)
```
Build + E2E + `../rewrite-evidence/measure.sh` are run by the main session only.

## Where things go (mirror the Vue paths)
| Vue (`../frontend/app/`) | React (`src/`) |
|---|---|
| `pages/a/[id].vue` | `pages/a/[id].tsx` + route in `routes/<domain>.tsx` |
| `components/X/Y.vue` | `components/X/Y.tsx` (same component name) |
| `composables/x/use-y.ts` | `hooks/x/use-y.ts` (same exported names) |
| `layouts/*.vue` | `layouts/*` |
| `middleware/*.ts` | `routes/guards.ts` (loader helpers) |
| `plugins/*.ts` | `providers/*`, `lib/http.ts` |
| `lib/**` | `lib/**` (api copied, rest ported 1:1) |
| `*.test.ts` | same mirrored path, `.test.ts(x)` |

Locales are imported from `../frontend/app/lang` via the `@locales` alias (never edited, never copied).

## Rules you will trip over
- Never edit `../frontend`, `../mealie`, `../frontend-e2e`, `../rewrite-evidence/measure.sh`, locale files.
- Every string through `useI18n().t("<same key as Vue>")`. No hard-coded English.
- Accessible names = Vue labels/tooltips (the E2E suite selects by role/name/tooltip). Icon-only
  buttons: MUI `Tooltip` with the Vue tooltip text. Tables: MUI `Table` (not DataGrid). Links: `Link`.
- No `any` (else `// any: <reason>`), no `@ts-ignore`, no TODO/FIXME/XXX/HACK/"not implemented"/
  "coming soon"/"placeholder" anywhere in `src` — record gaps in `PROCESS.md` §9 as `GAP-<n>`.
- Routes are registered only for ported pages; never add placeholder pages.
- Shared state: `createStore`/`useStore` (`lib/store.ts`), not new libraries. No new dependencies
  without the main session.
- Tests: same titles and counts as Vue, never weaken or delete an assertion; unportable → `test.skip`
  with `// skip: <reason>`.
- Hooks in `.claude/settings.json` run eslint + tsc after each edit and gate session stops on them.
