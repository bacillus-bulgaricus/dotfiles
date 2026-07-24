# pi-worktree-core

Shared TypeScript helpers for the local Pi worktree packages. It intentionally registers no Pi resources.

Exports:

- `pi-worktree-core/index` — repository discovery, worktree validation, cleanup safety, and tmux launch helpers;
- `pi-worktree-core/fuzzy-select` — shared fuzzy filtering and interactive picker components.

Sibling packages declare `pi-worktree-core` as a local file dependency rather than importing through repository-relative paths. This keeps module boundaries explicit while allowing the root npm workspace and chezmoi package installer to resolve the same source.
