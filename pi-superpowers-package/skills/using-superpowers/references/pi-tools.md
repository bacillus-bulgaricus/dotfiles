# Pi Tool Mapping

Superpowers skills were originally written for Claude Code and other harnesses. In Pi, use these equivalents when a skill mentions platform-specific tools.

| Skill references | Pi equivalent |
|---|---|
| `Skill` tool / `skill` tool / `activate_skill` | Use Pi's `read` tool to load the relevant `SKILL.md` from the skill location shown in the `available_skills` list. If the user invoked `/skill:name`, the skill content is already loaded; follow it. |
| `Read` | `read` |
| `Write` | `write` |
| `Edit` / `MultiEdit` | `edit` |
| `Bash` | `bash` |
| `Grep`, `Glob`, `LS` | Prefer Pi's built-in search/list tools when available; otherwise use `bash` with `rg`, `find`, or `ls`. |
| `TodoWrite` / `update_plan` | Pi may not have a dedicated todo tool. Maintain a concise checklist in your response or in a project task file if the user asks for persistent tracking. Do not claim you used a TodoWrite tool unless one is available. |
| `Task` tool / spawned subagent | Pi may not have native subagents unless a subagent extension is installed. If no subagent tool is available, either do the work in the current session using the same prompt template, use `executing-plans` instead of `subagent-driven-development`, or ask the user before using an external agent process. |
| `WebFetch` / `WebSearch` | Use available Pi/web tools if present; otherwise ask before using external network commands. |

## Pi skill invocation rule

Before acting, check the `available_skills` list in the system prompt. If a Superpowers skill might apply, load it with `read` and then follow it.

Example:

```json
{"path":"/path/to/skills/systematic-debugging/SKILL.md"}
```

Announce the skill you are using in normal text, then follow the skill exactly, adapting only the tool names above.

## Subagent fallback

Some Superpowers workflows recommend subagents for isolation and review. If Pi does not expose a subagent tool in the current session:

1. Tell the user that subagent support is unavailable in this Pi session.
2. Use the non-subagent fallback skill when one exists, especially `executing-plans`.
3. For reviewer/implementer prompt templates, run the review or implementation yourself in the current session, clearly separating roles and preserving the intended checklist.
4. Do not invent parallel execution. Keep dependent tasks sequential.
