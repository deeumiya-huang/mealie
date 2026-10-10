# WF2 prompts and human protocol

## P1 planning prompt

Pasted verbatim into the first WF2 session (Claude Code CLI, **plan mode**) in an isolated clone of branch
`rewrite/wf2-orchestrated`, which starts at `cb8bb5dcf` (yardstick included, no WF1 results). The goal, constraints
and done criteria repeat the WF1 prompt (`WF1-prompt.md`) so both workflows aim at the same result.
The agent's answer became `PROCESS.md` on that branch.

```text
You are the orchestrator for workflow WF2: migrate the Mealie frontend from Nuxt 4 / Vue 3 /
Vuetify 4 to React with a planned, phased process. This first session is planning only (P1):
do not write application code yet.

Goal (identical to the comparison baseline; do not change it)
- Current app: frontend/ (Nuxt 4 with ssr:false, Vue 3 <script setup>, Vuetify 4,
  @nuxtjs/i18n, Nuxt auto-imports). Backend is FastAPI in mealie/.
- frontend/app/lib/api/ (API clients + generated types) has no Vue dependency: reuse it.
- New app in frontend-react/: Vite + React 19 + TypeScript (strict; no `any` unless
  unavoidable and commented) + React Router (SPA) + MUI + react-i18next.
- Same URL routes as frontend/app/pages/, same backend API, same UI strings (load the
  existing frontend/app/lang/messages/*.json; do not edit any locale file).
- Composables -> hooks, Vuetify -> MUI, middleware -> route guards, plugins -> providers.
- Build output must be a static SPA the backend can serve like the current `nuxt generate` output.
- Port the existing Vitest tests to the React equivalents. Never delete a test or weaken
  an assertion to make it pass; if one cannot be ported, mark it skipped with a reason.
- Do not modify frontend/, mealie/, frontend-e2e/ or rewrite-evidence/measure.sh.
  Do not push, open PRs, or publish anything.
- Done means: in frontend-react/, pnpm install, tsc --noEmit, lint, vitest run, and build all
  succeed; every page in frontend/app/pages/ has a real (non-placeholder) React implementation;
  ./rewrite-evidence/measure.sh --app frontend-react --label WF2-final passes all routes and
  flows; frontend-react/MIGRATION_REPORT.md lists what was converted, what was not, known gaps,
  and the final output of each command above.

Acceptance tools you may use (read-only): frontend-e2e/ (Playwright: 66 routes + 15 key flows)
and rewrite-evidence/measure.sh. See rewrite-evidence/README.md.

Environment limits
- WSL2 with 3.8 GiB RAM: run vitest with --maxWorkers=4; at most 2 heavy jobs (build, tests,
  E2E) at the same time.
- Claude Pro plan. A hook blocks tool calls once the 5-hour or weekly quota reaches 70%. When
  that happens: commit work in progress, update PROCESS.md, and end the session.
- Log milestones with: python3 ~/.claude/hooks/usage_log.py "<label>" --note "<short note>"

How this workflow runs
After this session the human will, apart from review gates, only start sessions and type
"繼續". So decide everything now and write it down in PROCESS.md (repo root), precise enough
that a fresh session with no memory of this conversation can execute the next step correctly.

Your P1 task: analyze the codebase (dependency order lib/api -> composables -> global
components -> domain components -> pages; Vuetify usage; Nuxt auto-imports; existing tests;
how the yardstick checks pages and flows) and propose the full PROCESS.md, containing:
1. Conventions and mapping tables (Vuetify -> MUI, ref/computed/watch -> hooks, auto-imports,
   i18n, routing and guards) and the rules every agent must follow.
2. An ordered list of steps with IDs. For each step: goal, input files, executor (main
   session or which subagent type), parallel group, done criteria as runnable commands,
   commit prefix ([WF2-<step-id>] ), usage-log label, and whether it ends the session.
3. Phases: P2 bootstrap (write PROCESS.md, a short "how to continue" section in the root
   CLAUDE.md, frontend-react/CLAUDE.md, .claude/agents/*.md, quality-gate hooks such as
   tsc/eslint after edits and a Stop hook that blocks claiming completion while checks fail;
   the Stop hook must still allow planned session-boundary stops and usage-cap stops)
   -> P3 sequential foundation (scaffold, API clients, auth, i18n, layouts, router with one
   routes file per domain, Base* components) -> P4 parallel domain porting -> P5 integration
   and independent review -> final measurement and report.
4. Subagent rules, so the main session spawns subagents on its own when a step calls for it:
   which steps use them; agent definitions (porter: model sonnet, worktree isolation, runs in
   background; reviewer: read-only tools, fresh context, never reviews its own work); at most
   2 running at once; porters run only their domain's tsc/vitest, while the main session runs
   full builds and E2E; the brief template each subagent receives; how results are merged and
   verified; and how an interrupted subagent task is resumed in a later session (record the
   task and its worktree branch in PROCESS.md before spawning).
5. Session protocol: what to do on "繼續" (read the status section, continue with the next
   unfinished step); when to end a session (marked step boundaries, usage cap); how to hand
   off (update the status section, commit, log usage, tell the human to run /clear and type
   繼續). Prefer this over relying on automatic context compaction.
6. Review gates: G1 is this plan. Add at most one more gate and state exactly what the human
   checks there. Outside gates, never wait for the human.
7. A decision log section: when unsure, decide, record the decision and the reason, and go on.

Present the plan for approval. After approval: log "WF2-P1-plan-approved", do P2, commit with
"[WF2-P2] ", log "WF2-P2-context-ready", then stop and tell the human what to type next.
```

## Messages the human was allowed to send after P1 (registered before the run)

| Message | When |
|---|---|
| "繼續" ("continue") | First message of every session; after a usage-cap stop, once the quota has reset |
| Review comments, "approve" | Only at gates G1 (the plan) and G2 (the foundation) |
| `/clear`, `/export`, `/usage`, `/cost`, `/context` | Any time; not counted as intervention |
| Anything else | Counted as an intervention |

The messages actually sent are listed in `../WORKFLOW_METRICS.md` and the transcripts in `../transcripts/wf2/`.
