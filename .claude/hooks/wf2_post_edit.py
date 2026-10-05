#!/usr/bin/env python3
"""WF2 PostToolUse hook: type-check and lint a frontend-react file right after it is edited.

For *.ts / *.tsx inside a `frontend-react/` app (main checkout or a porter worktree) whose
node_modules exists:
  - eslint --cache on the edited file
  - incremental `tsc --noEmit` on the whole app, under a machine-wide lock so concurrent porters
    never run two type checks at once (3.8 GiB RAM); if the lock is busy for 60 s the check is skipped.
Reports (exit 2, stderr -> shown to Claude) only errors in the edited file plus a count of the
others, so intermediate states of multi-file edits stay quiet. Silent on success. PROCESS.md §3 P2.
"""
import fcntl
import json
import os
import subprocess
import sys
import time

LOCK = "/tmp/wf2-tsc.lock"
LOCK_WAIT_SEC = 60
MAX_LINES = 25


def app_root(path: str) -> str | None:
    d = os.path.dirname(path)
    while True:
        if os.path.basename(d) == "frontend-react" and os.path.isfile(os.path.join(d, "package.json")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def run(cmd: list[str], cwd: str, timeout: int) -> tuple[int, str]:
    try:
        p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except subprocess.TimeoutExpired:
        return 0, ""


def acquire_lock():
    f = open(LOCK, "w")
    deadline = time.time() + LOCK_WAIT_SEC
    while True:
        try:
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return f
        except BlockingIOError:
            if time.time() > deadline:
                f.close()
                return None
            time.sleep(1)


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except Exception:
        return
    target = (event.get("tool_input") or {}).get("file_path") or ""
    if not target.endswith((".ts", ".tsx")):
        return
    target = os.path.realpath(target)
    root = app_root(target)
    if root is None or not os.path.isdir(os.path.join(root, "node_modules", ".bin")):
        return
    rel = os.path.relpath(target, root)
    bin_dir = os.path.join(root, "node_modules", ".bin")
    problems: list[str] = []

    code, out = run([os.path.join(bin_dir, "eslint"), "--cache", "--cache-location",
                     "node_modules/.cache/eslint/", "--format", "unix", rel], root, 90)
    if code != 0:
        problems += [l for l in out.splitlines() if l.strip() and not l.startswith(("\n", " "))][:MAX_LINES]

    lock = acquire_lock()
    if lock is None:
        problems.append("(tsc skipped: another type check held the lock for 60 s)")
    else:
        try:
            code, out = run([os.path.join(bin_dir, "tsc"), "--noEmit", "--pretty", "false", "--incremental",
                             "--tsBuildInfoFile", "node_modules/.cache/tsc/tsbuildinfo"], root, 150)
        finally:
            lock.close()
        if code != 0:
            errors = [l for l in out.splitlines() if "error TS" in l]
            mine = [l for l in errors if l.startswith(rel)]
            problems += mine[:MAX_LINES]
            others = len(errors) - len(mine)
            if others:
                problems.append(f"(+{others} tsc errors in other files)")

    if problems and not (len(problems) == 1 and problems[0].startswith("(")):
        print(f"wf2 post-edit checks for {rel}:\n" + "\n".join(problems), file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
