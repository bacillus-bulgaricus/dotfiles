# Pi Target Patterns

Use these patterns when implementing ports.

## Skill pattern

Use for instruction-heavy behavior.

```text
skills/my-skill/
├── SKILL.md
├── references/
└── scripts/
```

Frontmatter:

```markdown
---
name: my-skill
description: Specific description of what this skill does and when to use it.
---
```

Guidelines:

- Keep core workflow in `SKILL.md`.
- Put long API docs, matrices, examples, and policy details in `references/`.
- Put deterministic helper code in `scripts/`.
- Use relative links.
- Include setup commands only when necessary.
- Say explicitly when the agent must ask before running scripts.

## Prompt template pattern

Use for static slash-command-like prompts that expand into a single request.

Good candidates:

- `/review-security`
- `/summarize-pr`
- `/write-tests`

Do not use a prompt template if the command needs state, UI, dynamic filesystem inspection, or custom tool behavior; use an extension command instead.

## Extension command pattern

Use for runtime commands that are invoked by the user.

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("my-command", {
    description: "Describe what this command does",
    handler: async (args, ctx) => {
      if (ctx.hasUI) ctx.ui.notify(`Running with ${args}`, "info");
      // Do runtime work here.
    },
  });
}
```

## Extension tool pattern

Use for model-callable tools.

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "my_tool",
    label: "My Tool",
    description: "Precise description for the model",
    promptSnippet: "One-line prompt entry if this tool should appear in Available tools",
    promptGuidelines: [
      "Use my_tool when the user asks for the specific capability it provides."
    ],
    parameters: Type.Object({
      action: StringEnum(["inspect", "apply"] as const),
      path: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      if (signal?.aborted) return { content: [{ type: "text", text: "Cancelled" }] };
      onUpdate?.({ content: [{ type: "text", text: "Working..." }] });
      return {
        content: [{ type: "text", text: `Action: ${params.action}` }],
        details: { params },
      };
    },
  });
}
```

## File-mutating tool pattern

Use `withFileMutationQueue()` for custom tools that write files.

```typescript
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function mutateFile(ctx, pathArg: string, update: (text: string) => string) {
  const absolutePath = resolve(ctx.cwd, pathArg.replace(/^@/, ""));
  return withFileMutationQueue(absolutePath, async () => {
    await mkdir(dirname(absolutePath), { recursive: true });
    const current = await readFile(absolutePath, "utf8").catch(() => "");
    const next = update(current);
    await writeFile(absolutePath, next, "utf8");
  });
}
```

## Hook/event mapping pattern

| Desired behavior | Pi event |
|---|---|
| Rewrite raw user input | `input` with `{ action: "transform" }` |
| Handle a slash-like command | `registerCommand()` |
| Inject extra context before model call | `before_agent_start` |
| Edit message context before provider request | `context` |
| Inspect provider payload | `before_provider_request` |
| Block or modify a tool call | `tool_call` |
| Modify tool result | `tool_result` |
| React to model change | `model_select` |
| React to session start/reload | `session_start` |
| Clean up resources | `session_shutdown` |

Example permission gate:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;
    if (!/\brm\s+-rf\b/.test(event.input.command)) return;

    if (!ctx.hasUI) {
      return { block: true, reason: "Blocked destructive command in non-interactive mode" };
    }

    const ok = await ctx.ui.confirm("Dangerous command", event.input.command);
    if (!ok) return { block: true, reason: "User declined" };
  });
}
```

## State pattern

For branch-aware state, reconstruct from tool results on `session_start` and store snapshots in `details`.

```typescript
let items: string[] = [];

pi.on("session_start", (_event, ctx) => {
  items = [];
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "message" && entry.message.role === "toolResult") {
      if (entry.message.toolName === "my_tool") {
        items = entry.message.details?.items ?? items;
      }
    }
  }
});
```

Use `pi.appendEntry()` for state that should persist but should not be sent to the model.

## Package pattern

```text
my-pi-package/
├── package.json
├── extensions/
│   └── index.ts
├── skills/
│   └── my-skill/
│       └── SKILL.md
├── prompts/
└── themes/
```

`package.json`:

```json
{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-ai": "*",
    "@earendil-works/pi-tui": "*",
    "typebox": "*"
  },
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```
