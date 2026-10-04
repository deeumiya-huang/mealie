# WF1 evaluation — single-prompt baseline

Evaluated 2026-10-04 from the main checkout (`rewrite/phase0-baseline`). The WF1 agent worked in a separate
clone, `~/mealie-wf1`, on branch `rewrite/wf1-baseline`, starting from `aaa5a8cf6`. That clone never contained the yardstick.

| | |
|---|---|
| WF1 head | `389f9a2e4` (30 commits on top of `aaa5a8cf6`: 28 `[WF1] …` + 2 `WIP: usage cap - [WF1] …`) |
| Measurement | `metrics.csv` row `WF1-end`, run `runs/20261004T094719Z-mealie-wf1_frontend-react-WF1-end/` |
| Agent's own report | `frontend-react/MIGRATION_REPORT.md` on `rewrite/wf1-baseline` |
| Transcripts | `~/.claude/projects/-home-deeumiya-mealie-wf1/{d46d5131…,c9f616b7…}.jsonl` (local only) |

## 1. Results

| Metric | Vue baseline | WF1 React | Reading |
|---|---|---|---|
| Routes (E2E tier 1) | 66/66 | **66/66** | Every page renders real content without errors |
| Flows (E2E tier 2) | 15/15 | **11/15** | See section 2 |
| Type errors | 315 (`vue-tsc`) | **0** (`tsc`) | |
| Lint errors | 0 | 0 | |
| Unit tests pass/fail/skip | 517/0/0 | 518/0/0 | Nothing skipped |
| `expect(` calls | 817 | 818 | No sign of weakened tests |
| Test files | 48 | 48 | |
| `any` | 88 | 3 | |
| TODO-like markers | 16 | 10 | All 10 come from the Vue source or the API client, e.g. `DocLink` "dynamically set docs link" |
| Build | 60 s | 55 s | Static SPA in `frontend-react/dist` |

The scope constraint held: `git diff --name-only aaa5a8cf6 389f9a2e4` lists only files under `frontend-react/`.
`frontend/`, `mealie/`, and the locale files are unchanged. `frontend/` must stay, because `frontend-react/vite.config.ts`
loads the generated API types, `lang/`, and `public/` from it.

## 2. The four failing flows

### 2a. Three recipe flows: one root cause, a real regression

The three flows are `open a recipe from the recipe list`, `search narrows the recipe list`, and `create a recipe by name`.
All of them wait for `getByRole('link', { name: <recipe name> })`, and none of them finds it. The screenshots
(`runs/…WF1-end/e2e-failures/recipes-*/`) show that the cards are rendered. In the accessibility tree, though, each recipe name
is a `paragraph` inside a plain container, not a link.

- Vue: `RecipeCard.vue` uses `<v-card :to="recipeRoute">`, which renders an `<a href>`.
- React: `RecipeCard.tsx:57` puts `onClick={() => navigate(recipeRoute)}` on a MUI `<Card>` (a `div`).

A mouse click still navigates. The card can't be opened in a new tab, Tab can't reach it,
and screen readers don't announce it as a link. The agent's own browser smoke screenshots could not catch this,
because they only check appearance and click-through.

### 2b. Shopping list check-off: works, the yardstick timed out

`add an item and check it off` times out inside `locator.check()`. The Playwright trace
(`study-notes/rewrite-evidence/wf1-e2e-traces/shopping-add-and-check-off.trace.zip`, local only) shows that the feature works:

```
POST /households/shopping/items/create-bulk   201   item added
PUT  /households/shopping/items                200   check-off saved
```

The page shows "One item checked". `check()` clicks, then waits to confirm that the same checkbox is checked.
The React app moves the row into the collapsed "checked" section immediately, so that element is gone, and `check()` waits until
the 90 s test timeout. Vue passes the same flow. The two apps behave differently in the DOM, but not for the user.

**Decision:** keep the raw score (11/15) and leave the yardstick unchanged, so that Vue, WF1 and WF2 are measured with the same tool.
The report notes that 3 of the 4 failures are one real regression and 1 is a timing sensitivity of the yardstick.

## 3. Isolation check (step 6 of the plan)

`grep -l "frontend-e2e\|study-notes\|phase0-baseline\|measure.sh"` over the WF1 transcripts matched one file
(`d46d5131…`). That was a false positive:

- The only match is the agent's first command, `cat rewrite-evidence/baseline/BASELINE.md`, which reads the
  clone's own copy. The file text mentions the branch name `rewrite/phase0-baseline`.
- Every tool call in both sessions was scanned for paths outside `~/mealie-wf1`. None points to the main checkout.
  The `../mealie/...` and `../../../mealie/...` hits resolve from `frontend-react/` to the clone's own backend package
  (unit locale files, `routes/admin/admin_about.py`).
- The only `git show` targets the clone's own HEAD. No history digging.
- The agent installed `playwright-core` in its scratchpad and wrote its own screenshot smoke script. It never used `frontend-e2e/`.

Lesson: a keyword grep is only a first filter. Each hit needs a human look.

## 4. Limitations of this baseline

### 4a. The Vue baseline record was visible to WF1

`aaa5a8cf6` contains both the deny rules (`.claude/settings.json`) and `rewrite-evidence/baseline/`. When WF1
was set up, only the E2E yardstick was treated as something to hide. The baseline record was not considered
(planning oversight, not a design choice).

- WF1 read `BASELINE.md` as its first action.
- What it could learn: Vue numbers (517 tests, 15.1 % coverage, 66 pages), environment tips (3.8 GiB RAM, so vitest
  `--maxWorkers=4`; run `pnpm install --frozen-lockfile` first), and one mention of "WF2".
- Visible effect: `frontend-react/vite.config.ts` sets `maxWorkers: 4`. The Vue app's vitest config has no such setting.
  No other baseline numbers are referenced later in the transcripts.
- It could not learn the yardstick, the 15 flows, or the `measure.sh` metrics.
- WF2 starts from `rewrite/phase0-baseline`, which contains the same file, so WF1 and WF2 start with at least the same information.
  The tips can only have lowered WF1's time and token use (one avoided OOM). They don't explain its output quality.

### 4b. Human messages during the run

The plan was "paste one prompt, do not intervene". The transcripts show 13 human messages after the prompt
(slash commands excluded):

| When (UTC) | Message (summary) | Kind | Effect |
|---|---|---|---|
| 09-30 03:32 | "Connection dropped, can you continue?" | Resume | None |
| 09-30 08:08 | "Continue" (after the first 70 % cap) | Resume | None |
| 09-30 09:26 | How to get back to this session after closing the CLI | Operational question | Agent explained `claude --continue`/`--resume` |
| 10-01 02:08 | How long will it still take? | Question | Agent estimated 3–4 more quota windows |
| 10-01 02:10 | "Decide yourself, but finish before 70 % of the weekly quota" | **Constraint** | Agent saved memory `wf1-weekly-budget` and planned to "only browser-smoke-test complex pages" |
| 10-01 02:58 | Tool call rejected | Interrupt | Run paused |
| 10-01 07:18 | "Continue from where you stopped" | Resume | None |
| 10-01 07:44 | Interrupt + "are you still running?" | Interrupt | None |
| 10-01 07:47 | Tool call rejected + "hand off to a new session, this one is slow" | **Context reset** | Agent committed, wrote memory `wf1-handoff` |
| 10-01 07:48–07:49 | "Stop it", "so I can `/clear` and continue?" | Operational | Agent suggested the next session's first message |
| 10-01 07:50 | `/clear`, then "Continue WF1 … read wf1-handoff … start with porting the shopping list tests" (the text the agent had suggested) | **Context reset** | Session `c9f616b7` |
| 10-01 08:56 | "Did you record total time and tokens?" | Post-completion | — |
| 10-01 08:58 | "Add that to MIGRATION_REPORT.md" | Post-completion | Commit `389f9a2e4` (report only, no code) |

What this means for the comparison:
- Most messages only restart the agent. Restarts are unavoidable on a Pro plan with a 70 % cap and do not
  steer the content.
- The **weekly-budget constraint** told the agent to economise. That may have reduced how much it verified in the
  browser in the second half (speculative: the RecipeCard regression is in a component ported earlier, on 09-30).
- The **human-initiated handoff** replaced one long context with an agent-written summary plus a fresh session.
  There was also one automatic compaction (09-30 08:49). Context-loss effects therefore can't be cleanly attributed
  to automatic compaction alone.
- None of the messages gave technical guidance, answered a design question, or revealed the yardstick.
- Process fix for next time: write down in advance the only allowed messages (e.g. exactly "continue")
  and decide beforehand how session handoffs are done.

## 5. How the backend serves `frontend-react`

- **Development:** the backend serves only `/api`. `frontend-react` runs Vite on port 3000 and proxies `/api`, `/docs`, and
  `/openapi.json` to `localhost:9000` (`vite.config.ts` → `server.proxy`). `task ui` still starts the **Vue** app.
  To try React, run `task py` plus `cd frontend-react && pnpm dev`.
- **Production:** with `PRODUCTION=true` the backend mounts `STATIC_FILES` (default `mealie/frontend/`) as the SPA
  (`mealie/app.py`, `mealie/routes/spa/__init__.py`). WF1's build is compatible: it emits `index.html`, `200.html`,
  `404.html`, and hashed assets under `_nuxt/`. A manual check with `STATIC_FILES=frontend-react/dist` returned 200 for `/`,
  `/login`, `/g/home`, `/admin/site-settings`, a `_nuxt/*.js` bundle, and `/api/app/about`. This is how
  `frontend-e2e/scripts/start-backend.sh` runs it.
- **Gap:** `Taskfile.yml` (`ui`, `ui:generate`, `py:package:copy-frontend`) and the Docker build still point at `frontend/`.
  The React build is not part of the packaging path yet. Changing it was outside the prompt's scope ("do not modify mealie/";
  the Taskfile was not mentioned).

## 6. Evidence index

| What | Where |
|---|---|
| Metrics row | `metrics.csv` → `WF1-end` |
| Run logs and raw reports | `runs/20261004T094719Z-mealie-wf1_frontend-react-WF1-end/` |
| Failure screenshots and page snapshots | `runs/…WF1-end/e2e-failures/<flow>/{test-failed-1.png,error-context.md}` |
| Playwright traces (8–10 MB each) | `study-notes/rewrite-evidence/wf1-e2e-traces/` (local, not committed) |
| Exported transcript | `study-notes/rewrite-evidence/wf1-transcript.txt` (local) |
| Usage and time | `study-notes/rewrite-evidence/usage-log.csv` (two `CAP-REACHED` rows: 09-30 17:17 and 22:17 UTC+13); agent's estimate in `MIGRATION_REPORT.md` → "Effort" |
