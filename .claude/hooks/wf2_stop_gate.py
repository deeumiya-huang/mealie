#!/usr/bin/env python3
"""WF2 Stop hook: don't let the main session stop (claim completion) while checks fail.

Allows the stop when any of these hold:
  a) Pro usage >= cap (same snapshot logic as ~/.claude/hooks/usage_guard.py) — usage-cap stops;
  b) not a WF2 checkout, or frontend-react/package.json or its node_modules is missing;
  c) PROCESS.md §9 says `state: blocked` and the working tree is clean;
  d) tsc --noEmit and eslint pass in frontend-react/ and the tree is clean
     (planned session-boundary stops pass this way: steps end only after checks + commit);
  e) it already blocked 3 times in a row (loop protection; warns via systemMessage).
Otherwise blocks with the first error lines. PROCESS.md §3 P2.
"""
import json
import os
import re
import subprocess
import sys
import time

SNAPSHOT = os.environ.get("USAGE_SNAPSHOT", os.path.expanduser("~/.claude/usage-snapshot.json"))
CAP = float(os.environ.get("USAGE_CAP_PCT", "70"))
MAX_BLOCKS = 3
MAX_LINES = 20


def usage_capped() -> bool:
    try:
        with open(SNAPSHOT) as f:
            snap = json.load(f)
    except Exception:
        return False
    for key in ("five_hour", "seven_day"):
        pct = snap.get(f"{key}_pct")
        resets_at = snap.get(f"{key}_resets_at")
        if pct is None or (resets_at and time.time() >= resets_at):
            continue
        if float(pct) >= CAP:
            return True
    return False


def run(cmd: list[str], cwd: str, timeout: int) -> tuple[int, str]:
    try:
        p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except subprocess.TimeoutExpired:
        return 1, f"timed out after {timeout}s: {' '.join(cmd)}"


def dirty_lines(repo: str) -> list[str]:
    _, out = run(["git", "status", "--porcelain"], repo, 30)
    return [l for l in out.splitlines() if l.strip() and "rewrite-evidence/runs/" not in l]


def counter_path(repo: str) -> str:
    return os.path.join(repo, ".claude", ".wf2-stop-blocks")


def read_counter(repo: str) -> int:
    try:
        with open(counter_path(repo)) as f:
            return int(f.read().strip() or 0)
    except (OSError, ValueError):
        return 0


def write_counter(repo: str, n: int) -> None:
    try:
        os.makedirs(os.path.dirname(counter_path(repo)), exist_ok=True)
        with open(counter_path(repo), "w") as f:
            f.write(str(n))
    except OSError:
        pass


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except Exception:
        event = {}
    cwd = event.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    code, top = run(["git", "rev-parse", "--show-toplevel"], cwd, 10)
    repo = top.strip() if code == 0 else ""
    if not repo or not os.path.isfile(os.path.join(repo, "PROCESS.md")):
        return
    if usage_capped():
        return
    app = os.path.join(repo, "frontend-react")
    if not os.path.isfile(os.path.join(app, "package.json")) or not os.path.isdir(os.path.join(app, "node_modules", ".bin")):
        return

    dirty = dirty_lines(repo)
    try:
        with open(os.path.join(repo, "PROCESS.md")) as f:
            blocked_state = re.search(r"^state:\s*blocked\b", f.read(), re.M) is not None
    except OSError:
        blocked_state = False
    if blocked_state and not dirty:
        return

    problems: list[str] = []
    bin_dir = os.path.join(app, "node_modules", ".bin")
    code, out = run([os.path.join(bin_dir, "tsc"), "--noEmit", "--pretty", "false", "--incremental",
                     "--tsBuildInfoFile", "node_modules/.cache/tsc/tsbuildinfo"], app, 300)
    if code != 0:
        errs = [l for l in out.splitlines() if "error" in l] or out.splitlines()
        problems.append(f"tsc --noEmit failed ({len(errs)} lines):")
        problems += errs[:MAX_LINES]
    code, out = run([os.path.join(bin_dir, "eslint"), ".", "--cache", "--cache-location",
                     "node_modules/.cache/eslint/", "--quiet", "--format", "unix"], app, 300)
    if code != 0:
        errs = [l for l in out.splitlines() if l.strip()]
        problems.append(f"eslint failed ({len(errs)} lines):")
        problems += errs[:MAX_LINES]
    if dirty:
        problems.append(f"working tree not clean ({len(dirty)} paths), e.g.:")
        problems += dirty[:5]

    if not problems:
        write_counter(repo, 0)
        return

    blocks = read_counter(repo) + 1
    if blocks > MAX_BLOCKS:
        write_counter(repo, 0)
        print(json.dumps({"systemMessage": f"wf2 stop gate: allowed after {MAX_BLOCKS} blocks although checks still fail"}))
        return
    write_counter(repo, blocks)
    reason = (
        "WF2 stop gate (PROCESS.md §3 P2): checks are failing or work is uncommitted.\n"
        + "\n".join(problems)
        + "\nFix these, or — if this is a planned session boundary or the usage cap — commit "
        "(WIP if needed), update PROCESS.md §9 (state: blocked + reason if you cannot fix it), then stop."
        + f" [block {blocks}/{MAX_BLOCKS}]"
    )
    print(json.dumps({"decision": "block", "reason": reason}))


if __name__ == "__main__":
    main()
