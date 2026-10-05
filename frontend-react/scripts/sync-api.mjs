#!/usr/bin/env node
// Copies the generated API types (../frontend/app/lib/api/types/*.ts that start with the codegen
// header `/* tslint:disable */`) into src/lib/api/types (PROCESS.md decisions D1, D21) and rewrites
// the Nuxt `~/` alias to `@/`. Never hand-edit those files; re-run this script instead. The
// hand-written API clients and the two hand-written type files (activity.ts, non-generated.ts) are
// ported code in src/lib/api and are not touched by this script.
//
//   node scripts/sync-api.mjs [--check]     --check: exit 1 if the generated types differ from a fresh copy
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("..", import.meta.url));
const source = join(here, "../frontend/app/lib/api/types");
const target = join(here, "src/lib/api/types");
const GENERATED_HEADER = "/* tslint:disable */";
const check = process.argv.includes("--check");

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function rewrite(text) {
  return text.replace(/(from\s+["']|import\(\s*["'])~\//g, "$1@/");
}

const isGenerated = file => file.endsWith(".ts") && readFileSync(file, "utf8").startsWith(GENERATED_HEADER);

function copyTo(dest) {
  mkdirSync(dest, { recursive: true });
  for (const file of walk(dest).filter(isGenerated)) rmSync(file);
  for (const file of walk(source).filter(isGenerated)) {
    const out = join(dest, relative(source, file));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, rewrite(readFileSync(file, "utf8")));
  }
}

if (!existsSync(source)) {
  console.error(`missing ${source}`);
  process.exit(2);
}

if (check) {
  const tmp = mkdtempSync(join(tmpdir(), "sync-api-"));
  copyTo(tmp);
  const fresh = new Map(walk(tmp).map(f => [relative(tmp, f), readFileSync(f, "utf8")]));
  const current = new Map(walk(target).filter(isGenerated).map(f => [relative(target, f), readFileSync(f, "utf8")]));
  const diff = [...new Set([...fresh.keys(), ...current.keys()])].filter(k => fresh.get(k) !== current.get(k));
  rmSync(tmp, { recursive: true, force: true });
  if (diff.length) {
    console.error(`src/lib/api/types is out of sync (${diff.length} files), e.g.:\n  ${diff.slice(0, 10).join("\n  ")}`);
    process.exit(1);
  }
  console.log("src/lib/api/types is in sync");
}
else {
  copyTo(target);
  console.log(`copied ${walk(target).filter(isGenerated).length} generated files to ${relative(here, target)}`);
}
