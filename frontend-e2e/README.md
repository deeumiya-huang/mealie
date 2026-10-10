# Frontend E2E yardstick

A framework-agnostic Playwright suite that grades a built Mealie frontend through a real browser.
It was written against the Vue app (`frontend/`) and must stay green there; a rewrite (e.g. React
in `frontend-react/`) is graded by pointing the same suite at its build output.

## What it checks

| Tier | Project | Tests | Pass means |
|---|---|---|---|
| 1 | `routes` | `[route]` tests split into `core` migration-scope routes and `extended` out-of-scope routes, with `smoke` and `strict` modes | Smoke mode checks expected URL, visible page content, no uncaught error / `console.error` / 5xx, and no stub text. Strict mode also checks expected en-US text, seeded data, and form prefill values. See `lib/routes.ts`. |
| 2 | `flows` | 15 `[flow]` tests in `tests/flows/` | Key user journeys: log in / wrong password / log out, admin vs member navigation, open / search / create / comment on recipes, create a shopping list, add + check an item, add a meal-plan note, create a tag, create a user, edit profile. |

Selectors use only roles, accessible names, visible text and tooltips: never CSS classes or
component names. Where the Vue app has icon-only buttons, `clickButton()` accepts either an
accessible name or a hover tooltip with that text.

## How it runs

- `scripts/start-backend.sh` starts the real FastAPI backend on port 9091 with `PRODUCTION=true`,
  serving the built SPA from `E2E_STATIC_DIR` (default `../frontend/dist`) the same way the
  production container does (`mealie/routes/spa/`). The data dir `.data/` is wiped on every start.
- `global-setup.ts` seeds everything through the REST API: admin + two users, recipes with
  ingredients/instructions/organizers, cookbook, two shopping lists, meal plan entries, webhook,
  notifier, recipe action, share link, a migration report, a second group and household.
- Flows never modify seeded data; they create their own uniquely named records, so the two
  projects can run side by side.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium      # once per machine

# Vue reference: build first (cd ../frontend && pnpm generate), then
pnpm exec playwright test                  # everything (2 workers)
pnpm exec playwright test --project=routes
E2E_ROUTE_SCOPE=core pnpm exec playwright test --project=routes
E2E_ROUTE_SCOPE=extended pnpm exec playwright test --project=routes
E2E_ROUTE_SCOPE=core E2E_ROUTE_CHECK=smoke pnpm exec playwright test --project=routes
pnpm exec playwright test --project=flows

# Another build, same tests
E2E_STATIC_DIR=../frontend-react/dist pnpm exec playwright test
```

Environment: `E2E_PORT` (9091), `E2E_WORKERS` (2 — the dev box has 3.8 GB RAM),
`E2E_ROUTE_SCOPE` (`all`, `core`, or `extended`; default `all`),
`E2E_ROUTE_CHECK` (`strict` or `smoke`; default `strict`),
`E2E_REUSE_SERVER=1` (reuse a backend you started yourself; only for writing tests).

Reports: `test-results/results.json` (read by `rewrite-evidence/measure.sh`) and
`playwright-report/`. Retries are off on purpose: a flaky test must be fixed, not retried.

## Known behaviour of the Vue reference

- A non-admin who types an `/admin/...` URL directly still gets the admin page shell; every admin
  API call answers 403. The `admin-only` middleware doesn't redirect on a hard load. The flows
  therefore check which admin links a member is *offered*, not direct URL access.
- The shopping list page polls every 5 s and queues new items in localStorage before sending them.
  Occasionally (about 1 in 10 runs) a freshly added item is lost and the input is cleared. The
  add-item flow therefore re-adds the item for up to 30 s, as a user would. Every flow creates its
  own records (that flow creates its own list), so the suite can run repeatedly on one database.
- Headless Chromium always rejects the Screen Wake Lock request ("Keep Screen Awake"); that one
  error is allow-listed in `lib/page-health.ts`.
