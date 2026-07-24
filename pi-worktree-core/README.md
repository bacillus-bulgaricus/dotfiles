# pi-worktree-core

Shared TypeScript helpers for local Pi worktree packages.

This package intentionally registers no Pi extension commands. It provides reusable helpers for:

- worktree-safe slug generation
- Pi-managed worktree path/branch planning
- git worktree list parsing
- repo discovery from `~/.pi/agent/worktree-manager.json`
- Pi-managed worktree detection and removal command generation
- tmux launch command generation for existing sessions and fresh task sessions

Consumers currently import it by relative path from sibling local packages.
