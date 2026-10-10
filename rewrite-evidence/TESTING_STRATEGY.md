# Frontend Rewrite Testing Strategy

This document summarises the E2E testing approach used for the Mealie frontend framework migration experiment.

## Purpose

The goal of these tests is to provide a framework-agnostic yardstick for comparing the original Nuxt/Vue frontend with any React rewrite attempt.

The tests focus on user-visible behaviour rather than Vue-specific implementation details. This means the same browser tests can be pointed at:

- the original Vue frontend in `frontend/`
- a rewritten React frontend, for example `frontend-react/`
- another workflow branch or worktree

For the report, these tests provide evidence for whether an agentic workflow preserved working frontend behaviour, broke existing flows, or only produced code that looked plausible but could not run.

## Test Structure

The E2E suite lives in:

```text
frontend-e2e/
```

It has two main layers:

```text
routes tests
flow tests
```

### Route Tests

Route tests are defined in:

```text
frontend-e2e/tests/routes.spec.ts
frontend-e2e/lib/routes.ts
```

They open selected Mealie pages in a real browser and check whether each page is usable at a basic level.

The route list is split into two scopes:

```text
core
extended
```

`core` contains the migration-relevant routes for the frontend rewrite experiment, mainly:

- login and public auth pages
- recipe list
- recipe detail
- shared recipe view
- recipe creation and import pages
- recipe organizers such as categories, tags, tools, and finder
- meal planner pages
- shopping list pages
- user profile pages

`extended` contains broader Mealie pages that are useful for full coverage but are outside the main migration scope, such as:

- admin pages
- group settings
- household settings
- data management pages
- reports and migrations

The default route scope is `all`, which runs both `core` and `extended`.

### Route Check Modes

Route tests support two check modes:

```text
smoke
strict
```

`smoke` mode checks that:

- the page opens successfully
- the final URL is correct
- the page has visible content
- there are no uncaught page errors
- there are no unexpected `console.error` messages
- there are no HTTP 5xx responses
- the page does not contain obvious placeholder text such as `TODO`, `Not implemented`, or `Coming soon`

`strict` mode includes everything from smoke mode and also checks:

- expected visible text
- seeded data such as recipe names and ingredient names
- prefilled form values on edit/detail pages

The default mode is `strict`, so the original behaviour remains the strongest check. `smoke` mode is useful during early React migration attempts, when page survival and runtime stability are more important than matching every piece of Vue UI copy.

### Flow Tests

Flow tests live in:

```text
frontend-e2e/tests/flows/
```

They test real user journeys, including:

- logging in
- rejecting an invalid password
- logging out
- checking admin vs member navigation
- opening a recipe from the recipe list
- searching recipes
- creating a recipe by name
- commenting on a recipe
- creating a shopping list
- adding and checking off a shopping item
- adding a meal plan note
- creating a tag
- creating a user
- editing a profile

These tests are stricter than route smoke tests because they verify actual behaviour, not just page availability.

## Test Data

The suite uses a real FastAPI backend and seeds data through the REST API in:

```text
frontend-e2e/global-setup.ts
```

The seed data includes:

- admin user
- member users
- recipes
- ingredients and instructions
- categories, tags, and tools
- cookbooks
- shopping lists
- meal plan entries
- webhooks and notifiers
- migration report data
- group and household records

This makes the browser tests closer to real usage, but also means the setup depends on the backend being able to start successfully.

## Useful Commands

Install E2E dependencies:

```bash
cd frontend-e2e
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

Run all route tests in strict mode:

```bash
pnpm exec playwright test --project=routes
```

Run only core route smoke tests:

```bash
E2E_ROUTE_SCOPE=core E2E_ROUTE_CHECK=smoke pnpm exec playwright test --project=routes
```

Run only core route strict tests:

```bash
E2E_ROUTE_SCOPE=core E2E_ROUTE_CHECK=strict pnpm exec playwright test --project=routes
```

Run extended route tests:

```bash
E2E_ROUTE_SCOPE=extended pnpm exec playwright test --project=routes
```

Run user flow tests:

```bash
pnpm exec playwright test --project=flows
```

## Measurement Script

The measurement script lives in:

```text
rewrite-evidence/measure.sh
```

It records build, test, lint, type-check, static-count, and E2E results into:

```text
rewrite-evidence/metrics.csv
rewrite-evidence/runs/
```

`metrics.csv` is the script's flat raw output. Use `METRICS_TEMPLATE.md` for the human-readable workflow summary, including agent tool, model, total tokens, agent runtime, combined human review/fix time, manual interventions, and test results.

Example command for measuring the Vue baseline with core smoke route checks:

```bash
./rewrite-evidence/measure.sh --app frontend --label vue-core-smoke --route-scope core --route-check smoke
```

Example command for measuring a React rewrite:

```bash
./rewrite-evidence/measure.sh --app frontend-react --label wf2-react-checkpoint --route-scope core --route-check smoke
```

## How This Supports the Report

These tests support the report in three ways:

1. They establish a measurable baseline for the original Vue frontend.
2. They provide a consistent way to compare different AI workflows.
3. They separate page availability from deeper functional correctness.

Suggested interpretation:

```text
route smoke pass rate = how many pages still load without obvious runtime failure
route strict pass rate = how closely pages still match expected content and seeded data
flow pass rate = how many real user journeys still work end to end
```

This helps distinguish between an AI workflow that generates many files and one that preserves real application behaviour.

## Limitations

The tests are useful but not perfect.

- Strict route checks can fail when UI wording changes, even if the feature still works.
- The setup depends on a real backend and seeded data, so failures may come from environment or setup problems.
- The full extended route set is broader than the main React migration scope.
- Passing smoke tests does not prove full functionality; it only proves the page can load without obvious errors.
- Passing flow tests gives stronger evidence because flows exercise actual user behaviour.

For the frontend migration report, core route smoke tests and flow tests should be treated as the most important evidence. Extended route tests can be used as supporting evidence, but failures there should be interpreted in relation to the declared migration scope.
