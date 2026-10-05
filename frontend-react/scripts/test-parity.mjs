#!/usr/bin/env node
// Per Vue test file: does the React counterpart exist (mirrored path, §1.9), is the number of
// tests equal and the number of `expect(` calls at least the same?
//
//   node scripts/test-parity.mjs [--all] [--json]
//
// Exit 1 if a ported test file has fewer tests or expects than its Vue source, or (with --all) if
// any Vue test file has no React counterpart yet. Skipped tests (`.skip`) are listed.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findReact, reactPathFor, reactSrc, vueApp, vueTests } from "./port-map.mjs";

const args = process.argv.slice(2);
const requireAll = args.includes("--all");
const asJson = args.includes("--json");

const TEST_RE = /(?<![.\w])(?:test|it)(?:\.(?:skip|only|todo|concurrent|fails))?(?:\.each\s*(?:\([^)]*\)|`[^`]*`))?\s*\(/g;
const SKIP_RE = /(?<![.\w])(?:test|it|describe)\.skip\s*\(/g;
const EXPECT_RE = /expect(\.[a-zA-Z]+)?\(/g;

function count(path) {
  const text = readFileSync(path, "utf8");
  return {
    tests: (text.match(TEST_RE) || []).length,
    expects: (text.match(EXPECT_RE) || []).length,
    skipped: (text.match(SKIP_RE) || []).length,
  };
}

const rows = vueTests().map((vue) => {
  const v = count(join(vueApp, vue));
  const found = findReact(vue);
  if (!found) return { vue, react: reactPathFor(vue), status: "missing", vueTests: v.tests, vueExpects: v.expects };
  const r = count(join(reactSrc, found));
  let status = "ok";
  if (r.tests < v.tests) status = "test-drop";
  else if (r.expects < v.expects) status = "expect-drop";
  return {
    vue, react: found, status, vueTests: v.tests, vueExpects: v.expects,
    reactTests: r.tests, reactExpects: r.expects, reactSkipped: r.skipped,
  };
});

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
}
else {
  for (const r of rows) {
    const react = r.status === "missing" ? "-" : `${r.reactTests}/${r.reactExpects}${r.reactSkipped ? ` (${r.reactSkipped} skipped)` : ""}`;
    console.log(`${r.status.padEnd(11)} ${`${r.vueTests}/${r.vueExpects}`.padStart(7)} → ${react.padEnd(16)} ${r.vue}`);
  }
  const ported = rows.filter(r => r.status !== "missing");
  const sum = (list, key) => list.reduce((n, r) => n + (r[key] ?? 0), 0);
  console.log(`\nported ${ported.length}/${rows.length} test files: React tests ${sum(ported, "reactTests")}/${sum(ported, "vueTests")}, expects ${sum(ported, "reactExpects")}/${sum(ported, "vueExpects")}, skipped ${sum(ported, "reactSkipped")}`);
  console.log(`Vue total: ${sum(rows, "vueTests")} tests, ${sum(rows, "vueExpects")} expects in ${rows.length} files`);
  console.log("columns: status, Vue tests/expects → React tests/expects");
}

const drops = rows.filter(r => r.status === "test-drop" || r.status === "expect-drop").length;
const missing = rows.filter(r => r.status === "missing").length;
process.exit(drops || (requireAll && missing) ? 1 : 0);
