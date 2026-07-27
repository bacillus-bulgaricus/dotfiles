# pi-task

Pi package that adds the user-invoked `/task` command for starting a fresh task in a new Pi-managed worktree.

## Usage

```text
/task fix flaky e2e framework tests in integrations-core
/task --split fix flaky e2e framework tests in integrations-core
```

`/task` is interactive-only and must be invoked explicitly by the user. This package does not register a model-callable task tool. Agents must not use `/task` as an autonomous subagent mechanism. When parallel work is genuinely needed and the user has not outlined a task handoff, launch headless Pi workers directly instead.

## Behavior

The command:

1. Uses the active Pi model, or an optional configured model, to infer the target repository, goal, worktree name, and kickoff prompt.
2. Shows a review UI. Enter launches, `E` edits, and Esc cancels.
3. Creates or reuses `<repo>/.pi/worktrees/<name>` on branch `worktree-<name>`.
4. By default, fetches `origin` and bases a new worktree on the remote default branch.
5. Launches a fresh Pi session in tmux.

Opening behavior:

- inside tmux: opens a new window;
- inside tmux with `--split`: opens a split pane;
- outside tmux: opens a detached session.

## Configuration

```json
// ~/.pi/agent/task.json
{
  "model": "openai/gpt-5.5"
}
```

Without `model`, `/task` uses the active model. Repository discovery uses `~/.pi/agent/worktree-manager.json`:

```json
{
  "repoSearchRoots": ["~/go/src/github.com/DataDog"]
}
```

Repository basenames must be unique across search roots. Ambiguous aliases are rejected with a warning.

## Cleanup safety

Task worktrees are marked for conservative cleanup. On exit, a clean worktree is safely removed while its branch is preserved. Dirty worktrees are left untouched for explicit recovery or cleanup. Automatic cleanup never uses `git worktree remove --force` and never deletes a branch.
