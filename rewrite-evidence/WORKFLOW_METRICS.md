# Workflow Metrics — WF1 and WF2

Filled in from `METRICS_TEMPLATE.md`. All test numbers come from `measure.sh` runs in the main checkout, using the same
yardstick (`frontend-e2e/` as of `cb8bb5dcf`, plus the route scopes/modes from `ae9317c37`, whose defaults
are the same 66 strict route checks). The raw rows are in `metrics.csv`.

## Summary Table

| Workflow | Checkpoint | Agent Tool | Model | Prompts | Agent Time | Review/Fix Time | Tokens | Build | Core Smoke | Core Strict | Extended Smoke | Extended Strict | Flows | Unit Tests | Type Errors | Interventions | Review Result |
|---|---|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Vue reference | `P0-vue-baseline` | — | — | — | — | — | — | Pass (60 s) | 34/34 | 34/34 | 32/32 | 32/32 | 15/15 | 517 passed, 0 failed, 0 skipped | 315 (`vue-tsc`) | — | — |
| WF1 Single prompt | `WF1-end` | Claude Code | Opus 5.5 | 14 | ≈5.0 h active (≈30 h wall) | TBD | 263.3M (0.93M out) | Pass (55 s) | 34/34 | 34/34 | 32/32 | 32/32 | 11/15 | 518 passed, 0 failed, 0 skipped | 0 | 13 | TBD |
| WF2 PROCESS.md-driven, parallel subagents | `WF2-end` | Claude Code | Opus 5.5 (orchestrator) + Sonnet 5.5 (porters) | 34 | ≈11.4 h active (≈51 h wall) | TBD | 381.0M (0.86M out) | Pass (13 s) | 34/34 | 34/34 | 32/32 | 32/32 | 15/15 | 769 passed, 0 failed, 0 skipped | 0 | 13 | TBD |

How the columns were filled:
- **Core/Extended Strict**: per-route results in each run's `e2e-results.json.gz`, split by the
  core list in `frontend-e2e/lib/routes.ts` (34 core, 32 extended). No re-run was needed.
- **Smoke**: smoke checks a subset of what strict checks. A route that passes strict therefore passes smoke.
  All three apps pass every strict route, so smoke was not run separately.
- **Prompts**: every message the human typed into the workflow's sessions. Slash commands (`/clear`, `/export`) and
  automatic `task-notification` messages are not counted.
- **Interventions**: messages outside the workflow's own protocol (see below).
- **Agent Time**: "active" sums the gaps under 10 minutes between transcript events. "Wall" runs from the first
  prompt to the final commit (WF1 09-30 15:58 → 10-01 21:58; WF2 10-05 20:03 → 10-07 23:09, UTC+13).
  Wall time includes the waits for the 5-hour quota to reset.
- **Tokens**: input + output + cache write + cache read, summed over every transcript in
  `~/.claude/projects/-home-deeumiya-mealie-wf{1,2}/` (including subagents), each API response counted once.
  More than 97 % is cache reads, which cost far less than other tokens. Output tokens are shown separately.
- **Review/Fix Time, Review Result**: human judgement, still to be filled in.

## WF1 - Single prompt

| Field | Value |
|---|---|
| Workflow ID | `WF1` |
| Workflow Name | Single prompt, no planned human involvement |
| Checkpoint | `end` (`rewrite/wf1-baseline` @ `389f9a2e4`, 30 commits) |
| Agent Tool | Claude Code (CLI, auto mode) |
| Model | `claude-opus-5-5`: 748 requests, no subagents |
| Prompt Count | 14 (1 task prompt + 13 follow-up messages) |
| Session Log | `~/.claude/projects/-home-deeumiya-mealie-wf1/` (2 sessions); export `study-notes/rewrite-evidence/wf1-transcript.txt` |
| Agent Run Time | ≈300 minutes active |
| Human Review/Fix Time | TBD |
| Total Tokens | 263,252,216 (input 1,496 · output 933,465 · cache write 3,431,587 · cache read 258,885,668) |
| Manual Interventions | 13 (planned: 0). 4 only restarted the agent after a disconnect or the usage cap. 3 shaped the run: the weekly-budget constraint, a human-initiated handoff to a new session, and a post-completion report addition |
| Review Result | TBD |

### Test Results

| Test Area | Result |
|---|---:|
| Build | `pass` |
| Core Routes - Smoke | `34/34` |
| Core Routes - Strict | `34/34` |
| Extended Routes - Smoke | `32/32` |
| Extended Routes - Strict | `32/32` |
| Flows | `11/15` |
| Unit Tests | `518 passed, 0 failed, 0 skipped` |
| Type Errors | `0` |

### Short Interpretation

A single prompt produced a complete, type-clean React app in which every page renders. However, 3 of the 4 failing flows share
one real regression: recipe cards navigate via `onClick` instead of being links. The fourth is a timing sensitivity in the
yardstick, and the feature itself works. The agent's own screenshot checks could not catch the regression.
The run was not fully hands-off (13 messages). Details, the isolation check and the limitations are in `WF1-EVALUATION.md`.

## WF2 - PROCESS.md-driven workflow with parallel subagents

| Field | Value |
|---|---|
| Workflow ID | `WF2` |
| Workflow Name | Plan → persistent context → sequential foundation → parallel porters → independent review |
| Checkpoint | `end` (`rewrite/wf2-orchestrated` @ `d10633fce`, 120 commits, 5 of them usage-cap WIP) |
| Agent Tool | Claude Code (CLI; P1 in plan mode, then auto mode) |
| Model | `claude-opus-5-5` 1,374 requests (orchestrator, reviewers, one porter for the recipe page); `claude-sonnet-5-5` 968 requests (porters) |
| Prompt Count | 34 (P1 prompt, "approve" at G1, 19 × "繼續", 13 other messages) |
| Session Log | `~/.claude/projects/-home-deeumiya-mealie-wf2/` (23 main sessions + subagent transcripts) |
| Agent Run Time | ≈684 minutes active |
| Human Review/Fix Time | TBD (includes the G1 plan review: P1 prompt 10-05 20:05 → approval 22:13, UTC+13) |
| Total Tokens | 380,987,831 (input 4,752 · output 862,269 · cache write 7,633,285 · cache read 372,487,525); subagents: 1,428 of 2,342 requests |
| Manual Interventions | 13 messages plus 1 shell command (planned: "繼續" and gate approvals only). They changed the process 3 times: porter `effort: high`, Opus for the recipe-page porter, and session-boundary rules (decision D41); the usage cap raised to 90 % (D47); and a recovery instruction after an API error. The rest were questions about quota, billing and logging |
| Review Result | TBD |

### Test Results

| Test Area | Result |
|---|---:|
| Build | `pass` |
| Core Routes - Smoke | `34/34` |
| Core Routes - Strict | `34/34` |
| Extended Routes - Smoke | `32/32` |
| Extended Routes - Strict | `32/32` |
| Flows | `15/15` |
| Unit Tests | `769 passed, 0 failed, 0 skipped` (108 files, 1,551 `expect(` vs 817 in Vue) |
| Type Errors | `0` |

### Short Interpretation

WF2 passed every check of the yardstick. Its own report states that all 48 Vue test files were ported with the same titles and assertions
(`scripts/test-parity.mjs`), and that it added tests on top. Using the yardstick as an acceptance gate, plus an independent
reviewer, closed the kind of gap WF1 left (WF1 was 4 flows short). That cost about 45 % more tokens and about 2.3× the active time.
The human messages were mostly about the Pro quota, not about the code. The pre-registered "繼續" protocol held,
but the cap raise and the model/effort change are deviations to report.

### Isolation check

`grep -l "mealie-wf1\|WF1-EVALUATION\|study-notes\|wf1-baseline"` matched 7 transcripts. All hits were checked by hand:
- `../mealie-wf1/...` appears only in the clone's own `rewrite-evidence/README.md` and `measure.sh` usage examples,
  which the agent read. It never accessed that folder.
- `../mealie/...` hits are the clone's own backend package.
- Twice, while answering the human's questions about usage logging, the agent tried to read
  `~/mealie/study-notes/rewrite-evidence/usage-log.csv` with Bash. Both calls were **denied** by the deny rules, so WF2
  never saw WF1's results. Note: the deny rules also stopped Bash reads, which is stronger than the plan expected.

## Caveats

- Subagent output tokens in the transcripts look low (≈53K output over 1,428 requests) and are probably undercounted.
  Total tokens are therefore a lower bound for WF2.
- One run per workflow, one project, one tool. WF1 could see the Vue baseline record; WF2 could see the yardstick by design.
- The fake `CAP-REACHED 5h=80% 7d=80%` row of 2026-10-07 13:11 in the private `usage-log.csv` came from the WF2 agent testing
  its hook. It is not real usage.
