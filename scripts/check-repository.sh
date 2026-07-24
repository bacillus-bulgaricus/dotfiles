#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo"

for command in chezmoi jq nvim; do
  command -v "$command" >/dev/null 2>&1 || { echo "$command is required for repository checks" >&2; exit 1; }
done

make check

managed="$(chezmoi --source "$repo" managed --path-style source-absolute)"
for root in README.md package.json package-lock.json tsconfig.json docs tests scripts pi-claude-bridge pi-loop-package pi-task pi-worktree-core pi-worktree-manager; do
  if grep -Fq -- "$repo/$root" <<<"$managed"; then
    echo "Repository-only source is managed by chezmoi: $root" >&2
    exit 1
  fi
done

nvim --headless -u "$repo/dot_config/nvim/init.lua" "+lua print('nvim startup ok')" +qa
