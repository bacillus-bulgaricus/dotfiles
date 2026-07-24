# Source Harness Mapping

Use this reference to identify source harness conventions and map them to Pi resources.

## Detection signals

| Signal | Likely source | Notes |
|---|---|---|
| `SKILL.md` with YAML frontmatter | Agent Skills / Claude / Codex | Often directly loadable by Pi. |
| `.claude/`, `CLAUDE.md`, `.claude/settings.json`, `.claude/commands/`, `.claude/hooks/` | Claude Code | Commands may be prompt-like; hooks need extensions. |
| `.codex/`, `AGENTS.md`, Codex config files | OpenAI Codex | Instructions are often portable as skills/context. |
| `.cursor/rules`, `.cursorrules` | Cursor | Port rules to a skill or project context; command behavior needs extension. |
| `.windsurf/rules`, `windsurf` config | Windsurf | Port rules to a skill or context. |
| `gemini.md`, `.gemini/` | Gemini CLI or Gemini-oriented harness | Port instructions to skill/context; tool behavior to extension. |
| `package.json` with plugin metadata | JavaScript plugin package | Inspect scripts and entrypoints; likely extension/package. |
| MCP server manifest or `@modelcontextprotocol/*` dependencies | MCP tool server | Usually wrap with Pi extension tools or document as external CLI dependency. |
| `commands/*.md` | Slash command prompts | Static prompts can become Pi prompt templates or skills. |
| Shell/Python scripts in hooks directories | Runtime side effects | Never run unreviewed; port to guarded extension events. |

## Claude Code mappings

| Claude feature | Pi mapping |
|---|---|
| `CLAUDE.md` project instructions | Project context file or Pi skill reference. |
| `.claude/skills/<name>/SKILL.md` | Direct Pi skill path or copied Pi skill. |
| `.claude/commands/*.md` | Prompt template, Pi skill, or extension command. |
| Command arguments in markdown | Prompt template variables or `/skill:name args`. |
| Hooks in `.claude/settings.json` | Pi extension events. |
| `PreToolUse` hook | `pi.on("tool_call", ...)`; can block or mutate input. |
| `PostToolUse` hook | `pi.on("tool_result", ...)`; can patch result. |
| `UserPromptSubmit` hook | `pi.on("input", ...)` or `before_agent_start`. |
| `Stop` / `SubagentStop` hook | `agent_end`, `turn_end`, or `session_shutdown` depending on semantics. |
| Notification hook | `ctx.ui.notify()`, status/widgets, or external integration in extension. |
| Permission prompts | `ctx.ui.confirm()` inside `tool_call` or command handler. |

When porting Claude hooks, keep the original matching rules explicit. Claude hook matchers are often tool-name or command-pattern based; Pi event handlers should check `event.toolName`, `event.input`, and `ctx.cwd` directly.

## OpenAI Codex mappings

| Codex feature | Pi mapping |
|---|---|
| `AGENTS.md` instructions | Project context or Pi skill. |
| `.codex` prompts/config | Pi prompt template, skill, or settings. |
| Model/tool policy instructions | Pi skill instructions or extension that adjusts active tools. |
| External scripts | Pi skill scripts if invoked manually; extension tools if model-callable. |

Codex artifacts are commonly instruction-heavy. Avoid turning them into extensions unless they need runtime hooks, tools, UI, or state.

## Cursor/Windsurf/Gemini rules mappings

| Source feature | Pi mapping |
|---|---|
| Always-on coding rules | Project context or skill with clear trigger. |
| File-glob scoped rules | Skill instructions with scope notes; extension `before_agent_start` only if automatic dynamic injection is required. |
| Command snippets | Prompt template or skill. |
| Tool integrations | Extension tools or documented external CLI usage. |

## MCP mappings

MCP servers expose tools/resources/prompts over a protocol. Pi extensions can often provide a better native integration.

| MCP concept | Pi mapping |
|---|---|
| Tool | `pi.registerTool()`. |
| Prompt | Prompt template or skill. |
| Resource | Tool that reads/fetches resource, or skill reference. |
| Server config/env | Extension settings, README, or package docs. |

Port MCP carefully:

- Do not auto-start a server unless the user approved the dependency and command.
- If wrapping a CLI/API, truncate output and pass cancellation signals.
- Preserve environment variable requirements and authentication setup.

## Package-level decisions

Choose a Pi package if the source repo contains more than one reusable Pi resource or if the user wants installable distribution.

Minimum package manifest:

```json
{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

If there is only one skill, a package is optional. Direct skill loading is simpler.
