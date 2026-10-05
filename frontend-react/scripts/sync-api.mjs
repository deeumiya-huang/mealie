#!/usr/bin/env node
// Copies ../frontend/app/lib/api into src/lib/api (PROCESS.md decision D1) and rewrites the Nuxt
// `~/` alias to `@/`. The copy is replaced wholesale: never hand-edit src/lib/api (types/ are
// generated upstream by `task dev:generate`); re-run this script instead.
//
//   node scripts/sync-api.mjs [--check]     --check: exit 1 if src/lib/api differs from a fresh copy
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("..", import.meta.url));
const source = join(here, "../frontend/app/lib/api");
const target = join(here, "src/lib/api");
const check = process.argv.includes("--check");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function rewrite(text) {
  return text.replace(/(from\s+["']|import\(\s*["'])~\//g, "$1@/");
}

function copyTo(dest) {
  rmSync(dest, { recursive: true, force: true });
  cpSync(source, dest, { recursive: true });
  for (const file of walk(dest)) {
    if (/\.(ts|tsx|js|mjs)$/.test(file)) {
      const text = readFileSync(file, "utf8");
      const out = rewrite(text);
      if (out !== text) writeFileSync(file, out);
    }
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
  const current = existsSync(target) ? new Map(walk(target).map(f => [relative(target, f), readFileSync(f, "utf8")])) : new Map();
  const diff = [...new Set([...fresh.keys(), ...current.keys()])].filter(k => fresh.get(k) !== current.get(k));
  rmSync(tmp, { recursive: true, force: true });
  if (diff.length) {
    console.error(`src/lib/api is out of sync (${diff.length} files), e.g.:\n  ${diff.slice(0, 10).join("\n  ")}`);
    process.exit(1);
  }
  console.log("src/lib/api is in sync");
}
else {
  copyTo(target);
  console.log(`copied ${walk(target).length} files to ${relative(here, target)}`);
}
