# pi-claude-bridge

Pi package that launches Claude Code with a selected Claude skill in tmux.

## Commands

```text
/claude-skill
```

Shows an auto-refreshing fuzzy picker of up to 10 discovered Claude skills. Type to filter by skill name or description. After selection, it prompts for optional arguments, then opens Claude in tmux with:

```text
/skill:<skill-name> <args>
```

Direct invocation is also supported:

```text
/claude-skill systematic-debugging investigate the pipx failure
```

## Tmux behavior

- Inside tmux: opens a horizontal split pane in the current working directory.
- Outside tmux: creates a detached tmux session named `claude-<skill>`.

## Skill discovery

Searches:

- `.claude/skills`
- `.agents/skills`
- `~/.claude/skills`
- `~/.agents/skills`

## Requirements

- `claude` CLI in `PATH`
- `tmux` in `PATH`

## Install

```bash
pi install ./pi-claude-bridge
```
