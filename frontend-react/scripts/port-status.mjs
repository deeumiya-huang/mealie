#!/usr/bin/env node
// Vue file → React counterpart table (PROCESS.md §1.2 mapping, exceptions in port-map.mjs).
//
//   node scripts/port-status.mjs [--domain <d>] [--all] [--json]
//
// Prints a summary per domain and every missing file (--all: every row). Also flags React files
// that contain stub words (they would fail measure.sh / the E2E health check).
// Exit 1 if any file in the selected domain(s) is missing or contains stub words.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOMAIN_NAMES, domainOf, findReact, reactPathFor, reactSrc, vueSources } from "./port-map.mjs";

const args = process.argv.slice(2);
const domainArg = args.includes("--domain") ? args[args.indexOf("--domain") + 1] : null;
const showAll = args.includes("--all");
const asJson = args.includes("--json");
if (domainArg && !DOMAIN_NAMES.includes(domainArg)) {
  console.error(`unknown domain "${domainArg}"; one of: ${DOMAIN_NAMES.join(", ")}`);
  process.exit(2);
}

const STUB = /\b(TODO|FIXME|XXX|HACK)\b|[Nn]ot implemented|[Cc]oming soon|[Ll]orem ipsum|[Pp]laceholder (page|component)/;

const rows = vueSources().map((vue) => {
  const domain = domainOf(vue);
  const expected = reactPathFor(vue);
  const found = findReact(vue);
  let status = expected === null ? "skipped" : found ? "ok" : "missing";
  if (found && STUB.test(readFileSync(join(reactSrc, found), "utf8"))) status = "stub-words";
  return { vue, domain, react: found ?? expected, status };
}).filter(r => !domainArg || r.domain === domainArg);

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
}
else {
  const summary = {};
  for (const r of rows) {
    summary[r.domain] ??= { "ok": 0, "missing": 0, "stub-words": 0, "skipped": 0 };
    summary[r.domain][r.status]++;
  }
  console.log("domain          ok  missing  stub  skipped");
  for (const [d, s] of Object.entries(summary).sort()) {
    console.log(`${d.padEnd(14)} ${String(s.ok).padStart(3)} ${String(s.missing).padStart(8)} ${String(s["stub-words"]).padStart(5)} ${String(s.skipped).padStart(8)}`);
  }
  const shown = showAll ? rows : rows.filter(r => r.status === "missing" || r.status === "stub-words");
  if (shown.length) console.log("");
  for (const r of shown) console.log(`${r.status.padEnd(10)} ${r.vue} → src/${r.react}`);
}

const bad = rows.filter(r => r.status === "missing" || r.status === "stub-words").length;
if (!asJson) console.log(`\n${rows.length} Vue files, ${bad} missing or stub${domainArg ? ` (domain ${domainArg})` : ""}`);
process.exit(bad ? 1 : 0);
