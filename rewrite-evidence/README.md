# Rewrite evidence

Shared measurement setup for comparing rewrite workflows of the Mealie frontend (Vue → React).
Everything here comes from branch `rewrite/phase0-baseline`; every workflow branch starts from it.

| Path | What |
|---|---|
| `baseline/BASELINE.md` | Numbers for the Vue app before any rewrite |
| `measure.sh` | Measures one frontend and appends a row to `metrics.csv` |
| `metrics.csv` | One row per measurement (row 0 = Vue baseline) |
| `runs/<run-id>/` | Logs and raw reports of each measurement (`e2e-failures/` added by hand when a run is analysed) |
| `WF1-EVALUATION.md` | Analysis of the WF1 (single prompt) result, its isolation check and its limitations |
| `../frontend-e2e/` | The E2E yardstick (66 routes + 15 flows), see its README |

## One-time setup (per machine)

Run from the repo root. The first three are the normal Mealie dev setup.

```bash
uv sync                                                   # backend deps (the E2E suite runs the real backend)
(cd frontend && pnpm install --frozen-lockfile)
(cd frontend-e2e && pnpm install --frozen-lockfile)
(cd frontend-e2e && pnpm exec playwright install chromium)
# Linux/WSL only, if Chromium complains about missing libraries (needs sudo; Node via fnm/nvm needs PATH kept):
sudo env "PATH=$PATH" npx --yes playwright install-deps chromium
```

## Measuring

Close other heavy jobs first (builds, test runs, other agents' builds): the steps are memory-hungry
and run one after another on purpose. Port 9091 must be free. A run takes about 8 minutes.

```bash
# The Vue reference
./rewrite-evidence/measure.sh --app frontend --label my-label

# A rewrite in this checkout
./rewrite-evidence/measure.sh --app frontend-react --label WF2-P3-foundation-done

# A rewrite in another worktree (that branch doesn't need to contain the yardstick)
./rewrite-evidence/measure.sh --app ../mealie-wf1/frontend-react --label WF1-end

# Faster, without E2E
./rewrite-evidence/measure.sh --app frontend --label quick --skip-e2e
```

At the end it prints every column and appends the row to `metrics.csv`. The `branch`/`commit`/`dirty`
columns describe the measured app's checkout. `dirty=1` means the app had uncommitted changes: commit
before measuring a checkpoint.

A trial run you don't want to keep: `git checkout rewrite-evidence/metrics.csv` and delete its
`runs/<run-id>/` directory.

### Columns

| Column | Meaning |
|---|---|
| `routes_passed/routes_total` | E2E tier 1: pages that render real content without errors (out of 66) |
| `flows_passed/flows_total` | E2E tier 2: key user journeys that work end to end |
| `tsc_errors` | Type errors (Vue: `vue-tsc` 2.2.0 pinned in `.tools/`; React: `tsc`) |
| `lint_errors`, `lint_warnings` | `eslint .` in the app dir |
| `unit_passed/failed/skipped` | `vitest run --maxWorkers=4` |
| `build_ok`, `build_seconds` | Vue: `pnpm generate`; React: `pnpm build`. Both must produce `dist/index.html` |
| `any_count` | `: any`, `as any`, `<any>`, `any[]` in hand-written source (generated API types excluded) |
| `todo_count` | TODO/FIXME/XXX/HACK, "not implemented", "coming soon", lorem ipsum |
| `expect_count`, `test_files` | `expect(` calls and test files: a drop means tests were weakened or deleted |
| `notes` | Anything that went wrong (e.g. no build → E2E counted as 0) |

## Only the E2E suite

```bash
(cd frontend && pnpm generate)          # or build the React app
cd frontend-e2e
pnpm exec playwright test                                   # against ../frontend/dist
E2E_STATIC_DIR=../frontend-react/dist pnpm exec playwright test
pnpm exec playwright show-report                            # HTML report of the last run
```

## Keeping the yardstick away from a workflow

If a workflow's agent must not see the tests (e.g. a "single prompt, no help" baseline), `git rm` in
its branch is not enough: the files stay in history, and a worktree shares the whole object database
with this checkout. Instead, branch from the commit *before* the yardstick was added and give the
workflow its own clone that contains only that branch:

```bash
git branch rewrite/wf1-baseline aaa5a8cf6          # baseline + deny rules, no frontend-e2e/ or measure.sh
# Note: this commit still contains rewrite-evidence/baseline/, and WF1 read it first thing (see WF1-EVALUATION.md §4a).
# To hide every evaluation file, start from a commit that has only the deny rules.
git clone --no-local --single-branch --branch rewrite/wf1-baseline . ../mealie-wf1
git -C ../mealie-wf1 remote remove origin
# --no-local matters: a plain local clone hardlinks the whole object store, so the yardstick's
# blobs would still be readable with `git cat-file` in the new clone.
# ...run the workflow in ../mealie-wf1, then from this checkout:
git fetch ../mealie-wf1 rewrite/wf1-baseline:rewrite/wf1-baseline
./rewrite-evidence/measure.sh --app ../mealie-wf1/frontend-react --label WF1-end
```
