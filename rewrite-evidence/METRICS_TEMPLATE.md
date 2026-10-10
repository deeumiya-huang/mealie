# Workflow Metrics Template

## Summary Table

| Workflow | Checkpoint | Agent Tool | Model | Prompts | Agent Time | Review/Fix Time | Tokens | Build | Core Smoke | Core Strict | Extended Smoke | Extended Strict | Flows | Unit Tests | Type Errors | Interventions | Review Result |
|---|---|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| WF1 One-shot migration | End | Codex | model-name | 1 | 42m | 80m | 220000 | Fail | 18/30 | 8/30 | 6/25 | 2/25 | 0/15 | 0 passed, 12 failed, 0 skipped | 48 | 5 | Partial |


## Workflow Detail Template

Copy this section for each workflow/checkpoint.

### WFx - Workflow Name

| Field | Value |
|---|---|
| Workflow ID | `WFx` |
| Workflow Name | `...` |
| Checkpoint | `baseline` / `phase-1` / `end` |
| Agent Tool | `Codex` / `Claude Code` / `Cursor` |
| Model | `...` |
| Prompt Count | `...` |
| Session Log | `rewrite-evidence/session-logs/...` |
| Agent Run Time | `... minutes` |
| Human Review/Fix Time | `... minutes` |
| Total Tokens | `...` / `NA` |
| Manual Interventions | `...` |
| Review Result | `accept` / `partial` / `reject` |

### Test Results

| Test Area | Result |
|---|---:|
| Build | `pass` / `fail` |
| Core Routes - Smoke | `.../...` |
| Core Routes - Strict | `.../...` |
| Extended Routes - Smoke | `.../...` |
| Extended Routes - Strict | `.../...` |
| Flows | `.../...` |
| Unit Tests | `... passed, ... failed, ... skipped` |
| Type Errors | `...` |

### Short Interpretation

Write 2-4 sentences explaining what this measurement shows.

Example:

> The one-shot workflow produced a large amount of React code quickly, but the build failed and only a small number of core smoke routes passed. Most failures came from missing routing and incompatible assumptions about the existing Nuxt/Vue structure. This suggests that a single high-level prompt is useful as a baseline but not sufficient for a controlled framework migration.
