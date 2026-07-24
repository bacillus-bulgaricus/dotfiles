# pi-worktree-manager

Pi package that adds an interactive git worktree picker for Pi.

## What it does

- Adds one command: `/worktree`
- Lists worktrees from the current repo and configured known repos
- Opens the selected worktree in tmux with Enter
- Creates Pi-managed worktrees with `N`
- Deletes only Pi-managed worktrees with `D`
- Creates/reuses Pi-managed worktrees under `<repo>/.pi/worktrees/<name>`
- Uses branch name `worktree-<name>`

## Install

```bash
pi install /absolute/path/to/pi-worktree-manager
# or in this repo
pi install ./pi-worktree-manager
```

## Configuration

Known repos are discovered from global config only:

```json
// ~/.pi/agent/worktree-manager.json
{
  "repoSearchRoots": [
    "~/go/src/github.com/DataDog"
  ]
}
```

Each configured root scans immediate children only. The current repo is also included when Pi starts inside a git repo.

## Usage

```bash
/worktree
```

Picker controls:

- type to fuzzy-search by repo, worktree, branch, or path
- Enter opens the selected worktree in tmux
- `N` creates a new Pi-managed worktree
- `D` deletes the selected worktree if it is Pi-managed
- Esc cancels

Rows are labeled as:

```text
<repo-name> / <worktree-name>
```

Opening behavior:

- inside tmux: creates a new tmux window named after the worktree
- outside tmux: creates a detached tmux session named `pi-<worktree>`

New worktree flow:

1. Choose a repo from known repo aliases, or select manual path entry.
2. Enter a worktree name.
3. The package creates/reuses `<repo>/.pi/worktrees/<slugified-name>`.
4. The package opens the resulting worktree in tmux.

## Notes

- Deletion is restricted to Pi-managed worktrees: paths under `<repo>/.pi/worktrees/<name>` on branch `worktree-<name>`.
- `D` deletion runs safe `git worktree remove <path>` first, then deletes the `worktree-<name>` branch.
- If safe removal fails, Pi asks whether to force-remove and shows the failed output plus the path that would be removed.
- Pi-managed sessions launched with `PI_WORKTREE_AUTO_CLEANUP=1` are force-removed automatically on session shutdown, and their associated `worktree-<name>` branch is deleted.
