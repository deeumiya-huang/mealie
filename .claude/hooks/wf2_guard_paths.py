#!/usr/bin/env python3
"""WF2 PreToolUse hook: never let an agent edit the paths the WF2 goal declares read-only.

Denies Edit/Write/MultiEdit/NotebookEdit whose target lies, in any checkout or worktree, under
frontend/, mealie/, frontend-e2e/, or is rewrite-evidence/measure.sh. The checkout root is the
nearest parent directory containing .git (a directory in the main checkout, a file in a worktree).
See PROCESS.md §1.1 rule 1.
"""
import json
import os
import sys

FORBIDDEN_DIRS = ("frontend", "mealie", "frontend-e2e")
FORBIDDEN_FILES = ("rewrite-evidence/measure.sh",)


def checkout_root(path: str) -> str | None:
    d = os.path.dirname(path)
    while True:
        if os.path.exists(os.path.join(d, ".git")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except Exception:
        return
    tool_input = event.get("tool_input") or {}
    target = tool_input.get("file_path") or tool_input.get("notebook_path")
    if not target:
        return
    if not os.path.isabs(target):
        target = os.path.join(event.get("cwd") or os.getcwd(), target)
    target = os.path.realpath(target)

    root = checkout_root(target)
    if root is None:
        return
    rel = os.path.relpath(target, root).replace(os.sep, "/")
    first = rel.split("/", 1)[0]
    if first in FORBIDDEN_DIRS or rel in FORBIDDEN_FILES:
        reason = (
            f"WF2 rule (PROCESS.md §1.1.1): {rel} is read-only. Never modify frontend/, mealie/, "
            "frontend-e2e/ or rewrite-evidence/measure.sh. Put the change in frontend-react/ instead, "
            "or record a gap in PROCESS.md §9."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        }))


if __name__ == "__main__":
    main()
