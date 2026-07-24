# Repository Hardening Design

## Goal

Resolve every issue identified in the repository review in one cohesive pull request while prioritizing prevention of data loss, predictable provisioning, Pi extension correctness, cross-platform behavior, and maintainable validation.

## Constraints

- Keep the interactive `/task` command but remove the model-callable `task` tool.
- Do not use the task plugin for subagent work. When the user has not explicitly outlined a task and parallel workers are genuinely necessary, use headless Pi agents instead.
- Do not automatically force-remove worktrees or automatically delete their branches.
- Keep local Pi packages loaded from the Chezmoi source directory without deploying their source trees into `$HOME`.
- Support macOS and Linux where the repository claims cross-platform behavior.
- Deliver one pull request against `main`, with focused commits and a concise description.

## Safety-Critical Changes

### Chezmoi source boundaries

Add every repository-only root to `.chezmoiignore`: documentation, tests, and local Pi package source directories. The local package paths in Pi settings continue to use `.chezmoi.sourceDir`, so excluding them from target-state deployment does not stop Pi from loading them.

Add an automated check that resolves representative source paths through Chezmoi and fails if repository-only files map into the home directory.

### Worktree cleanup

Task sessions may request automatic cleanup, but cleanup is conservative:

1. Verify the current directory is a valid Pi-managed worktree.
2. Inspect `git status --porcelain`.
3. If dirty, leave the worktree and branch intact and notify the user.
4. If clean, use non-forced `git worktree remove`.
5. Never delete the branch automatically.

Interactive deletion retains its existing explicit safe-remove then force-confirmation flow. Existing worktree reuse must be validated against `git worktree list --porcelain`; an unrelated directory at the planned path is an error.

### SSH configuration

Parse the managed markers before changing the file. Reject unmatched, nested, duplicated, or reversed marker structures without modifying the original. For valid input, remove the one managed block, append the current block, write a sibling temporary file with mode 0600, and atomically rename it over the target. Clean temporary files through a trap.

## Pi Package Changes

### Task package policy

Remove `pi.registerTool("task", ...)` and all model-inference/tool-confirmation code that exists only for model-callable launches. Keep `/task` as an interactive TUI command. Add explicit documentation that the command is user-invoked and that autonomous delegation should use headless Pi only when needed.

Reject `/task` outside TUI mode instead of bypassing the review interface. Repository aliases must be unique; duplicate basenames are reported as ambiguous and omitted from task inference until uniquely addressed.

### Loop lifecycle

Use `StringEnum` for `loop_control.action`. Restore the latest loop state from custom session entries on `session_start`, including status display. Schedule continuation from `agent_settled`, not `agent_end`, so retries, compaction, and queued messages have settled. Reject `continue` while no loop is active. Add complete unit coverage.

### Shared picker and TUI modes

Move fuzzy filtering/picker behavior into the worktree-core package and consume it from the worktree manager and Claude bridge. TUI commands check `ctx.mode === "tui"` before opening custom components. Documentation describes the picker accurately rather than calling it auto-refreshing.

## Provisioning and Portability

- Make `install.sh` the canonical entry point and turn `bootstrap.sh` into a documented compatibility wrapper.
- Preserve strict failures in required installation steps. Missing required commands and failed package/plugin installation must return nonzero instead of being hidden with `|| true`.
- Pin the Pi Coding Agent version in one tested constant.
- Guard optional zsh integrations with `command -v`, derive `SHELL` from the actual zsh executable instead of hardcoding `/usr/bin/zsh`, and avoid claiming an unavailable editor.
- Configure tmux clipboard support using `set-clipboard on` and a portable helper that selects `pbcopy`, `wl-copy`, or `xclip`.
- Remove the missing Claude status-line command and narrow automatic command permissions so argument-powerful commands are not globally auto-approved.

## Repository Engineering

Create a root npm workspace that owns development tooling and aggregate commands. Keep Pi core packages as wildcard peers because Pi package guidance requires that form, while pinning development tools and the globally installed Pi version. Commit a lockfile.

Root commands cover:

- all package and repository tests,
- TypeScript checking,
- shell syntax and ShellCheck,
- template rendering and Chezmoi boundary checks,
- Neovim headless startup.

Add GitHub Actions for Linux validation. Add a root README covering canonical installation, work/personal behavior, package development, checks, and destructive-operation policy. Remove the obsolete `lazy-lock.json`; `nvim-pack-lock.json` is the sole Neovim lockfile.

## Testing Strategy

Behavior changes follow regression-first testing:

- shell test fixtures reproduce unmatched SSH markers and atomic preservation;
- worktree tests cover dirty cleanup, branch preservation, ambiguous aliases, and invalid reuse paths;
- task tests prove only `/task` is registered and non-TUI invocation is rejected;
- loop tests cover schema compatibility, persistence restoration, inactive continuation, and settled continuation;
- repository tests validate Chezmoi ignore boundaries, missing-reference removal, pinned installers, and canonical docs;
- CI runs all checks from a clean checkout.

Configuration-only changes are validated with rendering, syntax checks, command-level smoke tests, and targeted static assertions.

## Delivery

Use focused conventional commits grouped by safety, Pi behavior, provisioning, and engineering infrastructure. After all validation passes, push `chore/repository-hardening` and open one pull request against `main` with a concise summary emphasizing safety fixes and a test plan listing the exact aggregate commands.