# WF1 prompt (single prompt, baseline)

Pasted verbatim as the first and only task message of a fresh Claude Code CLI session (auto mode) in an isolated
clone of branch `rewrite/wf1-baseline`, which starts at `aaa5a8cf6`, the commit before the E2E yardstick existed.
How the yardstick was kept out of that clone: `../README.md` → "Keeping the yardstick away from a workflow".

```text
Migrate the Mealie frontend from Nuxt 4 / Vue 3 / Vuetify 4 to React. Work fully
autonomously: no human will answer questions, so make reasonable decisions and record them.

Context
- Current app: frontend/ (Nuxt 4 with ssr:false, Vue 3 <script setup>, Vuetify 4,
  @nuxtjs/i18n, Nuxt auto-imports). Backend is FastAPI in mealie/.
- frontend/app/lib/api/ (API clients + generated types) has no Vue dependency: reuse it.

Target
- New app in frontend-react/: Vite + React 19 + TypeScript (strict; no `any` unless
  unavoidable and commented) + React Router (SPA) + MUI + react-i18next.
- Same URL routes as frontend/app/pages/, same backend API, same UI strings (load the
  existing frontend/app/lang/messages/*.json; do not edit any locale file).
- Composables -> hooks, Vuetify -> MUI, middleware -> route guards, plugins -> providers.
- Build output must be a static SPA the backend can serve like the current `nuxt generate` output.
- Port the existing Vitest tests to the React equivalents. Never delete a test or weaken
  an assertion to make it pass; if one cannot be ported, mark it skipped with a reason.

Constraints
- Do not modify frontend/ or mealie/. Do not push, open PRs, or publish anything.
- Commit after each meaningful unit of work with message prefix "[WF1] ".

Done means
- In frontend-react/: pnpm install, tsc --noEmit, lint, vitest run, and build all succeed.
- Every page in frontend/app/pages/ has a real (non-placeholder) React implementation.
- Write frontend-react/MIGRATION_REPORT.md listing what was converted, what was not,
  known gaps, and the final output of each command above.
```
