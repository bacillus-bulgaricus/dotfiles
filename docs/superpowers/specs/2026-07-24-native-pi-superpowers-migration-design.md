# Native Pi Superpowers Migration Design

## Goal

Replace the locally ported Superpowers v5.1.0 package with the authoritative native Pi package from `obra/superpowers`, pinned to release `v6.2.0`.

The migration must remove port-specific compatibility code, avoid duplicate skill discovery, retain the repository's independent Pi task and worktree packages, disable optional visual-companion telemetry, and validate native package loading without executing unrelated upstream scripts.

## Current State

The repository loads `pi-superpowers-package/` as a local Pi package through `dot_pi/agent/settings.json.tmpl`. The package vendors all 14 upstream Superpowers v5.1.0 skills and adds:

- `extensions/bootstrap.ts`, which injects bootstrap instructions through `before_agent_start` and a hidden custom message;
- a Pi-specific patch to `skills/using-superpowers/SKILL.md`;
- `skills/using-superpowers/references/pi-tools.md`;
- local package metadata, attribution, and a port report.

`run_onchange_after_06-install-pi-packages.sh.tmpl` treats the port as a local package and installs its peer dependencies. `tests/pi-package-dependencies.test.mjs` asserts that local dependency relationship.

The repository also has independent `pi-task`, `pi-worktree-core`, and `pi-worktree-manager` packages. These provide fresh Pi task sessions and Pi-managed worktrees and are not part of the Superpowers port.

## Authoritative Native Package

The authoritative source is `https://github.com/obra/superpowers`, release `v6.2.0`, commit `3dcbd5c4b48e02263fbf4a3c01e3fe4f81d584d9`.

Its root `package.json` declares a native Pi package:

- skills: `./skills`;
- extension: `./.pi/extensions/superpowers.ts`;
- package keyword: `pi-package`.

The native extension registers the skills directory and injects the `using-superpowers` bootstrap as a user-context message at session startup and after compaction. It uses Pi-native skill discovery and does not emulate a `Skill` tool.

The package has no npm dependencies, lifecycle scripts, `postinstall`, or `preinstall` behavior. Pi will still run its normal npm package reconciliation for a git package, but the pinned manifest contains nothing executable through npm lifecycle hooks.

The package is MIT licensed and includes the upstream license and attribution. It declares no minimum Pi version. Its newest required Pi API, `resources_discover`, has existed since Pi 0.50.8; the installed Pi 0.80.6 supports all extension events it uses.

## Considered Approaches

### Direct pinned upstream package

Configure Pi to load `git:github.com/obra/superpowers@v6.2.0`, then remove the local port.

This is the selected approach because it is authoritative, reproducible, and has the smallest maintenance surface.

### Vendored upstream repository

Replace the port with a complete copy of upstream v6.2.0. This would support offline source availability but would duplicate a large multi-harness repository and retain a manual update burden.

### Native package plus local wrapper

Load upstream and add a local compatibility extension. No retained behavior requires such a wrapper, and it would introduce duplicate bootstrap or skill-discovery risk.

## Configuration and Installation

`dot_pi/agent/settings.json.tmpl` will replace the local `pi-superpowers-package` path with exactly one pinned git source:

```json
"git:github.com/obra/superpowers@v6.2.0"
```

`run_onchange_after_06-install-pi-packages.sh.tmpl` will distinguish local source packages from the managed upstream git package:

- local package paths continue through the existing npm dependency-install loop;
- the git package is registered through Pi and is never passed as an npm `--prefix` path;
- installation remains idempotent.

The complete `pi-superpowers-package/` directory will be deleted. No copied upstream skills, extension, mapping files, package manifest, README, port report, or license file will remain locally. Attribution and license travel with the pinned upstream package itself.

## Local Overlay

The shell template will export:

```bash
export SUPERPOWERS_DISABLE_TELEMETRY=1
```

This is a separate, clearly labeled local preference. It disables the remote Prime Radiant logo request made only when the optional visual brainstorming companion is opened. It does not fork or modify upstream resources.

No other Superpowers overlay will be created.

## Behavior Mapping

### Preserved

- All 14 Superpowers skill names remain available.
- Skill descriptions and automatic activation continue through Pi-native discovery.
- Bootstrap activation remains effective at session startup and after compaction.
- `pi-task`, `pi-worktree-core`, and `pi-worktree-manager` remain loaded independently.
- Existing Pi-managed worktrees remain detectable by the newer upstream worktree workflow.
- In the absence of a compatible subagent extension, implementation workflows continue sequentially in the current session.

### Intentionally changed

- Superpowers advances from v5.1.0 to v6.2.0, adopting upstream skill fixes and workflow changes.
- Bootstrap injection changes from the local system-prompt/custom-message implementation to upstream's native user-context implementation.
- The local Pi `using-superpowers` patch and tool mapping are replaced by upstream's action-based Pi mapping.
- Newer subagent-driven development includes plan-scoped scratch workspaces, a persistent progress ledger, resume-based fix rounds, and scoped re-review.
- Worktree handling first detects existing isolation and prefers harness-native worktree mechanisms.
- The updated visual companion is adopted, while its optional remote-logo request is disabled by the local environment overlay.

### Not mapped

The repository's `task` tool starts a separate Pi session in a new worktree; it is not a same-session subagent implementation and will not be presented to Superpowers as one. No subagent compatibility package will be added in this migration.

## Duplicate-Discovery Prevention

The local package path and entire vendored skill tree will be removed in the same change that adds the pinned upstream source. Tests will assert that:

- the upstream git source appears exactly once in settings;
- no local `pi-superpowers-package` reference remains;
- the upstream source cannot enter the local npm package loop.

No Superpowers skills are present in the repository's other Pi skill directories or the user's standard Pi skill directories.

## Failure Handling

A first install requires GitHub access. Pi will report clone or package-load failures. Once cloned into Pi's managed git package directory, the pinned checkout can be reused offline.

The package pin prevents `pi update --extensions` from silently advancing Superpowers. Upgrading requires reviewing a newer release and changing the tag in dotfiles.

The existing installer policy for registering Pi packages remains unchanged outside the separation between local packages and the upstream git source.

## Validation

Implementation validation will include:

1. `make check` for rendered JSON templates.
2. `bash -n` for both Pi installer templates.
3. Repository Node tests, including updated dependency and source assertions.
4. Validation of every upstream v6.2.0 `SKILL.md` with the repository's Pi skill validator.
5. Upstream's reviewed native Pi extension tests against the exact pinned checkout.
6. TypeScript syntax/loading checks for the native extension.
7. An isolated Pi startup/RPC smoke test using a temporary Pi configuration, confirming one native extension, 14 uniquely discovered skills, and no local port bootstrap.
8. A final search for obsolete `pi-superpowers-package` references and duplicate Superpowers skill paths.

The visual companion and unrelated upstream scripts will not be executed.

## Scope

This migration will not:

- add a subagent package or reinterpret `pi-task` as a subagent tool;
- modify the behavior of the repository's other Pi packages;
- follow upstream `main` or automatically advance the pinned tag;
- retain a local Superpowers wrapper or fork;
- push a branch or open a pull request.
