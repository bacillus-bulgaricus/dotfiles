# pi-task

Pi package that adds `/task` and a `task` tool for starting a fresh task in a new Pi-managed worktree.

## What it does

```bash
/task fix flaky e2e framework tests in integrations-core
/task --split fix flaky e2e framework tests in integrations-core
```

Agents can also call the `task` tool directly for handoff:

```json
{
  "description": "Review PR https://github.com/DataDog/integrations-core/pull/23905",
  "split": true
}
```

To override the default base explicitly:

```json
{
  "description": "Continue investigation from my repro branch",
  "repoAlias": "integrations-core",
  "worktreeName": "investigate-repro",
  "kickoffPrompt": "Continue from the existing repro branch and verify the failing test.",
  "baseRef": "feature/repro-branch"
}
```

The command:

1. Uses the active Pi model, or an optional configured model, to infer:
   - target repo
   - task goal
   - worktree name
   - kickoff prompt
2. Shows a short review UI:
   - Enter launches
   - `E` edits worktree name and kickoff prompt
   - Esc cancels
3. Creates or reuses a Pi-managed worktree:
   - `<repo>/.pi/worktrees/<name>`
   - branch `worktree-<name>`
   - by default, fetches `origin` and bases new task worktrees on the latest remote default branch (`origin/HEAD`)
   - if the task explicitly says to use another branch/tag/commit, that ref is used instead
4. Starts a fresh Pi session in tmux with the kickoff prompt.
5. Marks the task session for automatic Pi-managed worktree cleanup on exit.

Opening behavior:

- inside tmux: creates a new tmux window
- inside tmux with `--split`: creates a split pane in the current window
- outside tmux: creates a detached tmux session

## Configuration

Task config is global only:

```json
// ~/.pi/agent/task.json
{
  "model": "openai/gpt-5.5",
  "tool": {
    "requireConfirmation": true
  }
}
```

`model` is optional. Without it, `/task` and the `task` tool use the current active Pi model.

`tool.requireConfirmation` is optional and defaults to `true`. Agents can override it per tool call with `requireConfirmation`.

Repo discovery reuses:

```json
// ~/.pi/agent/worktree-manager.json
{
  "repoSearchRoots": [
    "~/go/src/github.com/DataDog"
  ]
}
```

If the current directory is inside a git repo, that repo is included too.

## Notes

- `/task` launches a fresh Pi session, not `pi -c`.
- Task worktrees are marked with `PI_WORKTREE_AUTO_CLEANUP=1`; when the task Pi session exits, the worktree is force-removed and its `worktree-<name>` branch is deleted.
- The model must choose one of the discovered repo aliases.
- The model should omit `baseRef` unless the user explicitly asks for a specific branch, tag, commit, or current branch.
- The generated kickoff prompt is intentionally concise: goal, repo context, original request, inferred context, and constraints.
