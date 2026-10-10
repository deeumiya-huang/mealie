#!/usr/bin/env bash
# Measure one frontend at the current checkout and append results to rewrite-evidence/metrics.csv.
#
#   rewrite-evidence/measure.sh [--app DIR] [--label TEXT]
#     [--route-scope all|core|extended] [--route-check strict|smoke] [--skip-e2e]
#
# --app is a directory name inside this repo (frontend, frontend-react) or a path to an app in another
# worktree (e.g. ../mealie-wf1/frontend-react). The latter lets a workflow's branch stay free of the
# yardstick: the E2E suite and this script always come from the checkout the script lives in.
#
# Works for both the Vue reference (frontend/, Nuxt) and a React rewrite (any dir with a Vite-style
# package.json). Steps run one after another, never in parallel: the dev box has 3.8 GB of RAM.
#
#   install  pnpm install --frozen-lockfile (so pnpm never auto-installs mid-step)
#   build    Vue: pnpm generate / React: pnpm build            -> build_ok, build_seconds
#   unit     vitest run --maxWorkers=4 (JSON reporter)         -> unit_passed/failed/skipped
#   lint     eslint . (JSON formatter)                         -> lint_errors/warnings
#   types    Vue: vue-tsc --noEmit / React: tsc                -> tsc_errors
#   static   grep over the app's source                        -> any_count, todo_count, expect_count
#   e2e      frontend-e2e/ against the fresh build             -> routes_passed/N, flows_passed/N
#
# Logs and raw reports for each run go to rewrite-evidence/runs/<run-id>/.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="frontend"
LABEL=""
SKIP_E2E=0
ROUTE_SCOPE="all"
ROUTE_CHECK="strict"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app) APP="$2"; shift 2 ;;
    --label) LABEL="$2"; shift 2 ;;
    --route-scope) ROUTE_SCOPE="$2"; shift 2 ;;
    --route-check) ROUTE_CHECK="$2"; shift 2 ;;
    --skip-e2e) SKIP_E2E=1; shift ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

case "$ROUTE_SCOPE" in
  all|core|extended) ;;
  *) echo "unknown route scope: $ROUTE_SCOPE (use all, core, or extended)" >&2; exit 2 ;;
esac
case "$ROUTE_CHECK" in
  strict|smoke) ;;
  *) echo "unknown route check: $ROUTE_CHECK (use strict or smoke)" >&2; exit 2 ;;
esac

if [[ -d "$REPO/$APP" && "$APP" != /* && "$APP" != .* ]]; then
  APP_DIR="$REPO/$APP"
else
  APP_DIR="$(realpath "$APP" 2>/dev/null)"
fi
[[ -f "$APP_DIR/package.json" ]] || { echo "no package.json in ${APP_DIR:-$APP}" >&2; exit 2; }
APP_REPO="$(git -C "$APP_DIR" rev-parse --show-toplevel)"
# How the app is named in the CSV: path relative to its own checkout, prefixed by that checkout's
# directory name when it isn't this one (mealie-wf1/frontend-react).
APP_NAME="${APP_DIR#"$APP_REPO"/}"
[[ "$APP_REPO" != "$REPO" ]] && APP_NAME="$(basename "$APP_REPO")/$APP_NAME"

if [[ -f "$APP_DIR/nuxt.config.ts" ]]; then
  KIND="vue"; SRC_DIR="$APP_DIR/app"
else
  KIND="react"; SRC_DIR="$APP_DIR/src"
fi

CSV="$REPO/rewrite-evidence/metrics.csv"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-${APP_NAME//\//_}${LABEL:+-${LABEL//[^A-Za-z0-9._-]/_}}"
OUT="$REPO/rewrite-evidence/runs/$RUN_ID"
TOOLS="$REPO/rewrite-evidence/.tools"
mkdir -p "$OUT"
RUN_START=$(date +%s)
NOTES=()

log() { echo "[measure $(date +%H:%M:%S)] $*"; }

# run_step NAME TIMEOUT_SECONDS CMD... : runs CMD inside the app dir, logs to $OUT/NAME.log.
# Sets STEP_RC and STEP_SECS.
run_step() {
  local name="$1" limit="$2"; shift 2
  local start; start=$(date +%s)
  log "$name: $*"
  (cd "$APP_DIR" && timeout "$limit" "$@") > "$OUT/$name.log" 2>&1
  STEP_RC=$?
  STEP_SECS=$(( $(date +%s) - start ))
  log "$name: exit=$STEP_RC (${STEP_SECS}s)"
}

json_get() { # json_get FILE JS_EXPRESSION_ON_d
  node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); console.log($2)" "$1" 2>/dev/null
}

# ------------------------------------------------------------------------------------------------ git
# Of the measured app's checkout, not of the yardstick's.
BRANCH="$(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD)"
COMMIT="$(git -C "$APP_DIR" rev-parse --short HEAD)"
DIRTY=0
[[ -n "$(git -C "$APP_DIR" status --porcelain -- . 2>/dev/null)" ]] && DIRTY=1

# ------------------------------------------------------------------------------------------------ install
run_step install 1200 pnpm install --frozen-lockfile
[[ $STEP_RC -ne 0 ]] && NOTES+=("install failed")

# ------------------------------------------------------------------------------------------------ build
if [[ "$KIND" == "vue" ]]; then
  run_step build 1800 pnpm generate
else
  run_step build 1800 pnpm build
fi
BUILD_SECONDS=$STEP_SECS
STATIC_DIR="$APP_DIR/dist"
BUILD_OK=0
[[ $STEP_RC -eq 0 && -f "$STATIC_DIR/index.html" ]] && BUILD_OK=1

# ------------------------------------------------------------------------------------------------ unit tests
UNIT_PASSED=NA; UNIT_FAILED=NA; UNIT_SKIPPED=NA
run_step unit 1800 pnpm exec vitest run --maxWorkers=4 --reporter=json --outputFile="$OUT/vitest.json"
if [[ -s "$OUT/vitest.json" ]]; then
  UNIT_PASSED=$(json_get "$OUT/vitest.json" "d.numPassedTests")
  UNIT_FAILED=$(json_get "$OUT/vitest.json" "d.numFailedTests")
  UNIT_SKIPPED=$(json_get "$OUT/vitest.json" "d.numPendingTests + d.numTodoTests")
  # A suite that fails to load counts as failed tests nowhere else, so surface it.
  SUITE_ERRORS=$(json_get "$OUT/vitest.json" "d.testResults.filter(r => r.status === 'failed' && r.assertionResults.length === 0).length")
  [[ "${SUITE_ERRORS:-0}" != "0" ]] && NOTES+=("$SUITE_ERRORS test files failed to load")
  gzip -f "$OUT/vitest.json"
else
  NOTES+=("vitest produced no report (exit $STEP_RC)")
fi

# ------------------------------------------------------------------------------------------------ lint
LINT_ERRORS=NA; LINT_WARNINGS=NA
run_step lint 1200 pnpm exec eslint . --format json --output-file "$OUT/eslint.json"
if [[ -s "$OUT/eslint.json" ]]; then
  LINT_ERRORS=$(json_get "$OUT/eslint.json" "d.reduce((n, f) => n + f.errorCount, 0)")
  LINT_WARNINGS=$(json_get "$OUT/eslint.json" "d.reduce((n, f) => n + f.warningCount, 0)")
  gzip -f "$OUT/eslint.json"
else
  NOTES+=("eslint produced no report (exit $STEP_RC)")
fi

# ------------------------------------------------------------------------------------------------ types
if [[ "$KIND" == "vue" ]]; then
  # vue-tsc is not a dependency of the Vue app (CI never type-checks it). Pin the versions the
  # baseline used, in a private tool dir, so every Vue measurement uses the same checker.
  if [[ ! -x "$TOOLS/vuetsc/node_modules/.bin/vue-tsc" ]]; then
    log "types: installing vue-tsc@2.2.0 + typescript@5.9.3 into $TOOLS/vuetsc"
    mkdir -p "$TOOLS/vuetsc"
    (cd "$TOOLS/vuetsc" && echo '{"private":true}' > package.json \
      && npm install --no-audit --no-fund --save-exact vue-tsc@2.2.0 typescript@5.9.3) > "$OUT/types-install.log" 2>&1
  fi
  run_step types 1200 "$TOOLS/vuetsc/node_modules/.bin/vue-tsc" --noEmit
elif grep -q '"references"' "$APP_DIR/tsconfig.json" 2>/dev/null; then
  run_step types 1200 pnpm exec tsc -b --pretty false
else
  run_step types 1200 pnpm exec tsc --noEmit --pretty false
fi
TSC_ERRORS=$(grep -cE "error TS[0-9]+" "$OUT/types.log")
if [[ "$TSC_ERRORS" == "0" && $STEP_RC -ne 0 ]]; then
  TSC_ERRORS=NA
  NOTES+=("type checker crashed (exit $STEP_RC)")
fi

# ------------------------------------------------------------------------------------------------ static counts
# Hand-written source only: generated API types are excluded, tests are included.
src_grep() { # src_grep EXTENDED_REGEX [extra grep flags]
  grep -rEo "${@:2}" --include='*.ts' --include='*.tsx' --include='*.vue' --include='*.js' --include='*.jsx' \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.nuxt --exclude-dir=.output \
    "$1" "$SRC_DIR" 2>/dev/null | grep -v '/lib/api/types/' | wc -l
}
ANY_COUNT=$(src_grep ':\s*any\b|\bas\s+any\b|<any>|\bany\[\]')
TODO_COUNT=$(src_grep '\b(TODO|FIXME|XXX|HACK)\b|[Nn]ot implemented|[Cc]oming soon|[Ll]orem ipsum|[Pp]laceholder (page|component)')
EXPECT_COUNT=$(grep -rEo 'expect(\.[a-zA-Z]+)?\(' --include='*.test.*' --include='*.spec.*' \
  --exclude-dir=node_modules --exclude-dir=dist "$APP_DIR" 2>/dev/null | wc -l)
TEST_FILES=$(find "$APP_DIR" -path "$APP_DIR/node_modules" -prune -o -type f \( -name '*.test.*' -o -name '*.spec.*' \) -print | wc -l)

# ------------------------------------------------------------------------------------------------ e2e
ROUTES_PASSED=NA; ROUTES_TOTAL=NA; FLOWS_PASSED=NA; FLOWS_TOTAL=NA
if [[ $SKIP_E2E -eq 1 ]]; then
  NOTES+=("e2e skipped")
elif [[ $BUILD_OK -ne 1 ]]; then
  # Nothing can be served, so nothing passes.
  ROUTES_PASSED=0; FLOWS_PASSED=0
  NOTES+=("no build: e2e counted as 0")
else
  E2E_DIR="$REPO/frontend-e2e"
  (cd "$E2E_DIR" && pnpm install --frozen-lockfile) > "$OUT/e2e-install.log" 2>&1
  start=$(date +%s)
  log "e2e: playwright against $STATIC_DIR"
  (cd "$E2E_DIR" && E2E_STATIC_DIR="$STATIC_DIR" E2E_ROUTE_SCOPE="$ROUTE_SCOPE" E2E_ROUTE_CHECK="$ROUTE_CHECK" timeout 3600 pnpm exec playwright test) \
    > "$OUT/e2e.log" 2>&1
  log "e2e: exit=$? ($(( $(date +%s) - start ))s)"
  if [[ -s "$E2E_DIR/test-results/results.json" ]]; then
    cp "$E2E_DIR/test-results/results.json" "$OUT/e2e-results.json"
    read -r ROUTES_PASSED ROUTES_TOTAL FLOWS_PASSED FLOWS_TOTAL < <(node -e '
      const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      const specs = [];
      const walk = s => { (s.specs || []).forEach(x => specs.push(x)); (s.suites || []).forEach(walk); };
      d.suites.forEach(walk);
      const count = tag => {
        const mine = specs.filter(s => s.title.startsWith(tag));
        return [mine.filter(s => s.ok && s.tests.every(t => t.status === "expected")).length, mine.length];
      };
      console.log([...count("[route]"), ...count("[flow]")].join(" "));
    ' "$OUT/e2e-results.json")
    gzip -f "$OUT/e2e-results.json"
  else
    ROUTES_PASSED=0; FLOWS_PASSED=0
    NOTES+=("e2e produced no report")
  fi
fi

# ------------------------------------------------------------------------------------------------ row
TIMESTAMP_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
HEADER="timestamp_utc,label,app,branch,commit,dirty,route_scope,route_check,routes_passed,routes_total,flows_passed,flows_total,tsc_errors,lint_errors,lint_warnings,unit_passed,unit_failed,unit_skipped,build_ok,build_seconds,any_count,todo_count,expect_count,test_files,duration_seconds,run_id,notes"
[[ -s "$CSV" ]] || echo "$HEADER" > "$CSV"

csv_field() { local v="${1//\"/\"\"}"; [[ "$v" == *[,\"]* ]] && v="\"$v\""; printf '%s' "$v"; }
NOTE_TEXT="$(IFS=';'; echo "${NOTES[*]:-}")"
ROW=(
  "$TIMESTAMP_UTC" "$(csv_field "$LABEL")" "$APP_NAME" "$BRANCH" "$COMMIT" "$DIRTY" "$ROUTE_SCOPE" "$ROUTE_CHECK"
  "$ROUTES_PASSED" "$ROUTES_TOTAL" "$FLOWS_PASSED" "$FLOWS_TOTAL"
  "$TSC_ERRORS" "$LINT_ERRORS" "$LINT_WARNINGS"
  "$UNIT_PASSED" "$UNIT_FAILED" "$UNIT_SKIPPED"
  "$BUILD_OK" "$BUILD_SECONDS" "$ANY_COUNT" "$TODO_COUNT" "$EXPECT_COUNT" "$TEST_FILES"
  "$(( $(date +%s) - RUN_START ))" "$RUN_ID" "$(csv_field "$NOTE_TEXT")"
)
(IFS=','; echo "${ROW[*]}") >> "$CSV"

echo
IFS=',' read -r -a KEYS <<< "$HEADER"
for i in "${!KEYS[@]}"; do printf '  %s = %s\n' "${KEYS[$i]}" "${ROW[$i]}"; done
echo "  -> appended to $CSV"
