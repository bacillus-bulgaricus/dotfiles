# Port report

Source: `https://github.com/obra/superpowers`
Detected harness: Agent Skills package with Claude Code, Codex, Cursor, Gemini, OpenCode, and Copilot plugin metadata
Pi target: Pi package containing skills plus a bootstrap extension
Upstream version: `5.1.0`
License: MIT; see `LICENSE`

## Created/changed

- `package.json` — Pi package manifest that loads `./skills` and `./extensions`.
- `extensions/bootstrap.ts` — Pi runtime bootstrap that injects the upstream `using-superpowers` instructions and Pi tool mapping into the system prompt for each turn.
- `skills/` — vendored upstream Superpowers skill library.
- `skills/using-superpowers/SKILL.md` — minimal Pi-specific platform adaptation added.
- `skills/using-superpowers/references/pi-tools.md` — mapping from Claude/Codex/Gemini tool names to Pi equivalents and fallbacks.
- `LICENSE` and `UPSTREAM-README.md` — upstream license and README preserved.

## Behavior mapping

- Upstream `skills/*/SKILL.md` → Pi skills loaded by package manifest.
- Claude/Cursor session-start hook that injects `using-superpowers` → Pi `before_agent_start` extension hook that appends equivalent bootstrap context to the system prompt.
- Claude `Skill` tool instructions → Pi `read` tool instructions in `references/pi-tools.md` and patched `using-superpowers` platform section.
- Claude `TodoWrite` references → Pi checklist fallback documented in `references/pi-tools.md`.
- Claude `Task`/subagent references → Pi subagent-unavailable fallback documented in `references/pi-tools.md`.

## Known gaps

- Pi does not expose Claude Code's `Task` or `TodoWrite` tools by default. Superpowers workflows that rely on subagents or todo tooling use documented fallbacks unless separate Pi extensions provide those tools.
- The upstream brainstorm visual companion scripts are vendored but are not automatically run by this package.
- This package vendors a snapshot of upstream Superpowers. Update by re-copying upstream skills and reapplying the small Pi-specific patch/reference.

## How to load/test

Temporary load:

```bash
pi -e ./pi-superpowers-package
```

Install through this dotfiles repo with chezmoi:

```bash
chezmoi apply ~/.pi/agent/settings.json ~/.pi/agent/skills
```

Or install directly into Pi settings:

```bash
pi install ./pi-superpowers-package
```

After loading, start a new Pi session or run `/reload`. A coding request such as `Let's make a react todo list` should cause the agent to load and use the `brainstorming` skill before writing code.
