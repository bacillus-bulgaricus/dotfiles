# Repository Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the reviewed data-loss risks and make provisioning, Pi extensions, and repository validation safe, portable, and reproducible.

**Architecture:** Keep Chezmoi as the deployment boundary, move shared Pi behavior into `pi-worktree-core`, and make destructive operations conservative by default. A root npm workspace and CI workflow provide one reproducible validation entry point across shell, TypeScript, templates, and Neovim.

**Tech Stack:** Chezmoi templates, Bash, TypeScript Pi extensions, Node test runner, npm workspaces, GitHub Actions, Neovim 0.12.

## Global Constraints

- Keep interactive `/task`; remove the model-callable `task` tool.
- Do not use the task plugin for subagent work; autonomous parallel work uses headless Pi only when genuinely needed.
- Never automatically force-remove a worktree or automatically delete its branch.
- Keep repository-only source outside the Chezmoi target state.
- Preserve macOS and Linux behavior.
- Open one pull request against `main` after all validation passes.

---

### Task 1: Chezmoi and SSH safety boundaries

**Files:**
- Modify: `.chezmoiignore`
- Modify: `run_after_05-manage-ssh-config-block.sh.tmpl`
- Create: `tests/provisioning.test.mjs`

**Interfaces:**
- Consumes: Chezmoi source naming and an existing `~/.ssh/config`.
- Produces: repository-only source exclusions and a marker-safe atomic SSH config update.

- [ ] **Step 1: Write failing provisioning tests**

Add Node tests that assert all `docs`, `tests`, and `pi-*` roots are ignored; execute the SSH script against a temporary home; assert an unmatched marker exits nonzero without changing bytes; and assert a valid managed block is replaced while surrounding host entries remain.

- [ ] **Step 2: Verify the tests fail for the reviewed defects**

Run: `node --test tests/provisioning.test.mjs`
Expected: failures for missing ignore roots and destructive unmatched-marker handling.

- [ ] **Step 3: Implement strict boundaries and atomic replacement**

Add the repository-only roots to `.chezmoiignore`. Update the shell script to validate one balanced marker block with `awk`, write `config.tmp.XXXXXX` in `~/.ssh`, apply mode 0600, and `mv` it atomically. Install a trap that removes the temporary file.

- [ ] **Step 4: Verify focused and existing tests**

Run: `node --test tests/provisioning.test.mjs tests/pi-package-dependencies.test.mjs && make check`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add .chezmoiignore run_after_05-manage-ssh-config-block.sh.tmpl tests/provisioning.test.mjs
git commit -m "fix: protect chezmoi and ssh boundaries"
```

### Task 2: Conservative worktree behavior

**Files:**
- Modify: `pi-worktree-core/src/index.ts`
- Modify: `pi-worktree-core/tests/core.test.mjs`
- Modify: `pi-worktree-manager/extensions/worktree-manager.ts`
- Modify: `pi-worktree-manager/tests/worktree-manager-redesign.test.mjs`
- Modify: `pi-task/README.md`
- Modify: `pi-worktree-manager/README.md`

**Interfaces:**
- Produces: `isCleanWorktreeStatus(porcelain: string): boolean`, unique repository discovery, and validated `ensureWorktree()` reuse.
- Consumes: `git status --porcelain` and `git worktree list --porcelain`.

- [ ] **Step 1: Add failing core tests**

Cover dirty/clean status detection, duplicate basename exclusion with a warning, rejection of an existing non-worktree path, rejection of a mismatched branch, and reuse of a valid registered worktree.

- [ ] **Step 2: Verify failures**

Run: `npm test --prefix pi-worktree-core`
Expected: new tests fail because validation and ambiguity handling do not exist.

- [ ] **Step 3: Implement core validation**

Add `isCleanWorktreeStatus`. During discovery, group candidates by basename, remove ambiguous aliases, and emit a warning naming all conflicting roots. In `ensureWorktree`, when the target path exists, parse `git worktree list --porcelain` and require the exact planned path and branch.

- [ ] **Step 4: Add failing manager cleanup test**

Capture the shutdown handler with injected git operations and prove dirty automatic cleanup does not call remove or branch deletion, while clean cleanup calls only safe worktree removal.

- [ ] **Step 5: Implement conservative cleanup**

For `PI_WORKTREE_AUTO_CLEANUP=1`, read status, skip dirty worktrees with a warning, call non-forced removal for clean worktrees, and never delete the branch. Preserve explicit interactive force-confirmation deletion.

- [ ] **Step 6: Run package tests**

Run: `npm test --prefix pi-worktree-core && npm test --prefix pi-worktree-manager`
Expected: all pass.

- [ ] **Step 7: Update cleanup documentation and commit**

```bash
git add pi-worktree-core pi-worktree-manager pi-task/README.md
git commit -m "fix(pi): make worktree cleanup conservative"
```

### Task 3: Restrict task delegation and TUI behavior

**Files:**
- Modify: `pi-task/extensions/task.ts`
- Modify: `pi-task/tests/task.test.mjs`
- Modify: `pi-task/README.md`
- Modify: `dot_pi/agent/settings.json.tmpl`

**Interfaces:**
- Produces: interactive `/task` only; no model-callable `task` tool.
- Consumes: `ExtensionCommandContext.mode`, requiring `"tui"` for task review and launch.

- [ ] **Step 1: Change tests first**

Assert only `/task` is registered, no tools are registered, its prompt guidance no longer encourages task-tool delegation, and invoking the captured handler outside TUI mode reports an error before repository/model work.

- [ ] **Step 2: Verify failures**

Run: `npm test --prefix pi-task`
Expected: failures because the tool is still registered and mode is not guarded.

- [ ] **Step 3: Remove tool-only code and guard command mode**

Delete tool schemas, confirmation configuration, explicit tool overrides, `runTaskTool`, and `registerTool`. Add `mode` to the command context and return with a clear error unless it is `"tui"`.

- [ ] **Step 4: Document headless delegation policy**

State that `/task` is explicitly user-invoked. When autonomous parallel work is needed without a user-outlined task, launch headless Pi workers directly rather than `/task`.

- [ ] **Step 5: Verify and commit**

```bash
npm test --prefix pi-task
git add pi-task dot_pi/agent/settings.json.tmpl
git commit -m "refactor(pi): keep task delegation user initiated"
```

### Task 4: Correct loop lifecycle and persistence

**Files:**
- Modify: `pi-loop-package/package.json`
- Modify: `pi-loop-package/extensions/loop.ts`
- Create: `pi-loop-package/tests/loop.test.mjs`
- Modify: `pi-loop-package/README.md`
- Modify: `tests/pi-package-dependencies.test.mjs`

**Interfaces:**
- Consumes: Pi `session_start`, `agent_settled`, custom entries, and `StringEnum`.
- Produces: restored `LoopState` and Google-compatible `loop_control.action`.

- [ ] **Step 1: Add loop tests before behavior changes**

Capture the tool, command, and event handlers. Assert the schema exposes an enum; inactive `continue` throws; latest persisted loop state restores on session start; and follow-up messages are sent from `agent_settled` rather than `agent_end`.

- [ ] **Step 2: Verify failures**

Run: `npm test --prefix pi-loop-package`
Expected: failures because the package has no test setup and current behavior lacks these guarantees.

- [ ] **Step 3: Implement lifecycle fixes**

Import `StringEnum` from `@earendil-works/pi-ai`, define a serializable `LoopState`, append complete state transitions, reconstruct the latest `loop-state` entry from the active branch, reject inactive control calls, and move continuation to `agent_settled`.

- [ ] **Step 4: Verify and commit**

```bash
npm test --prefix pi-loop-package
git add pi-loop-package tests/pi-package-dependencies.test.mjs
git commit -m "fix(pi): persist loop lifecycle safely"
```

### Task 5: Consolidate shared Pi picker behavior

**Files:**
- Create: `pi-worktree-core/src/fuzzy-select.ts`
- Create: `pi-worktree-core/tests/fuzzy-select.test.mjs`
- Delete: `pi-worktree-manager/extensions/fuzzy-select.ts`
- Delete: `pi-claude-bridge/extensions/fuzzy-select.ts`
- Modify: `pi-worktree-manager/extensions/worktree-manager.ts`
- Modify: `pi-claude-bridge/extensions/claude-skill.ts`
- Modify: package metadata and tests for all three packages
- Modify: `pi-claude-bridge/README.md`

**Interfaces:**
- Produces: shared `fuzzyFilter`, `fuzzySelect`, `actionPicker`, `textInput`, and picker option/result types.
- Consumes: Pi TUI theme, key handling, and `ctx.mode === "tui"`.

- [ ] **Step 1: Move tests to the desired shared API and verify failure**

Point fuzzy tests at `pi-worktree-core/src/fuzzy-select.ts`, add a mode-guard test for the worktree and Claude commands, and run the affected package tests. Expected: imports fail before the shared module exists.

- [ ] **Step 2: Implement the shared module**

Use the richer worktree-manager picker as the canonical implementation, retain the simpler `fuzzySelect` wrapper, and export it from the core package. Add the required Pi TUI peer metadata.

- [ ] **Step 3: Update consumers and remove duplicates**

Import from core, reject non-TUI picker launches with a notification, delete duplicate modules, and correct the Claude bridge README to describe snapshot discovery.

- [ ] **Step 4: Verify and commit**

```bash
npm test --prefix pi-worktree-core
npm test --prefix pi-worktree-manager
npm test --prefix pi-claude-bridge
git add pi-worktree-core pi-worktree-manager pi-claude-bridge
git commit -m "refactor(pi): share picker implementation"
```

### Task 6: Harden provisioning, shell, tmux, and Claude configuration

**Files:**
- Modify: `install.sh`, `bootstrap.sh`, `run_onchange_before_01-install-packages.sh.tmpl`
- Modify: `run_onchange_after_04-install-claude-plugins.sh.tmpl`
- Modify: `run_onchange_after_05-install-pi.sh.tmpl`
- Modify: `run_onchange_after_06-install-pi-packages.sh.tmpl`
- Modify: `.chezmoitemplates/zshrc`, `dot_tmux.conf`, `doctor.sh`
- Create: `dot_local/bin/copy-to-clipboard.sh`
- Modify: `dot_claude/settings.json.tmpl`
- Modify: `tests/provisioning.test.mjs`

**Interfaces:**
- Produces: strict installers, portable shell startup, portable tmux copy command, and conservative Claude permissions.

- [ ] **Step 1: Add static and executable regression tests**

Assert Pi has an exact version, installer failures are not hidden, the status-line reference is absent, safety prompts are enabled, optional zsh commands are guarded, and the clipboard helper selects the first available backend or fails clearly.

- [ ] **Step 2: Verify tests fail**

Run: `node --test tests/provisioning.test.mjs`
Expected: reviewed provisioning and configuration assertions fail.

- [ ] **Step 3: Implement provisioning fixes**

Make `install.sh` canonical and `bootstrap.sh` delegate to it. Fail when required package tools are missing. Remove broad `|| true` suppression from package/plugin installation. Pin Pi to the reviewed version.

- [ ] **Step 4: Implement portable interactive configuration**

Resolve zsh dynamically, guard fzf/starship/zoxide/fzf-tab, use a clipboard helper with `pbcopy`, `wl-copy`, and `xclip`, enable tmux clipboard integration, remove the missing status line, disable automatic Bash permission bypass, and remove `find` from broad allows.

- [ ] **Step 5: Fix ShellCheck findings and verify**

Run: `shellcheck -x *.sh *.sh.tmpl dot_local/bin/*.sh && bash -n *.sh *.sh.tmpl dot_local/bin/*.sh && node --test tests/provisioning.test.mjs && make check`
Expected: clean output and all passing.

- [ ] **Step 6: Commit**

```bash
git add install.sh bootstrap.sh run_* .chezmoitemplates/zshrc dot_tmux.conf doctor.sh dot_local/bin/copy-to-clipboard.sh dot_claude/settings.json.tmpl tests/provisioning.test.mjs
git commit -m "fix: harden cross-platform provisioning"
```

### Task 7: Reproducible repository validation and documentation

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`
- Create: `.github/workflows/check.yml`
- Modify: child `package.json` files and `Makefile`
- Delete: `dot_config/nvim/lazy-lock.json`
- Modify: `tests/pi-package-dependencies.test.mjs`

**Interfaces:**
- Produces: `npm test`, `npm run typecheck`, `npm run lint:shell`, and `npm run check` as canonical clean-checkout commands.

- [ ] **Step 1: Add failing repository metadata tests**

Assert a root workspace exists, exact development tool versions and lockfile exist, CI invokes canonical commands, README documents installation and task policy, only `nvim-pack-lock.json` exists, and every package has a test script.

- [ ] **Step 2: Verify failures**

Run: `node --test tests/pi-package-dependencies.test.mjs`
Expected: failures for missing workspace, CI, README, loop tests, and stale lockfile.

- [ ] **Step 3: Add workspace and typechecking**

Create npm workspaces for `pi-*`, pin `jiti`, TypeScript, and Node types in the lockfile, add strict no-emit TypeScript configuration, and resolve all resulting type errors without weakening strictness globally.

- [ ] **Step 4: Add aggregate validation and CI**

Make root scripts run repository/package tests, typecheck, ShellCheck, template checks, Chezmoi boundary checks, and Neovim startup. Configure GitHub Actions to install required system tools and execute `npm ci`, `npm test`, `npm run typecheck`, and `npm run check`.

- [ ] **Step 5: Add README and remove migration debris**

Document canonical install, machine modes, development commands, Pi task policy, and safe worktree behavior. Delete `lazy-lock.json` and identify `nvim-pack-lock.json` as authoritative.

- [ ] **Step 6: Run full validation**

```bash
npm ci
npm test
npm run typecheck
npm run lint:shell
npm run check
```

Expected: all commands pass with no warnings.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json README.md .github Makefile pi-*/package.json tests dot_config/nvim/lazy-lock.json
git commit -m "chore: add reproducible repository checks"
```

### Task 8: Final verification and pull request

**Files:**
- Modify only if verification exposes a defect.

- [ ] **Step 1: Verify the complete branch from a clean dependency install**

Run the full validation commands from Task 7 and `git diff --check`.

- [ ] **Step 2: Review the final diff**

Confirm every design requirement has a corresponding implementation and regression test, no generated `node_modules` content is tracked, and no unrelated changes are included.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin chore/repository-hardening
gh pr create --base main --head chore/repository-hardening --title "chore: harden dotfiles provisioning and Pi extensions" --body-file /tmp/repository-hardening-pr.md
```

The PR body contains only a concise summary of safety, Pi correctness, portability/tooling, and the exact validation commands.